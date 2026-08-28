"""
Historical Accuracy Score (spec Phase 2): per person, per month, how often
their tickets' claimed progress held up against verified evidence — framed as
calibration, not punishment (spec: "framed as calibration, not punishment").

Definition (transparent by design, per the differentiation strategy's
"every score shows its evidence" principle): for a person/month bucket —
every ticket assigned to that person that had at least one ConfidenceScore
computed during that month. A ticket counts as "accurate" if its most recent
ConfidenceScore is >= 70 and it currently has no unresolved ReconciliationFlag.
"""
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user
from app.db.models import ConfidenceScore, ReconciliationFlag, Repo, Ticket
from app.db.session import get_db
from app.schemas import AccuracyPoint
from app.billing_access import require_active_access

router = APIRouter(prefix="/accuracy", tags=["accuracy"], dependencies=[Depends(require_active_access)])

ACCURATE_SCORE_THRESHOLD = 70


@router.get("", response_model=list[AccuracyPoint])
async def get_historical_accuracy(
    person: str | None = None, repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)
) -> list[AccuracyPoint]:
    result = await db.execute(
        select(ConfidenceScore, Ticket)
        .join(Ticket, ConfidenceScore.ticket_id == Ticket.id)
        .where(Ticket.repo_id == repo.id, Ticket.assignee_github_login.is_not(None))
    )
    rows = result.all()
    if person:
        rows = [(s, t) for s, t in rows if t.assignee_github_login == person]

    # (month, assignee) -> set of ticket_ids that had a score computed that month
    buckets: dict[tuple[str, str], set[UUID]] = defaultdict(set)
    for score, ticket in rows:
        month = score.computed_at.strftime("%Y-%m")
        buckets[(month, ticket.assignee_github_login)].add(ticket.id)

    if not buckets:
        return []

    all_ticket_ids = {tid for ids in buckets.values() for tid in ids}

    # Latest score per ticket, and open-flag count per ticket — one query each.
    all_scores_result = await db.execute(
        select(ConfidenceScore).where(ConfidenceScore.ticket_id.in_(all_ticket_ids)).order_by(ConfidenceScore.computed_at)
    )
    latest_score_by_ticket: dict[UUID, ConfidenceScore] = {}
    for s in all_scores_result.scalars().all():
        latest_score_by_ticket[s.ticket_id] = s  # ascending order — last write wins

    flags_result = await db.execute(
        select(ReconciliationFlag.ticket_id).where(
            ReconciliationFlag.ticket_id.in_(all_ticket_ids),
            ReconciliationFlag.is_resolved.is_(False),
        )
    )
    tickets_with_open_flags = {tid for (tid,) in flags_result.all() if tid is not None}

    points: list[AccuracyPoint] = []
    for (month, assignee), ticket_ids in buckets.items():
        confidences = [latest_score_by_ticket[t].score for t in ticket_ids if t in latest_score_by_ticket]
        flagged_count = sum(1 for t in ticket_ids if t in tickets_with_open_flags)
        accurate_count = sum(
            1
            for t in ticket_ids
            if t in latest_score_by_ticket
            and latest_score_by_ticket[t].score >= ACCURATE_SCORE_THRESHOLD
            and t not in tickets_with_open_flags
        )
        completed = len(ticket_ids)
        points.append(
            AccuracyPoint(
                month=month,
                person_github_login=assignee,
                tickets_completed=completed,
                tickets_with_unresolved_flags=flagged_count,
                avg_confidence_score=round(sum(confidences) / len(confidences), 1) if confidences else None,
                accuracy_pct=round(100 * accurate_count / completed, 1) if completed else 0.0,
            )
        )

    points.sort(key=lambda p: (p.month, p.person_github_login))
    return points
