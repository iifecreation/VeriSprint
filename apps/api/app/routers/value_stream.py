"""
Value Stream View (Phase 3 competitor-parity): average time spent in each
status before moving to the next, computed only from real `TicketStatusChange`
rows — see tickets.py's update endpoint. A ticket that never had a tracked
transition contributes nothing; this view only reports what's actually
been observed since tracking started, never a backfilled estimate.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Repo, Ticket, TicketStatusChange
from app.db.session import get_db
from app.schemas import ValueStreamReport, ValueStreamStage
from app.billing_access import require_active_access

router = APIRouter(prefix="/value-stream", tags=["value-stream"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=ValueStreamReport, dependencies=[Depends(require_feature_flag("value_stream_view"))])
async def get_value_stream(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> ValueStreamReport:
    ticket_ids_result = await db.execute(select(Ticket.id).where(Ticket.repo_id == repo.id))
    ticket_ids = [t for (t,) in ticket_ids_result.all()]
    if not ticket_ids:
        return ValueStreamReport(period_start=period_start, period_end=period_end, stages=[], tracked_ticket_count=0)

    changes_result = await db.execute(
        select(TicketStatusChange)
        .where(
            TicketStatusChange.ticket_id.in_(ticket_ids),
            TicketStatusChange.changed_at >= period_start,
            TicketStatusChange.changed_at <= period_end,
        )
        .order_by(TicketStatusChange.ticket_id, TicketStatusChange.changed_at)
    )
    changes = list(changes_result.scalars().all())

    # Pair each transition with the one before it, per ticket, to get real
    # "time spent in from_status before moving to to_status" durations.
    durations_by_status: dict[str, list[float]] = {}
    last_change_by_ticket: dict = {}
    tracked_tickets = set()
    for change in changes:
        tracked_tickets.add(change.ticket_id)
        prior = last_change_by_ticket.get(change.ticket_id)
        if prior is not None and prior.to_status == change.from_status:
            hours = (change.changed_at - prior.changed_at).total_seconds() / 3600
            durations_by_status.setdefault(change.from_status, []).append(hours)
        last_change_by_ticket[change.ticket_id] = change

    stages = [
        ValueStreamStage(status=status, avg_hours=round(sum(hours) / len(hours), 1), sample_count=len(hours))
        for status, hours in durations_by_status.items()
    ]
    stages.sort(key=lambda s: s.avg_hours, reverse=True)

    return ValueStreamReport(period_start=period_start, period_end=period_end, stages=stages, tracked_ticket_count=len(tracked_tickets))
