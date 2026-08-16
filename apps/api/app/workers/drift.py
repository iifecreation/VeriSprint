"""
Ticket Drift Detector (spec Section 5.5): flags when a ticket's real shipped
scope has silently grown or changed relative to its acceptance criteria,
without a corresponding re-estimation or ticket update.
"""
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import EvidenceItem, ReconciliationFlag, ReconciliationFlagType, Ticket
from app.db.session import AsyncSessionLocal
from app.integrations.llm_client import detect_ticket_drift as analyze_drift


async def detect_ticket_drift(ctx, ticket_id: str) -> None:
    """arq job — name must match the `enqueue("detect_ticket_drift", ...)` call sites."""
    async with AsyncSessionLocal() as db:
        ticket = await db.get(Ticket, UUID(ticket_id))
        if ticket is None or not ticket.acceptance_criteria:
            return

        result = await db.execute(select(EvidenceItem).where(EvidenceItem.ticket_key == ticket.key))
        evidence_items = list(result.scalars().all())
        if not evidence_items:
            return  # nothing shipped yet — nothing to compare against

        evidence_payload = [
            {"kind": e.kind.value, "description": e.description, "file_path": e.file_path}
            for e in evidence_items
        ]

        analysis = analyze_drift(ticket.title, ticket.acceptance_criteria, evidence_payload)
        if not analysis.get("drifted"):
            return

        existing = await db.execute(
            select(ReconciliationFlag).where(
                ReconciliationFlag.ticket_id == ticket.id,
                ReconciliationFlag.flag_type == ReconciliationFlagType.TICKET_DRIFT,
                ReconciliationFlag.is_resolved.is_(False),
            )
        )
        if existing.scalar_one_or_none() is not None:
            return  # already flagged and unresolved — don't duplicate

        flag = ReconciliationFlag(
            ticket_id=ticket.id,
            repo_id=ticket.repo_id,
            flag_type=ReconciliationFlagType.TICKET_DRIFT,
            question=analysis["explanation"],
            detail_json={"evidence_item_count": len(evidence_items)},
        )
        db.add(flag)
        await db.flush()

        await record_audit(
            db,
            actor="system",
            action="reconciliation_flag.created",
            entity_type="reconciliation_flag",
            entity_id=str(flag.id),
            repo_id=ticket.repo_id,
            after={"flag_type": "ticket_drift", "ticket_key": ticket.key, "question": flag.question},
        )
        await db.commit()
