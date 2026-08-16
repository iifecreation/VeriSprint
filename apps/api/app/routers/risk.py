"""
Risk Radar (Phase 2 competitor-parity): a single repo-level view combining
signals VeriSprint already computes for real — unresolved reconciliation
flags by type, tickets with a low Confidence Score, and tickets stuck in a
non-terminal status. No new data, no LLM call — just an honest rollup.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import ConfidenceScore, ReconciliationFlag, Repo, Ticket
from app.db.session import get_db
from app.schemas import RiskRadar

router = APIRouter(prefix="/risk", tags=["risk"])

LOW_CONFIDENCE_THRESHOLD = 50
STALE_DAYS = 5
NON_TERMINAL_STATUSES = {"in_progress", "in_review"}


@router.get("", response_model=RiskRadar, dependencies=[Depends(require_feature_flag("risk_radar"))])
async def get_risk_radar(repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)) -> RiskRadar:
    flags_result = await db.execute(
        select(ReconciliationFlag.flag_type, func.count())
        .where(ReconciliationFlag.repo_id == repo.id, ReconciliationFlag.is_resolved.is_(False))
        .group_by(ReconciliationFlag.flag_type)
    )
    open_flags_by_type = {flag_type.value: count for flag_type, count in flags_result.all()}

    # Latest score per ticket in this repo, then how many are below threshold.
    tickets_result = await db.execute(select(Ticket).where(Ticket.repo_id == repo.id))
    tickets = list(tickets_result.scalars().all())
    ticket_ids = [t.id for t in tickets]

    low_confidence_count = 0
    if ticket_ids:
        scores_result = await db.execute(
            select(ConfidenceScore).where(ConfidenceScore.ticket_id.in_(ticket_ids)).order_by(ConfidenceScore.computed_at)
        )
        latest_by_ticket: dict = {}
        for s in scores_result.scalars().all():
            latest_by_ticket[s.ticket_id] = s  # ascending order — last write wins
        low_confidence_count = sum(1 for s in latest_by_ticket.values() if s.score < LOW_CONFIDENCE_THRESHOLD)

    cutoff = datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)
    stale_count = sum(
        1 for t in tickets if t.status.lower() in NON_TERMINAL_STATUSES and t.created_at is not None and t.created_at < cutoff
    )

    open_flag_total = sum(open_flags_by_type.values())
    ticket_count = len(tickets) or 1
    risk_score = round(
        min(100.0, 100 * (open_flag_total + low_confidence_count + stale_count) / (ticket_count * 3)), 1
    )

    return RiskRadar(
        repo_id=repo.id,
        open_flags_by_type=open_flags_by_type,
        low_confidence_ticket_count=low_confidence_count,
        stale_in_progress_ticket_count=stale_count,
        risk_score=risk_score,
    )
