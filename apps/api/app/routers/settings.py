"""Workspace settings — white-label branding for the Client Portal, and the inputs the ROI calculator uses."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import get_workspace_for_user, require_role
from app.db.models import User, UserRole, Workspace
from app.db.session import get_db
from app.schemas import WorkspaceSettingsOut, WorkspaceSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=WorkspaceSettingsOut)
async def get_settings_endpoint(workspace: Workspace = Depends(get_workspace_for_user)):
    return workspace


@router.put("", response_model=WorkspaceSettingsOut)
async def update_settings_endpoint(
    payload: WorkspaceSettingsUpdate,
    workspace: Workspace = Depends(get_workspace_for_user),
    user: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    before = {
        "name": workspace.name,
        "logo_url": workspace.logo_url,
        "primary_color_hex": workspace.primary_color_hex,
        "avg_standup_minutes": workspace.avg_standup_minutes,
        "hourly_rate_usd": workspace.hourly_rate_usd,
    }
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(workspace, field, value)
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="workspace.settings_updated", entity_type="workspace",
        entity_id=str(workspace.id), before=before, after=updates,
    )
    await db.commit()
    await db.refresh(workspace)
    return workspace
