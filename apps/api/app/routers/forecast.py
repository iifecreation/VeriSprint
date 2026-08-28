"""
Delivery Forecast (Phase 3 competitor-parity, spec's "Delivery Forecast ML"):
a real statistical projection — linear extrapolation of the sprint's own
confidence-weighted burndown velocity so far — not a trained ML model.
VeriSprint doesn't have the volume of historical sprints a real ML model
would need to avoid overfitting on a handful of examples, so this stays a
transparent trend line rather than an opaque prediction.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ensure_workspace_access, get_internal_user, require_feature_flag
from app.db.models import ConfidenceScore, Repo, Sprint, Ticket, User
from app.db.session import get_db
from app.schemas import DeliveryForecast
from app.billing_access import require_active_access

router = APIRouter(prefix="/forecast", tags=["forecast"], dependencies=[Depends(require_active_access)])


@router.get("/{sprint_id}", response_model=DeliveryForecast, dependencies=[Depends(require_feature_flag("delivery_forecast"))])
async def get_delivery_forecast(
    sprint_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> DeliveryForecast:
    sprint = await db.get(Sprint, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    repo = await db.get(Repo, sprint.repo_id)
    if repo is not None:
        ensure_workspace_access(user, repo.workspace_id)

    ticket_ids: list = []
    for key in sprint.planned_ticket_keys:
        result = await db.execute(select(Ticket.id).where(Ticket.repo_id == sprint.repo_id, Ticket.key == key))
        found = result.scalar_one_or_none()
        if found is not None:
            ticket_ids.append(found)

    scores: list[ConfidenceScore] = []
    if ticket_ids:
        scores_result = await db.execute(
            select(ConfidenceScore).where(ConfidenceScore.ticket_id.in_(ticket_ids)).order_by(ConfidenceScore.computed_at)
        )
        scores = list(scores_result.scalars().all())

    now = datetime.now(timezone.utc)
    sprint_start = sprint.start_date if sprint.start_date.tzinfo else sprint.start_date.replace(tzinfo=timezone.utc)
    sprint_end = sprint.end_date if sprint.end_date.tzinfo else sprint.end_date.replace(tzinfo=timezone.utc)

    latest_by_ticket: dict = {}
    for s in scores:
        latest_by_ticket[s.ticket_id] = s
    current_complete = sum(s.score / 100 for s in latest_by_ticket.values())

    elapsed_days = max((min(now, sprint_end) - sprint_start).total_seconds() / 86400, 1e-9)
    velocity_per_day = round(current_complete / elapsed_days, 3) if scores else None

    projected_completion_date = None
    note = None
    if velocity_per_day and velocity_per_day > 0 and len(ticket_ids) > 0:
        remaining = max(len(ticket_ids) - current_complete, 0)
        days_needed = remaining / velocity_per_day
        projected_completion_date = now + timedelta(days=days_needed)
    elif not scores:
        note = "No Confidence Score history yet for this sprint's tickets — nothing to project from."
    elif velocity_per_day == 0:
        note = "Velocity is currently zero — no projected completion date."

    return DeliveryForecast(
        sprint_id=sprint.id,
        current_confidence_weighted_complete=round(current_complete, 2),
        planned_tickets=len(ticket_ids),
        velocity_per_day=velocity_per_day,
        projected_completion_date=projected_completion_date,
        projection_note=note,
    )
