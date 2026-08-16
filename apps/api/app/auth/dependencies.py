"""
FastAPI-facing auth wiring: `get_current_user` decodes+validates the bearer
access token and loads the real `User` row; `require_role` and
`require_workspace_access` build on top of it for RBAC (spec Section 6).

Task #23 retrofits these onto every existing router. Until then, routers that
don't yet depend on `get_current_user` are unauthenticated by construction —
tracked in each of their docstrings.
"""
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import TokenError, decode_token
from app.db.models import Repo, User, UserRole, Workspace, WorkspaceStatus
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        claims = decode_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    try:
        user_id = UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token subject") from exc

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")

    # token_version mismatch means this access token was issued before a
    # password change / role change / forced logout — reject it even though
    # its signature and expiry are still valid.
    if claims.get("tv") != user.token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    if user.workspace_id is not None:
        workspace = await db.get(Workspace, user.workspace_id)
        if workspace is not None and workspace.status != WorkspaceStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Workspace is {workspace.status.value}")

    return user


def require_role(*allowed: UserRole):
    """Dependency factory: 403s unless the current user's role is one of `allowed`.
    SUPER_ADMIN always passes, since it's the operator role that must reach
    every workspace-scoped endpoint too."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role == UserRole.SUPER_ADMIN or user.role in allowed:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of: {', '.join(r.value for r in allowed)}",
        )

    return _check


async def get_internal_user(user: User = Depends(get_current_user)) -> User:
    """Gate for every internal (non-public) router — CLIENT is a read-only
    Client Portal role (spec Section 6: "no dashboards, no raw code") and must
    never reach these endpoints, even ones scoped to their own workspace."""
    if user.role == UserRole.CLIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client accounts can't access this")
    return user


def ensure_workspace_access(user: User, workspace_id: UUID) -> None:
    """Raise 403 unless `user` may act within `workspace_id`. SUPER_ADMIN bypasses
    this (operator dashboard reaches across all workspaces); every other role
    must have that exact workspace_id embedded on their own User row."""
    if user.role == UserRole.SUPER_ADMIN:
        return
    if user.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this workspace")


async def get_repo_for_user(
    repo_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Repo:
    """Resolve `repo_id` (path or query param — FastAPI matches either the same
    way) to a `Repo`, 404ing if it doesn't exist and 403ing if it belongs to a
    workspace the caller isn't a member of. Use as `repo: Repo =
    Depends(get_repo_for_user)` on any endpoint that takes a bare `repo_id`."""
    repo = await db.get(Repo, repo_id)
    if repo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repo not found")
    ensure_workspace_access(user, repo.workspace_id)
    return repo


async def get_workspace_for_user(
    workspace_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Workspace:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    ensure_workspace_access(user, workspace.id)
    return workspace


def require_feature_flag(key: str):
    """Dependency factory: 403s unless `key` is enabled for the caller's own
    workspace (spec Section 7's FeatureFlag gating — used to roll out Phase
    2/3 features per-plan-tier or per-workspace allowlist)."""

    async def _check(user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> User:
        from app.feature_flags import is_feature_enabled_for_user  # local import avoids a circular module load

        if not await is_feature_enabled_for_user(db, key=key, user=user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"'{key}' isn't enabled for your workspace")
        return user

    return _check


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Same as `get_current_user` but returns None instead of 401ing — for
    endpoints (e.g. the marketing site's feature-flag probe) that behave
    correctly either way."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
