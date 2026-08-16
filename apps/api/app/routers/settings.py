"""Workspace settings — white-label branding for the Client Portal, and the inputs the ROI calculator uses."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.db.session import get_db
from app.schemas import WorkspaceSettingsOut, WorkspaceSettingsUpdate
from app.workspace_settings import get_or_create_workspace_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=WorkspaceSettingsOut)
async def get_settings_endpoint(db: AsyncSession = Depends(get_db)):
    ws = await get_or_create_workspace_settings(db)
    await db.commit()
    return ws


@router.put("", response_model=WorkspaceSettingsOut)
async def update_settings_endpoint(payload: WorkspaceSettingsUpdate, db: AsyncSession = Depends(get_db)):
    ws = await get_or_create_workspace_settings(db)
    before = {
        "name": ws.name,
        "logo_url": ws.logo_url,
        "primary_color_hex": ws.primary_color_hex,
        "avg_standup_minutes": ws.avg_standup_minutes,
        "hourly_rate_usd": ws.hourly_rate_usd,
    }
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(ws, field, value)
    await db.flush()
    await record_audit(
        db, actor="user", action="workspace_settings.updated", entity_type="workspace_settings",
        entity_id=str(ws.id), before=before, after=updates,
    )
    await db.commit()
    await db.refresh(ws)
    return ws
