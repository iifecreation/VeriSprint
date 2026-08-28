"""
PM dashboard + Developer view (Step 7).

Both views hit the same endpoints — the frontend applies "claimed vs shipped
across the team" (PM) vs. "your own tickets" (developer) framing on top of the
same TicketOut payload from `tickets.py`. This router adds the aggregate
summary used for the dashboard header cards.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user
from app.db.models import ConfidenceScore, ReconciliationFlag, Repo, Ticket
from app.db.session import get_db
from app.billing_access import require_active_access

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_active_access)])


@router.get("/summary")
async def dashboard_summary(repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)) -> dict:
    ticket_count = await db.scalar(
        select(func.count()).select_from(Ticket).where(Ticket.repo_id == repo.id)
    )
    avg_confidence = await db.scalar(
        select(func.avg(ConfidenceScore.score))
        .join(Ticket, Ticket.id == ConfidenceScore.ticket_id)
        .where(Ticket.repo_id == repo.id)
    )
    open_flags = await db.scalar(
        select(func.count())
        .select_from(ReconciliationFlag)
        .join(Ticket, Ticket.id == ReconciliationFlag.ticket_id)
        .where(Ticket.repo_id == repo.id, ReconciliationFlag.is_resolved.is_(False))
    )
    return {
        "ticket_count": ticket_count or 0,
        "avg_confidence": round(avg_confidence, 1) if avg_confidence is not None else None,
        "open_flags": open_flags or 0,
    }
