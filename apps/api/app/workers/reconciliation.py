"""
Reconciliation engine (Step 5): compares a ticket's claimed status against the
evidence its linked commits actually show, and raises a ReconciliationFlag
phrased as a question — never an accusation.
"""
from uuid import UUID

from sqlalchemy import func, select

from app.audit import record_audit
from app.db.models import (
    ConfidenceScore,
    EvidenceItem,
    ReconciliationFlag,
    ReconciliationFlagType,
    Ticket,
)
from app.db.session import AsyncSessionLocal

DONE_STATUSES = {"done", "closed", "resolved"}
LOW_CONFIDENCE_THRESHOLD = 50


async def reconcile_ticket(ctx, ticket_id: str) -> None:
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(ticket_id))
        if ticket is None:
            return

        evidence_count = await db.scalar(
            select(func.count()).select_from(EvidenceItem).where(EvidenceItem.ticket_key == ticket.key)
        )
        latest_score_result = await db.execute(
            select(ConfidenceScore)
            .where(ConfidenceScore.ticket_id == ticket.id)
            .order_by(ConfidenceScore.computed_at.desc())
            .limit(1)
        )
        latest_score = latest_score_result.scalar_one_or_none()
        status = ticket.status.lower()

        # Don't spam duplicate flags every time a new commit re-triggers reconciliation.
        existing_result = await db.execute(
            select(ReconciliationFlag.flag_type).where(
                ReconciliationFlag.ticket_id == ticket.id,
                ReconciliationFlag.is_resolved.is_(False),
            )
        )
        existing_types = {t for (t,) in existing_result.all()}

        candidate: ReconciliationFlag | None = None

        if status in DONE_STATUSES and not evidence_count:
            candidate = ReconciliationFlag(
                ticket_id=ticket.id,
                repo_id=ticket.repo_id,
                flag_type=ReconciliationFlagType.CLAIMED_NOT_SHIPPED,
                question=(
                    f"{ticket.key} is marked {ticket.status} — I don't see any commits "
                    "linked to it yet. Did the work land under a different ticket key, "
                    "or is this still in progress?"
                ),
            )
        elif evidence_count and status not in DONE_STATUSES and status not in ("in_progress", "in progress"):
            candidate = ReconciliationFlag(
                ticket_id=ticket.id,
                repo_id=ticket.repo_id,
                flag_type=ReconciliationFlagType.SHIPPED_NOT_CLAIMED,
                question=(
                    f"There are commits referencing {ticket.key}, but the ticket is still "
                    f"'{ticket.status}'. Should the ticket status be updated to reflect that?"
                ),
            )
        elif status in DONE_STATUSES and latest_score is not None and latest_score.score < LOW_CONFIDENCE_THRESHOLD:
            candidate = ReconciliationFlag(
                ticket_id=ticket.id,
                repo_id=ticket.repo_id,
                flag_type=ReconciliationFlagType.LOW_CONFIDENCE,
                question=(
                    f"{ticket.key} is marked done, but the evidence looks thin "
                    f"(confidence {latest_score.score}/100: {latest_score.rationale}). "
                    "Worth a second look before calling it fully shipped?"
                ),
                detail_json={"score": latest_score.score},
            )

        if candidate is not None and candidate.flag_type not in existing_types:
            db.add(candidate)
            await db.flush()
            await record_audit(
                db,
                actor="system",
                action="reconciliation_flag.created",
                entity_type="reconciliation_flag",
                entity_id=str(candidate.id),
                repo_id=ticket.repo_id,
                after={"flag_type": candidate.flag_type.value, "ticket_key": ticket.key, "question": candidate.question},
            )

        await db.commit()
