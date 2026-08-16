"""Per-workspace SSO configuration (Phase 3 competitor-parity) — WORKSPACE_ADMIN-only, secrets never returned once stored."""
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import require_feature_flag, require_role
from app.db.models import User, UserRole, WorkspaceSSOConfig
from app.db.session import get_db
from app.schemas import WorkspaceSSOConfigOut, WorkspaceSSOConfigUpsert

router = APIRouter(prefix="/sso-config", tags=["sso-config"], dependencies=[Depends(require_feature_flag("workspace_sso"))])


def _to_out(config: WorkspaceSSOConfig) -> WorkspaceSSOConfigOut:
    return WorkspaceSSOConfigOut(
        id=config.id, workspace_id=config.workspace_id, issuer=config.issuer, client_id=config.client_id,
        enabled=config.enabled, has_scim_token=config.scim_token is not None, created_at=config.created_at,
    )


@router.get("", response_model=WorkspaceSSOConfigOut | None)
async def get_sso_config(
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> WorkspaceSSOConfigOut | None:
    if admin.workspace_id is None:
        return None
    result = await db.execute(select(WorkspaceSSOConfig).where(WorkspaceSSOConfig.workspace_id == admin.workspace_id))
    config = result.scalar_one_or_none()
    return _to_out(config) if config else None


@router.put("", response_model=WorkspaceSSOConfigOut)
async def upsert_sso_config(
    payload: WorkspaceSSOConfigUpsert,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceSSOConfigOut:
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    result = await db.execute(select(WorkspaceSSOConfig).where(WorkspaceSSOConfig.workspace_id == admin.workspace_id))
    config = result.scalar_one_or_none()
    before = {"issuer": config.issuer, "enabled": config.enabled} if config else None
    if config is None:
        config = WorkspaceSSOConfig(workspace_id=admin.workspace_id, issuer=payload.issuer, client_id=payload.client_id, client_secret=payload.client_secret, enabled=payload.enabled)
        db.add(config)
    else:
        config.issuer = payload.issuer
        config.client_id = payload.client_id
        config.client_secret = payload.client_secret
        config.enabled = payload.enabled
    await db.flush()
    await record_audit_for_user(
        db, user=admin, action="sso_config.upserted", entity_type="workspace_sso_config", entity_id=str(config.id),
        before=before, after={"issuer": config.issuer, "enabled": config.enabled},
    )
    await db.commit()
    await db.refresh(config)
    return _to_out(config)


@router.post("/rotate-scim-token")
async def rotate_scim_token(
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> dict:
    """Returns the new token in the response body exactly once — it's never
    readable again after this, only rotatable (same discipline as an API key)."""
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    result = await db.execute(select(WorkspaceSSOConfig).where(WorkspaceSSOConfig.workspace_id == admin.workspace_id))
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=404, detail="Configure SSO before generating a SCIM token")

    new_token = secrets.token_urlsafe(32)
    config.scim_token = new_token
    await record_audit_for_user(db, user=admin, action="sso_config.scim_token_rotated", entity_type="workspace_sso_config", entity_id=str(config.id))
    await db.commit()
    return {"scim_token": new_token}
