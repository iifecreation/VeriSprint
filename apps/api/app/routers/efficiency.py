"""
Git Efficiency & Quality Metrics panel (Phase 3 competitor-parity): PR Size,
Cycle Time broken into Coding/Pickup/Review/Deploy Time, Merge Frequency,
Review Depth, PRs Merged Without Review, Rework Rate, and Refactor Rate —
the leading-indicator layer DORA alone doesn't cover. See app/metrics.py for
how each is computed and app/benchmarks.py for the Elite/Good/Fair/Needs
Focus bands.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.benchmarks import classify
from app.billing_access import require_active_access
from app.db.models import Repo
from app.db.session import get_db
from app.metrics import compute_efficiency_metrics
from app.schemas import BenchmarkedValue, EfficiencyReport

router = APIRouter(prefix="/efficiency", tags=["efficiency"], dependencies=[Depends(require_active_access)])


def _bv(metric_key: str, value: float | None, unit: str = "") -> BenchmarkedValue:
    return BenchmarkedValue(value=value, band=classify(metric_key, value), unit=unit)


@router.get("", response_model=EfficiencyReport, dependencies=[Depends(require_feature_flag("git_efficiency_metrics"))])
async def get_efficiency_report(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> EfficiencyReport:
    m = await compute_efficiency_metrics(db, [repo.id], period_start, period_end)

    return EfficiencyReport(
        period_start=period_start,
        period_end=period_end,
        merged_pr_count=m.merged_pr_count,
        coding_time_hours=_bv("coding_time_hours", m.coding_time_hours, "hours"),
        pr_pickup_time_hours=_bv("pr_pickup_time_hours", m.pr_pickup_time_hours, "hours"),
        pr_review_time_hours=_bv("pr_review_time_hours", m.pr_review_time_hours, "hours"),
        deploy_time_hours=_bv("deploy_time_hours", m.deploy_time_hours, "hours"),
        cycle_time_hours=_bv("cycle_time_hours", m.cycle_time_hours, "hours"),
        merge_frequency_per_dev_per_week=_bv(
            "merge_frequency_per_dev_per_week", m.merge_frequency_per_dev_per_week, "PRs/dev/week"
        ),
        pr_size_lines=_bv("pr_size_lines", m.pr_size_lines, "lines"),
        review_depth_per_pr=m.review_depth_per_pr,
        prs_merged_without_review_pct=m.prs_merged_without_review_pct,
        rework_rate_pct=_bv("rework_rate_pct", m.rework_rate_pct, "%"),
        refactor_rate_pct=_bv("refactor_rate_pct", m.refactor_rate_pct, "%"),
        change_failure_rate_pct=_bv("change_failure_rate_pct", m.change_failure_rate_pct, "%"),
        mttr_hours=_bv("mttr_hours", m.mttr_hours, "hours"),
    )
