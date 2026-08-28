"""
DORA Panel (Phase 2 competitor-parity): the two of the four DORA metrics
VeriSprint can compute honestly from real data — Deployment Frequency and
Lead Time for Changes, both from real PullRequest/Commit timestamps. Change
Failure Rate and Mean Time to Restore need deployment/incident tracking
VeriSprint doesn't have — returned as null rather than guessed.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Commit, PullRequest, Repo
from app.db.session import get_db
from app.schemas import DORAMetrics
from app.billing_access import require_active_access

router = APIRouter(prefix="/dora", tags=["dora"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=DORAMetrics, dependencies=[Depends(require_feature_flag("dora_panel"))])
async def get_dora_metrics(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> DORAMetrics:
    merged_result = await db.execute(
        select(PullRequest).where(
            PullRequest.repo_id == repo.id,
            PullRequest.state == "merged",
            PullRequest.merged_at.is_not(None),
            PullRequest.merged_at >= period_start,
            PullRequest.merged_at <= period_end,
        )
    )
    merged_prs = list(merged_result.scalars().all())

    period_days = max((period_end - period_start).total_seconds() / 86400, 1e-9)
    deployment_frequency = len(merged_prs) / period_days

    lead_times_hours: list[float] = []
    for pr in merged_prs:
        first_commit_at = await db.scalar(
            select(func.min(Commit.committed_at)).where(Commit.pull_request_id == pr.id)
        )
        start = first_commit_at or pr.opened_at
        if start is not None and pr.merged_at is not None and pr.merged_at >= start:
            lead_times_hours.append((pr.merged_at - start).total_seconds() / 3600)

    avg_lead_time = round(sum(lead_times_hours) / len(lead_times_hours), 2) if lead_times_hours else None

    return DORAMetrics(
        period_start=period_start,
        period_end=period_end,
        deployed_pr_count=len(merged_prs),
        deployment_frequency_per_day=round(deployment_frequency, 3),
        lead_time_for_changes_hours=avg_lead_time,
    )
