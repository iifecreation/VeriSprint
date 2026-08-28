"""
Cross-cutting ReconciliationFlag access — claimed-vs-shipped mismatches,
ticket drift, orphan commits, and activity-drop nudges all land in the same
table (spec: "ticket_id or person_id"), so listing/resolving them is generic
rather than duplicated per flag type.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user
from app.db.models import ReconciliationFlag, Repo, User
from app.db.session import get_db
from app.schemas import ReconciliationFlagOut
from app.billing_access import require_active_access

router = APIRouter(prefix="/flags", tags=["flags"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=list[ReconciliationFlagOut])
async def list_flags(
    flag_type: str | None = None,
    include_resolved: bool = False,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReconciliationFlag]:
    stmt = select(ReconciliationFlag).where(ReconciliationFlag.repo_id == repo.id).order_by(
        ReconciliationFlag.created_at.desc()
    )
    if flag_type is not None:
        stmt = stmt.where(ReconciliationFlag.flag_type == flag_type)
    if not include_resolved:
        stmt = stmt.where(ReconciliationFlag.is_resolved.is_(False))
    result = await db.execute(stmt.limit(500))
    return list(result.scalars().all())


@router.post("/{flag_id}/resolve", response_model=ReconciliationFlagOut)
async def resolve_flag(
    flag_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReconciliationFlag:
    flag = await db.get(ReconciliationFlag, flag_id)
    if flag is None:
        raise HTTPException(status_code=404, detail="Flag not found")
    if flag.repo_id is not None:
        repo = await db.get(Repo, flag.repo_id)
        if repo is not None:
            ensure_workspace_access(user, repo.workspace_id)

    flag.is_resolved = True
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="reconciliation_flag.resolved", entity_type="reconciliation_flag",
        entity_id=str(flag.id), repo_id=flag.repo_id, after={"flag_type": flag.flag_type.value},
    )
    await db.commit()
    await db.refresh(flag)
    return flag
