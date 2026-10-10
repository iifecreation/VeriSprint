"""
DORA Panel (Phase 2 competitor-parity, extended in Phase 3): Deployment
Frequency and Lead Time for Changes come from real PullRequest/Commit
timestamps; Change Failure Rate and Mean Time to Restore come from real
Deployment rows (app/metrics.py) once this workspace's repos send GitHub
`deployment_status` events — both stay null, never guessed, until then.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Repo
from app.db.session import get_db
from app.metrics import compute_efficiency_metrics
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
    m = await compute_efficiency_metrics(db, [repo.id], period_start, period_end)
    period_days = max((period_end - period_start).total_seconds() / 86400, 1e-9)

    return DORAMetrics(
        period_start=period_start,
        period_end=period_end,
        deployed_pr_count=m.merged_pr_count,
        deployment_frequency_per_day=round(m.merged_pr_count / period_days, 3),
        lead_time_for_changes_hours=m.cycle_time_hours,
        change_failure_rate=m.change_failure_rate_pct,
        mean_time_to_restore_hours=m.mttr_hours,
        unavailable_metrics_note=None if m.change_failure_rate_pct is not None else (
            "Change Failure Rate and Mean Time to Restore require this workspace's repos to use the "
            "GitHub Deployments API — no deployment_status events received yet, so these are null "
            "rather than guessed."
        ),
    )
