"""
Ticket sync + reconciliation (Step 5).

MVP: tickets can be created manually (for the demo) or synced from Jira/Linear
via `app/integrations/jira_client.py`. `POST /tickets/{id}/reconcile` re-runs
the reconciliation engine on demand; normally it's triggered by the worker
after new commits land (see `app/workers/reconciliation.py`).
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from collections import defaultdict

from app.audit import record_audit
from app.db.models import ConfidenceScore, EvidenceItem, ReconciliationFlag, Ticket
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import ImpactMapEntry, TicketCreate, TicketOut, TicketUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketOut])
async def list_tickets(repo_id: UUID, db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(Ticket).where(Ticket.repo_id == repo_id))
    tickets = result.scalars().all()
    return [await _to_ticket_out(db, t) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await _to_ticket_out(db, ticket)


@router.post("", response_model=TicketOut)
async def create_ticket(payload: TicketCreate, db: AsyncSession = Depends(get_db)) -> dict:
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    await db.flush()
    await record_audit(
        db,
        actor=ticket.assignee_github_login or "unknown",
        action="ticket.created",
        entity_type="ticket",
        entity_id=str(ticket.id),
        repo_id=ticket.repo_id,
        after={"key": ticket.key, "status": ticket.status},
    )
    await db.commit()
    await db.refresh(ticket)
    return await _to_ticket_out(db, ticket)


@router.patch("/{ticket_id}", response_model=TicketOut)
async def update_ticket(ticket_id: UUID, payload: TicketUpdate, db: AsyncSession = Depends(get_db)) -> dict:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    before = {
        "status": ticket.status,
        "title": ticket.title,
        "acceptance_criteria": ticket.acceptance_criteria,
        "assignee_github_login": ticket.assignee_github_login,
    }
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(ticket, field, value)
    await db.flush()

    await record_audit(
        db,
        actor=ticket.assignee_github_login or "unknown",
        action="ticket.updated",
        entity_type="ticket",
        entity_id=str(ticket.id),
        repo_id=ticket.repo_id,
        before=before,
        after=updates,
    )
    await db.commit()

    # A status or acceptance-criteria change can change the claimed-vs-shipped
    # picture — re-run reconciliation, and re-check for drift if the criteria changed.
    if "status" in updates:
        await enqueue("reconcile_ticket", str(ticket.id))
    if "acceptance_criteria" in updates:
        await enqueue("detect_ticket_drift", str(ticket.id))

    await db.refresh(ticket)
    return await _to_ticket_out(db, ticket)


@router.post("/{ticket_id}/reconcile")
async def reconcile_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await enqueue("reconcile_ticket", str(ticket_id))
    return {"queued": True}


@router.post("/{ticket_id}/detect-drift")
async def trigger_drift_detection(ticket_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not ticket.acceptance_criteria:
        raise HTTPException(status_code=400, detail="Ticket has no acceptance_criteria to compare against")
    await enqueue("detect_ticket_drift", str(ticket_id))
    return {"queued": True}


@router.get("/{ticket_id}/impact-map", response_model=list[ImpactMapEntry])
async def get_impact_map(ticket_id: UUID, db: AsyncSession = Depends(get_db)) -> list[ImpactMapEntry]:
    """
    Cross-file impact map (spec Phase 2): which real files a ticket's shipped
    evidence touches — a simple, honest aggregation of EvidenceItem.file_path,
    not a guessed dependency graph.
    """
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.ticket_key == ticket.key, EvidenceItem.file_path.is_not(None))
    )
    by_file: dict[str, list[str]] = defaultdict(list)
    for item in result.scalars().all():
        by_file[item.file_path].append(item.kind.value)

    entries = [
        ImpactMapEntry(file_path=path, evidence_count=len(kinds), kinds=sorted(set(kinds)))
        for path, kinds in by_file.items()
    ]
    entries.sort(key=lambda e: e.evidence_count, reverse=True)
    return entries


async def _to_ticket_out(db: AsyncSession, ticket: Ticket) -> dict:
    score_result = await db.execute(
        select(ConfidenceScore)
        .where(ConfidenceScore.ticket_id == ticket.id)
        .order_by(ConfidenceScore.computed_at.desc())
        .limit(1)
    )
    flags_result = await db.execute(
        select(ReconciliationFlag).where(
            ReconciliationFlag.ticket_id == ticket.id,
            ReconciliationFlag.is_resolved.is_(False),
        )
    )
    return {
        "id": ticket.id,
        "key": ticket.key,
        "title": ticket.title,
        "status": ticket.status,
        "assignee_github_login": ticket.assignee_github_login,
        "confidence": score_result.scalar_one_or_none(),
        "flags": list(flags_result.scalars().all()),
    }
