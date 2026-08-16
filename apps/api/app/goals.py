"""
Team Goals & Targets (Phase 2 competitor-parity): a registry of metric keys a
goal can target, each backed by a real, already-computed number — a goal's
`current_value` is always read live from here, never a manually-updated
percentage a person could silently let go stale.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ConfidenceScore, PullRequest, ReconciliationFlag, Repo, Ticket


async def _avg_confidence_score(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
    repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
    if not repo_ids:
        return None
    result = await db.execute(
        select(func.avg(ConfidenceScore.score))
        .join(Ticket, Ticket.id == ConfidenceScore.ticket_id)
        .where(Ticket.repo_id.in_(repo_ids), ConfidenceScore.computed_at >= start, ConfidenceScore.computed_at <= end)
    )
    avg = result.scalar_one_or_none()
    return round(avg, 1) if avg is not None else None


async def _reconciliation_accuracy_pct(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
    repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
    if not repo_ids:
        return None
    total = await db.scalar(select(func.count()).select_from(Ticket).where(Ticket.repo_id.in_(repo_ids)))
    if not total:
        return None
    flagged = await db.scalar(
        select(func.count(func.distinct(ReconciliationFlag.ticket_id)))
        .select_from(ReconciliationFlag)
        .join(Ticket, Ticket.id == ReconciliationFlag.ticket_id)
        .where(Ticket.repo_id.in_(repo_ids), ReconciliationFlag.is_resolved.is_(False), ReconciliationFlag.created_at >= start, ReconciliationFlag.created_at <= end)
    )
    return round(100 * (total - (flagged or 0)) / total, 1)


async def _deployment_frequency_per_day(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
    repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
    if not repo_ids:
        return None
    count = await db.scalar(
        select(func.count()).select_from(PullRequest).where(
            PullRequest.repo_id.in_(repo_ids), PullRequest.state == "merged",
            PullRequest.merged_at >= start, PullRequest.merged_at <= end,
        )
    )
    days = max((end - start).total_seconds() / 86400, 1e-9)
    return round((count or 0) / days, 3)


async def _merged_pr_count(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
    repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
    if not repo_ids:
        return None
    count = await db.scalar(
        select(func.count()).select_from(PullRequest).where(
            PullRequest.repo_id.in_(repo_ids), PullRequest.state == "merged",
            PullRequest.merged_at >= start, PullRequest.merged_at <= end,
        )
    )
    return float(count or 0)


async def _resolve_repo_ids(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None) -> list[UUID]:
    if repo_id is not None:
        return [repo_id]
    result = await db.execute(select(Repo.id).where(Repo.workspace_id == workspace_id))
    return [r for (r,) in result.all()]


GOAL_METRIC_COMPUTERS = {
    "avg_confidence_score": _avg_confidence_score,
    "reconciliation_accuracy_pct": _reconciliation_accuracy_pct,
    "deployment_frequency_per_day": _deployment_frequency_per_day,
    "merged_pr_count": _merged_pr_count,
}
