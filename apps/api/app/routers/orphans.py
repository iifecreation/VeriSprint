"""Orphan Commit Detector — list flagged orphan commits and retroactively link them to a ticket."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user
from app.db.models import Commit, ReconciliationFlag, ReconciliationFlagType, Repo, User
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import OrphanCommitOut

router = APIRouter(tags=["orphan-commits"])


class LinkCommitRequest(BaseModel):
    ticket_key: str


@router.get("/repos/{repo_id}/orphan-commits", response_model=list[OrphanCommitOut])
async def list_orphan_commits(repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)) -> list[Commit]:
    result = await db.execute(
        select(Commit)
        .join(
            ReconciliationFlag,
            (ReconciliationFlag.commit_id == Commit.id)
            & (ReconciliationFlag.flag_type == ReconciliationFlagType.ORPHAN_COMMIT)
            & (ReconciliationFlag.is_resolved.is_(False)),
        )
        .where(Commit.repo_id == repo.id)
        .order_by(Commit.committed_at.desc())
        .limit(500)
    )
    return list(result.scalars().all())


@router.post("/repos/{repo_id}/detect-orphans")
async def trigger_orphan_detection(repo: Repo = Depends(get_repo_for_user)) -> dict:
    await enqueue("detect_orphan_commits", str(repo.id))
    return {"queued": True}


@router.post("/orphan-commits/{commit_id}/link")
async def link_orphan_commit(
    commit_id: UUID,
    payload: LinkCommitRequest,
    user: User = Depends(get_internal_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    commit = await db.get(Commit, commit_id)
    if commit is None:
        raise HTTPException(status_code=404, detail="Commit not found")
    repo = await db.get(Repo, commit.repo_id)
    if repo is not None:
        ensure_workspace_access(user, repo.workspace_id)

    before = {"linked_ticket_key": commit.linked_ticket_key}
    commit.linked_ticket_key = payload.ticket_key

    # Resolve the ORPHAN_COMMIT flag(s) for this commit — it's no longer orphaned.
    flags_result = await db.execute(
        select(ReconciliationFlag).where(
            ReconciliationFlag.commit_id == commit_id,
            ReconciliationFlag.flag_type == ReconciliationFlagType.ORPHAN_COMMIT,
            ReconciliationFlag.is_resolved.is_(False),
        )
    )
    for flag in flags_result.scalars().all():
        flag.is_resolved = True

    await db.flush()
    await record_audit_for_user(
        db, user=user, action="commit.linked_to_ticket", entity_type="commit", entity_id=str(commit.id),
        repo_id=commit.repo_id, before=before, after={"linked_ticket_key": payload.ticket_key},
    )
    await db.commit()

    # New evidence for that ticket key exists now — recompute confidence if the ticket exists.
    from app.db.models import Ticket

    ticket_result = await db.execute(
        select(Ticket).where(Ticket.repo_id == commit.repo_id, Ticket.key == payload.ticket_key)
    )
    ticket = ticket_result.scalar_one_or_none()
    if ticket is not None:
        await enqueue("compute_confidence", str(ticket.id))
        await enqueue("reconcile_ticket", str(ticket.id))

    return {"linked": True}
