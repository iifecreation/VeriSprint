"""ConfidenceScore engine (Step 4): aggregates a ticket's EvidenceItems into a score + rationale."""
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import ConfidenceScore, EvidenceItem, Ticket
from app.db.session import AsyncSessionLocal
from app.integrations.llm_client import score_ticket_confidence


async def compute_confidence(ctx, ticket_id: str) -> None:
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(ticket_id))
        if ticket is None:
            return

        result = await db.execute(
            select(EvidenceItem).where(EvidenceItem.ticket_key == ticket.key)
        )
        evidence_items = list(result.scalars().all())
        evidence_payload = [
            {"kind": e.kind.value, "description": e.description, "file_path": e.file_path}
            for e in evidence_items
        ]

        scored = score_ticket_confidence(ticket.title, ticket.status, evidence_payload)
        score_value = max(0, min(100, int(scored["score"])))

        confidence = ConfidenceScore(
            ticket_id=ticket.id,
            score=score_value,
            rationale=scored["rationale"],
            evidence_item_ids=[str(e.id) for e in evidence_items],
        )
        db.add(confidence)
        await db.flush()

        await record_audit(
            db,
            actor="system",
            action="confidence_score.computed",
            entity_type="ticket",
            entity_id=str(ticket.id),
            repo_id=ticket.repo_id,
            after={"score": score_value, "rationale": scored["rationale"], "evidence_item_count": len(evidence_items)},
        )

        await db.commit()
