"""
Open Integration Framework scaffolding (Phase 2 competitor-parity): a
per-workspace registry for integrations beyond the first-class ones
(GitHub, Slack, Jira/Linear ticket sync). This is deliberately scaffolding,
not N new live third-party connections — it gives every future integration a
consistent connect/disconnect/status lifecycle and audit trail to build onto,
rather than each one reinventing its own config storage.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, require_feature_flag, require_role
from app.db.models import Integration, IntegrationStatus, User, UserRole
from app.db.session import get_db
from app.schemas import IntegrationConnectRequest, IntegrationOut

router = APIRouter(prefix="/integrations", tags=["integrations"], dependencies=[Depends(require_feature_flag("open_integration_framework"))])

# The set of providers the scaffolding currently recognizes — connecting one
# stores its config for a future job/router to actually act on; it does not
# perform a live OAuth handshake or verify credentials against the provider.
KNOWN_PROVIDERS = {"linear", "jira", "pagerduty", "datadog", "opsgenie"}

# Config keys that must never come back in a GET response once stored.
_SECRET_KEY_SUBSTRINGS = ("token", "secret", "key", "password")


def _redact(config: dict) -> dict:
    return {k: ("••••••" if any(s in k.lower() for s in _SECRET_KEY_SUBSTRINGS) else v) for k, v in config.items()}


def _to_out(integration: Integration) -> IntegrationOut:
    return IntegrationOut(
        id=integration.id, workspace_id=integration.workspace_id, provider=integration.provider,
        status=integration.status.value, connected_at=integration.connected_at, created_at=integration.created_at,
    )


@router.get("", response_model=list[IntegrationOut])
async def list_integrations(
    workspace_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> list[IntegrationOut]:
    ensure_workspace_access(user, workspace_id)
    result = await db.execute(select(Integration).where(Integration.workspace_id == workspace_id))
    return [_to_out(i) for i in result.scalars().all()]


@router.post("/connect", response_model=IntegrationOut)
async def connect_integration(
    payload: IntegrationConnectRequest,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> IntegrationOut:
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    if payload.provider not in KNOWN_PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Unknown provider: {payload.provider}. Known: {', '.join(sorted(KNOWN_PROVIDERS))}")

    result = await db.execute(
        select(Integration).where(Integration.workspace_id == admin.workspace_id, Integration.provider == payload.provider)
    )
    integration = result.scalar_one_or_none()
    before = {"status": integration.status.value} if integration else None
    if integration is None:
        integration = Integration(workspace_id=admin.workspace_id, provider=payload.provider)
        db.add(integration)
    integration.config_json = payload.config
    integration.status = IntegrationStatus.CONNECTED
    integration.connected_at = datetime.now(timezone.utc)
    await db.flush()

    await record_audit_for_user(
        db, user=admin, action="integration.connected", entity_type="integration", entity_id=str(integration.id),
        before=before, after={"provider": integration.provider, "status": integration.status.value, "config": _redact(payload.config)},
    )
    await db.commit()
    return _to_out(integration)


@router.post("/{integration_id}/disconnect", response_model=IntegrationOut)
async def disconnect_integration(
    integration_id: UUID, admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> IntegrationOut:
    integration = await db.get(Integration, integration_id)
    if integration is None:
        raise HTTPException(status_code=404, detail="Integration not found")
    ensure_workspace_access(admin, integration.workspace_id)

    before = {"status": integration.status.value}
    integration.status = IntegrationStatus.DISCONNECTED
    integration.config_json = {}
    await db.flush()
    await record_audit_for_user(
        db, user=admin, action="integration.disconnected", entity_type="integration", entity_id=str(integration.id),
        before=before, after={"status": integration.status.value},
    )
    await db.commit()
    return _to_out(integration)
