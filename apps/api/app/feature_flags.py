"""
Feature-flag gating (spec Section 7): the actual enforcement behind
FeatureFlag rows created via the Super-Admin Dashboard (`app/routers/admin.py`)
— a flag existing in the table means nothing on its own until something calls
`is_feature_enabled`. Fails closed: an unknown key, no workspace, or no
matching rule all resolve to disabled, never "on by default."
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import FeatureFlag, User, UserRole, Workspace, WorkspacePlanTier

# Ordered least -> most capable. A flag's `min_plan_tier` gate is satisfied by
# this workspace's tier or anything after it in this list.
_PLAN_TIER_RANK: dict[WorkspacePlanTier, int] = {
    WorkspacePlanTier.FREE: 0,
    WorkspacePlanTier.TEAM: 1,
    WorkspacePlanTier.GROWTH: 2,
    WorkspacePlanTier.AGENCY: 3,
    WorkspacePlanTier.ENTERPRISE: 4,
}


async def is_feature_enabled(db: AsyncSession, *, key: str, workspace: Workspace | None) -> bool:
    result = await db.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag = result.scalar_one_or_none()
    if flag is None:
        return False  # an unregistered flag is off, not an error — callers shouldn't need to special-case this
    if flag.enabled_globally:
        return True
    if workspace is None:
        return False
    if str(workspace.id) in flag.enabled_workspace_ids:
        return True
    if flag.min_plan_tier is not None and _PLAN_TIER_RANK[workspace.plan_tier] >= _PLAN_TIER_RANK[flag.min_plan_tier]:
        return True
    return False


async def is_feature_enabled_for_user(db: AsyncSession, *, key: str, user: User) -> bool:
    """Convenience wrapper for the common case of gating a router by the
    caller's own workspace. SUPER_ADMIN always passes — the operator role
    needs to see every feature's UI/data regardless of any workspace's plan."""
    if user.role == UserRole.SUPER_ADMIN:
        return True
    if user.workspace_id is None:
        return False
    workspace = await db.get(Workspace, user.workspace_id)
    return await is_feature_enabled(db, key=key, workspace=workspace)
