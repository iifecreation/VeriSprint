"""Shared accessor for the single-row WorkspaceSettings table (branding, ROI inputs)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import WorkspaceSettings


async def get_or_create_workspace_settings(db: AsyncSession) -> WorkspaceSettings:
    result = await db.execute(select(WorkspaceSettings).limit(1))
    settings_row = result.scalar_one_or_none()
    if settings_row is None:
        settings_row = WorkspaceSettings()
        db.add(settings_row)
        await db.flush()
    return settings_row
