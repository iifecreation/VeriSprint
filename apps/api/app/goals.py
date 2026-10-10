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
from app.investment import compute_investment_profile
from app.metrics import compute_efficiency_metrics


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


def _efficiency_metric(attr: str):
    """Build a goal metric computer that reads one field off
    compute_efficiency_metrics (app/metrics.py) — shares the exact same
    computation the Git Efficiency Metrics panel shows, so a goal's
    `current_value` can never drift from what the dashboard displays."""

    async def _compute(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
        repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
        if not repo_ids:
            return None
        metrics = await compute_efficiency_metrics(db, repo_ids, start, end)
        return getattr(metrics, attr)

    return _compute


def _investment_category_pct(category: str):
    """Build a goal metric computer for one Investment Profile category's
    share of categorized code-change volume — shares the exact same
    classification compute_investment_profile (app/investment.py) uses for
    the /allocation/profile panel."""

    async def _compute(db: AsyncSession, workspace_id: UUID, repo_id: UUID | None, start: datetime, end: datetime) -> float | None:
        repo_ids = await _resolve_repo_ids(db, workspace_id, repo_id)
        if not repo_ids:
            return None
        profile = await compute_investment_profile(db, repo_ids, start, end)
        return profile.pct_of_categorized(category)

    return _compute


GOAL_METRIC_COMPUTERS = {
    "avg_confidence_score": _avg_confidence_score,
    "reconciliation_accuracy_pct": _reconciliation_accuracy_pct,
    "deployment_frequency_per_day": _deployment_frequency_per_day,
    "merged_pr_count": _merged_pr_count,
    # Phase 3 Git Efficiency Metrics — see app/metrics.py for how each is computed.
    "pr_size_lines": _efficiency_metric("pr_size_lines"),
    "cycle_time_hours": _efficiency_metric("cycle_time_hours"),
    "pr_pickup_time_hours": _efficiency_metric("pr_pickup_time_hours"),
    "pr_review_time_hours": _efficiency_metric("pr_review_time_hours"),
    "rework_rate_pct": _efficiency_metric("rework_rate_pct"),
    "prs_merged_without_review_pct": _efficiency_metric("prs_merged_without_review_pct"),
    "change_failure_rate_pct": _efficiency_metric("change_failure_rate_pct"),
    "mttr_hours": _efficiency_metric("mttr_hours"),
    # Phase 3 Investment Profile — see app/investment.py.
    "new_value_pct": _investment_category_pct("new_value"),
    "feature_enhancements_pct": _investment_category_pct("feature_enhancements"),
    "developer_experience_pct": _investment_category_pct("developer_experience"),
    "keeping_the_lights_on_pct": _investment_category_pct("keeping_the_lights_on"),
}

# Whether a HIGHER current_value is progress toward target_value, a LOWER one
# is, or the goal is "target_seeking" (progress is being *close* to target,
# either side — e.g. Investment Profile categories, which can overshoot a
# target just as easily as undershoot it). Missing keys default to
# "higher_is_better" in compute_progress_pct below, matching this registry's
# original four metrics' long-standing behavior.
GOAL_METRIC_DIRECTIONS: dict[str, str] = {
    "avg_confidence_score": "higher_is_better",
    "reconciliation_accuracy_pct": "higher_is_better",
    "deployment_frequency_per_day": "higher_is_better",
    "merged_pr_count": "higher_is_better",
    "pr_size_lines": "lower_is_better",
    "cycle_time_hours": "lower_is_better",
    "pr_pickup_time_hours": "lower_is_better",
    "pr_review_time_hours": "lower_is_better",
    "rework_rate_pct": "lower_is_better",
    "prs_merged_without_review_pct": "lower_is_better",
    "change_failure_rate_pct": "lower_is_better",
    "mttr_hours": "lower_is_better",
    "new_value_pct": "target_seeking",
    "feature_enhancements_pct": "target_seeking",
    "developer_experience_pct": "target_seeking",
    "keeping_the_lights_on_pct": "target_seeking",
}


def compute_progress_pct(metric_key: str, current_value: float | None, target_value: float) -> float | None:
    """
    Direction-aware progress, capped at 100 either way the goal is met or
    beaten:
      - higher_is_better: 100 * current / target (the original formula).
      - lower_is_better: 100 when current <= target (goal met or beaten);
        otherwise 100 * target / current, which shrinks toward 0 as current
        grows past target rather than exceeding 100% for an unmet goal.
      - target_seeking: 100 minus the relative distance from target, in
        either direction, floored at 0.
    """
    if current_value is None or not target_value:
        return None
    direction = GOAL_METRIC_DIRECTIONS.get(metric_key, "higher_is_better")
    if direction == "lower_is_better":
        if current_value <= 0:
            return 100.0
        return round(min(100.0, 100 * target_value / current_value) if current_value > target_value else 100.0, 1)
    if direction == "target_seeking":
        return round(max(0.0, 100 - 100 * abs(current_value - target_value) / target_value), 1)
    return round(100 * current_value / target_value, 1)


def is_goal_breaching(progress_pct: float | None, period_start: datetime, period_end: datetime, now: datetime) -> bool:
    """
    A goal "breaches" when it's genuinely behind, not merely imperfect: not
    yet met (progress < 100%) AND at least halfway through its own period.
    Deliberately simple and stated here rather than a pace-projection model —
    most of these metrics (e.g. Cycle Time) are point-in-time snapshots, not
    cumulative totals, so there's no honest "expected progress by now" curve
    to project against; "still short at the halfway mark" is a fact, not a
    guess. See app/workers/goal_alerts.py for how this gets alerted on.
    """
    if progress_pct is None or progress_pct >= 100:
        return False
    total_seconds = (period_end - period_start).total_seconds()
    if total_seconds <= 0:
        return False
    elapsed_fraction = min(max((now - period_start).total_seconds() / total_seconds, 0.0), 1.0)
    return elapsed_fraction >= 0.5
