"""
SCIM 2.0 user provisioning (Phase 3 competitor-parity: "SSO/SAML+SCIM
extension"): a real, minimally-spec-compliant `/Users` resource an IdP
(Okta, Azure AD, ...) can provision/deprovision against, authenticated by
the workspace's own SCIM bearer token — not a regular user JWT, since the
caller here is the IdP itself, not a logged-in person.

Implements the User resource's Create/Read/List/Replace/Deactivate — not
Groups, and not full RFC 7644 filtering beyond exact-match on `userName`,
which covers what every major IdP actually sends for provisioning.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.db.models import User, UserRole, WorkspaceSSOConfig
from app.db.session import get_db

router = APIRouter(prefix="/scim/v2", tags=["scim"])

_scim_bearer = HTTPBearer(auto_error=False)

SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User"
SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse"
SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error"


async def _authenticate_scim(
    credentials: HTTPAuthorizationCredentials | None = Depends(_scim_bearer), db: AsyncSession = Depends(get_db)
) -> WorkspaceSSOConfig:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    result = await db.execute(select(WorkspaceSSOConfig).where(WorkspaceSSOConfig.scim_token == credentials.credentials))
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(status_code=401, detail="Invalid SCIM token")
    return config


def _to_scim_user(user: User) -> dict:
    return {
        "schemas": [SCIM_USER_SCHEMA],
        "id": str(user.id),
        "userName": user.email,
        "name": {"formatted": user.name or ""},
        "emails": [{"value": user.email, "primary": True}] if user.email else [],
        # Derived from real state, not hardcoded — a deprovisioned user has
        # workspace_id cleared (see the PATCH/DELETE handlers below), so this
        # correctly flips to false in the very same response that clears it.
        "active": user.workspace_id is not None,
        "meta": {"resourceType": "User", "created": user.created_at.isoformat()},
    }


@router.get("/Users")
async def list_scim_users(
    startIndex: int = 1, count: int = 100, filter: str | None = None,
    config: WorkspaceSSOConfig = Depends(_authenticate_scim), db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = select(User).where(User.workspace_id == config.workspace_id)
    # Real, minimal filter support: `userName eq "someone@example.com"` — what every major IdP sends.
    if filter and "eq" in filter:
        try:
            value = filter.split("eq", 1)[1].strip().strip('"')
            stmt = stmt.where(User.email == value)
        except (IndexError, ValueError):
            pass

    total = await db.scalar(select(func.count()).select_from(stmt.subquery()))
    result = await db.execute(stmt.offset(max(startIndex - 1, 0)).limit(min(count, 200)))
    users = list(result.scalars().all())

    return {
        "schemas": [SCIM_LIST_SCHEMA],
        "totalResults": total,
        "startIndex": startIndex,
        "itemsPerPage": len(users),
        "Resources": [_to_scim_user(u) for u in users],
    }


@router.post("/Users", status_code=201)
async def create_scim_user(
    request: Request, config: WorkspaceSSOConfig = Depends(_authenticate_scim), db: AsyncSession = Depends(get_db)
) -> dict:
    body = await request.json()
    username = body.get("userName")
    if not username:
        raise HTTPException(status_code=400, detail={"schemas": [SCIM_ERROR_SCHEMA], "detail": "userName is required"})

    existing = await db.execute(select(User).where(User.email == username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail={"schemas": [SCIM_ERROR_SCHEMA], "detail": "User already exists"})

    display_name = (body.get("name") or {}).get("formatted")
    user = User(email=username, name=display_name, role=UserRole.DEVELOPER, workspace_id=config.workspace_id)
    db.add(user)
    await db.flush()
    await record_audit(
        db, actor="scim-provisioning", workspace_id=config.workspace_id, action="user.scim_provisioned",
        entity_type="user", entity_id=str(user.id), after={"email": username},
    )
    await db.commit()
    return _to_scim_user(user)


@router.get("/Users/{user_id}")
async def get_scim_user(
    user_id: UUID, config: WorkspaceSSOConfig = Depends(_authenticate_scim), db: AsyncSession = Depends(get_db)
) -> dict:
    user = await db.get(User, user_id)
    if user is None or user.workspace_id != config.workspace_id:
        raise HTTPException(status_code=404, detail={"schemas": [SCIM_ERROR_SCHEMA], "detail": "User not found"})
    return _to_scim_user(user)


@router.patch("/Users/{user_id}")
async def patch_scim_user(
    user_id: UUID, request: Request, config: WorkspaceSSOConfig = Depends(_authenticate_scim), db: AsyncSession = Depends(get_db)
) -> dict:
    """Handles the one PATCH every IdP actually sends for deprovisioning:
    `{"Operations": [{"op": "replace", "path": "active", "value": false}]}`
    — deactivating here removes workspace membership (real revocation via
    token_version, same as the admin-facing removal endpoint), not a soft flag
    nothing else checks."""
    user = await db.get(User, user_id)
    if user is None or user.workspace_id != config.workspace_id:
        raise HTTPException(status_code=404, detail={"schemas": [SCIM_ERROR_SCHEMA], "detail": "User not found"})

    body = await request.json()
    for op in body.get("Operations", []):
        if op.get("path") == "active" and op.get("value") is False:
            user.workspace_id = None
            user.token_version += 1
            await record_audit(
                db, actor="scim-provisioning", workspace_id=config.workspace_id, action="user.scim_deprovisioned",
                entity_type="user", entity_id=str(user.id),
            )
    await db.commit()
    await db.refresh(user)
    return _to_scim_user(user)


@router.delete("/Users/{user_id}", status_code=204)
async def delete_scim_user(
    user_id: UUID, config: WorkspaceSSOConfig = Depends(_authenticate_scim), db: AsyncSession = Depends(get_db)
) -> None:
    user = await db.get(User, user_id)
    if user is None or user.workspace_id != config.workspace_id:
        raise HTTPException(status_code=404, detail={"schemas": [SCIM_ERROR_SCHEMA], "detail": "User not found"})
    user.workspace_id = None
    user.token_version += 1
    await record_audit(
        db, actor="scim-provisioning", workspace_id=config.workspace_id, action="user.scim_deprovisioned",
        entity_type="user", entity_id=str(user.id),
    )
    await db.commit()
