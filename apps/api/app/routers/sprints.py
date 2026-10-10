"""
Sprints + Confidence-Weighted Burndown (spec Section 5.7): a burndown built
from real ConfidenceScore.computed_at history rather than self-reported
percentages. No point is ever synthesized — the chart only covers days that
have actually happened, and every value is a real sum over real scores.

Also hosts Planning & Capacity Accuracy (Phase 5 competitor-parity, gated
behind the `delivery_accuracy` FeatureFlag unlike the core sprint/burndown
endpoints above) — see app/delivery_risk.py.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user, require_feature_flag
from app.benchmarks import classify, classify_capacity_accuracy, classify_delivery_risk_quadrant
from app.db.models import ConfidenceScore, Repo, Sprint, Ticket, User
from app.db.session import get_db
from app.delivery_risk import compute_delivery_accuracy
from app.schemas import BenchmarkedValue, BurndownOut, BurndownPoint, DeliveryAccuracyReport, SprintCreate, SprintOut
from app.billing_access import require_active_access

router = APIRouter(prefix="/sprints", tags=["sprints"], dependencies=[Depends(require_active_access)])


async def _sprint_for_user(
    sprint_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Sprint:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    repo = await db.get(Repo, sprint.repo_id)
    if repo is not None:
        ensure_workspace_access(user, repo.workspace_id)
    return sprint


@router.get("", response_model=list[SprintOut])
async def list_sprints(repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)) -> list[Sprint]:
    result = await db.execute(select(Sprint).where(Sprint.repo_id == repo.id).order_by(Sprint.start_date.desc()))
    return list(result.scalars().all())


@router.post("", response_model=SprintOut)
async def create_sprint(
    payload: SprintCreate, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Sprint:
    repo = await db.get(Repo, payload.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    ensure_workspace_access(user, repo.workspace_id)

    sprint = Sprint(**payload.model_dump())
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint


@router.get("/{sprint_id}", response_model=SprintOut)
async def get_sprint(sprint: Sprint = Depends(_sprint_for_user)) -> Sprint:
    return sprint


@router.get("/{sprint_id}/burndown", response_model=BurndownOut)
async def get_burndown(sprint: Sprint = Depends(_sprint_for_user), db: AsyncSession = Depends(get_db)) -> BurndownOut:
    ticket_ids: list[UUID] = []
    for key in sprint.planned_ticket_keys:
        result = await db.execute(select(Ticket).where(Ticket.repo_id == sprint.repo_id, Ticket.key == key))
        ticket = result.scalar_one_or_none()
        if ticket is not None:
            ticket_ids.append(ticket.id)

    scores: list[ConfidenceScore] = []
    if ticket_ids:
        scores_result = await db.execute(
            select(ConfidenceScore).where(ConfidenceScore.ticket_id.in_(ticket_ids)).order_by(ConfidenceScore.computed_at)
        )
        scores = list(scores_result.scalars().all())

    # Only chart days that have actually happened — no synthetic future points.
    now = datetime.now(timezone.utc)
    sprint_end = sprint.end_date if sprint.end_date.tzinfo else sprint.end_date.replace(tzinfo=timezone.utc)
    sprint_start = sprint.start_date if sprint.start_date.tzinfo else sprint.start_date.replace(tzinfo=timezone.utc)
    end_cutoff = min(sprint_end, now)

    points: list[BurndownPoint] = []
    day = sprint_start
    while day <= end_cutoff:
        day_end = day + timedelta(days=1)
        latest_by_ticket: dict[UUID, ConfidenceScore] = {}
        for score in scores:
            computed_at = score.computed_at if score.computed_at.tzinfo else score.computed_at.replace(tzinfo=timezone.utc)
            if computed_at < day_end:
                latest_by_ticket[score.ticket_id] = score  # ascending order — last write wins

        weighted = sum(s.score / 100 for s in latest_by_ticket.values())
        fully_shipped = sum(1 for s in latest_by_ticket.values() if s.score >= 75)
        points.append(
            BurndownPoint(
                day=day,
                planned_tickets=len(ticket_ids),
                confidence_weighted_complete=round(weighted, 2),
                fully_shipped=fully_shipped,
            )
        )
        day += timedelta(days=1)

    return BurndownOut(sprint=SprintOut.model_validate(sprint), points=points)


@router.get(
    "/{sprint_id}/accuracy", response_model=DeliveryAccuracyReport,
    dependencies=[Depends(require_feature_flag("delivery_accuracy"))],
)
async def get_delivery_accuracy(
    sprint: Sprint = Depends(_sprint_for_user), db: AsyncSession = Depends(get_db)
) -> DeliveryAccuracyReport:
    accuracy = await compute_delivery_accuracy(db, sprint)
    return DeliveryAccuracyReport(
        sprint_id=sprint.id,
        planned_ticket_count=accuracy.planned_ticket_count,
        planned_completed_count=accuracy.planned_completed_count,
        added_completed_count=accuracy.added_completed_count,
        total_completed_count=accuracy.total_completed_count,
        planning_accuracy=BenchmarkedValue(
            value=accuracy.planning_accuracy_pct,
            band=classify("planning_accuracy_pct", accuracy.planning_accuracy_pct),
            unit="%",
        ),
        capacity_accuracy=BenchmarkedValue(
            value=accuracy.capacity_accuracy_pct,
            band=classify_capacity_accuracy(accuracy.capacity_accuracy_pct),
            unit="%",
        ),
        risk_quadrant=classify_delivery_risk_quadrant(accuracy.planning_accuracy_pct, accuracy.capacity_accuracy_pct),
    )
