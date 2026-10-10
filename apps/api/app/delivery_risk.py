"""
Planning Accuracy & Capacity Accuracy (Phase 5 competitor-parity — from
LinearB's "Predictable Project Delivery" framework: Stability + Velocity -
Risk = Predictability). Computed per-sprint from real Sprint/Ticket/
TicketStatusChange data — not a prediction, a measure of what already
happened:

  - Planning Accuracy: of the tickets originally committed to the sprint
    (Sprint.planned_ticket_keys), what share actually reached "done"? Answers
    "did we deliver what we said we would."
  - Capacity Accuracy: of ALL tickets that reached "done" within the sprint's
    window (planned + added mid-sprint), how many relative to what was
    originally planned? Answers "did we do about the right amount of work" —
    independent of whether it was the planned items specifically. A team that
    swapped half its planned tickets for unplanned ones but still finished
    the same total count scores low Planning Accuracy and high Capacity
    Accuracy at once — exactly LinearB's "scope creep" quadrant.

See app/benchmarks.py's classify_delivery_risk_quadrant for how the two
combine into one of four named risk postures.
"""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Sprint, Ticket, TicketStatusChange


class DeliveryAccuracy:
    def __init__(self) -> None:
        self.planned_ticket_count: int = 0
        self.planned_completed_count: int = 0
        self.added_completed_count: int = 0
        self.total_completed_count: int = 0
        self.planning_accuracy_pct: float | None = None
        self.capacity_accuracy_pct: float | None = None


async def compute_delivery_accuracy(db: AsyncSession, sprint: Sprint) -> DeliveryAccuracy:
    result = DeliveryAccuracy()
    planned_keys = set(sprint.planned_ticket_keys)
    result.planned_ticket_count = len(planned_keys)

    # Primary source: real status-change rows timestamped within the
    # sprint's own window — a ticket that transitioned to "done" more than
    # once (reopened, redone) counts once, at its earliest in-window
    # transition.
    done_result = await db.execute(
        select(Ticket.key, TicketStatusChange.changed_at)
        .join(TicketStatusChange, TicketStatusChange.ticket_id == Ticket.id)
        .where(
            Ticket.repo_id == sprint.repo_id,
            TicketStatusChange.to_status == "done",
            TicketStatusChange.changed_at >= sprint.start_date,
            TicketStatusChange.changed_at <= sprint.end_date,
        )
    )
    earliest_done: dict[str, datetime] = {}
    for key, changed_at in done_result.all():
        if key not in earliest_done or changed_at < earliest_done[key]:
            earliest_done[key] = changed_at
    done_keys = set(earliest_done)

    # Fallback, Planning Accuracy only: a planned ticket that's currently
    # "done" but has no TicketStatusChange history at all (it predates that
    # table — see TicketStatusChange's own docstring) still counts as
    # delivered. Excluded from Capacity Accuracy / added_completed_count
    # because there's no timestamp confirming it finished specifically
    # within *this* sprint's window rather than before or after it.
    fallback_done_keys: set[str] = set()
    if planned_keys:
        tracked_result = await db.execute(
            select(Ticket.key)
            .join(TicketStatusChange, TicketStatusChange.ticket_id == Ticket.id)
            .where(Ticket.repo_id == sprint.repo_id, Ticket.key.in_(planned_keys))
            .distinct()
        )
        tracked_keys = {k for (k,) in tracked_result.all()}
        untracked_keys = planned_keys - tracked_keys
        if untracked_keys:
            untracked_done_result = await db.execute(
                select(Ticket.key).where(
                    Ticket.repo_id == sprint.repo_id, Ticket.key.in_(untracked_keys), Ticket.status == "done"
                )
            )
            fallback_done_keys = {k for (k,) in untracked_done_result.all()}

    result.total_completed_count = len(done_keys)
    result.planned_completed_count = len((done_keys & planned_keys) | fallback_done_keys)
    result.added_completed_count = len(done_keys - planned_keys)

    if result.planned_ticket_count:
        result.planning_accuracy_pct = round(100 * result.planned_completed_count / result.planned_ticket_count, 1)
        result.capacity_accuracy_pct = round(100 * result.total_completed_count / result.planned_ticket_count, 1)

    return result
