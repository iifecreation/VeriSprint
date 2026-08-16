"""
Async Standup Replacement ROI / Time-Saved Calculator (spec Section 5.4):
quantifies meeting time actually avoided — real StandupUpdate rows, generated
per person per day, times the configured meeting length. `dollars_saved` is
null unless a hourly rate has been explicitly configured (Settings) — never
a guessed number.
"""
from collections import defaultdict
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import StandupUpdate
from app.db.session import get_db
from app.schemas import ROISummary
from app.workspace_settings import get_or_create_workspace_settings

router = APIRouter(prefix="/roi", tags=["roi"])


@router.get("", response_model=ROISummary)
async def get_roi_summary(
    repo_id: UUID, period_start: datetime, period_end: datetime, db: AsyncSession = Depends(get_db)
) -> ROISummary:
    result = await db.execute(
        select(StandupUpdate.date, StandupUpdate.author_github_login).where(
            StandupUpdate.repo_id == repo_id,
            StandupUpdate.date >= period_start,
            StandupUpdate.date <= period_end,
        )
    )
    by_day: dict[datetime, set[str]] = defaultdict(set)
    for day, author in result.all():
        by_day[day].add(author)

    ws = await get_or_create_workspace_settings(db)
    await db.commit()

    total_person_standups = sum(len(authors) for authors in by_day.values())
    people_covered = len({a for authors in by_day.values() for a in authors})
    hours_saved = round((total_person_standups * ws.avg_standup_minutes) / 60, 2)
    dollars_saved = round(hours_saved * ws.hourly_rate_usd, 2) if ws.hourly_rate_usd else None

    return ROISummary(
        period_start=period_start,
        period_end=period_end,
        team_report_days=len(by_day),
        people_covered=people_covered,
        avg_standup_minutes=ws.avg_standup_minutes,
        hours_saved=hours_saved,
        hourly_rate_usd=ws.hourly_rate_usd,
        dollars_saved=dollars_saved,
    )
