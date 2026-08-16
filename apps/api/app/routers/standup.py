"""Auto-drafted standup updates (Step 6) — one person, one day, built from real commits."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StandupUpdate
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import StandupUpdateOut

router = APIRouter(prefix="/standup", tags=["standup"])


@router.get("", response_model=list[StandupUpdateOut])
async def list_standups(
    repo_id: UUID, day: date, db: AsyncSession = Depends(get_db)
) -> list[StandupUpdate]:
    result = await db.execute(
        select(StandupUpdate).where(
            StandupUpdate.repo_id == repo_id,
            StandupUpdate.date == day,
        )
    )
    return list(result.scalars().all())


@router.post("/generate")
async def generate_standup(
    repo_id: UUID, author_github_login: str, day: date
) -> dict:
    """Kick off the standup generator worker for one person/one day (idempotent)."""
    await enqueue("generate_standup", str(repo_id), author_github_login, day.isoformat())
    return {"queued": True}
