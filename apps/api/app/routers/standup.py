"""Auto-drafted standup updates (Step 6) — one person, one day, built from real commits."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user
from app.db.models import Repo, StandupUpdate
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import StandupUpdateOut
from app.billing_access import require_active_access

router = APIRouter(prefix="/standup", tags=["standup"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=list[StandupUpdateOut])
async def list_standups(
    day: date, repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)
) -> list[StandupUpdate]:
    result = await db.execute(
        select(StandupUpdate).where(
            StandupUpdate.repo_id == repo.id,
            StandupUpdate.date == day,
        )
    )
    return list(result.scalars().all())


@router.post("/generate")
async def generate_standup(author_github_login: str, day: date, repo: Repo = Depends(get_repo_for_user)) -> dict:
    """Kick off the standup generator worker for one person/one day (idempotent)."""
    await enqueue("generate_standup", str(repo.id), author_github_login, day.isoformat())
    return {"queued": True}
