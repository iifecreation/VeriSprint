"""Working Agreements (Phase 3 competitor-parity): a team-authored, versioned agreement — real text the team wrote, never LLM-generated on their behalf."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, require_feature_flag, require_role
from app.db.models import User, UserRole, WorkingAgreement
from app.db.session import get_db
from app.schemas import WorkingAgreementOut, WorkingAgreementUpsert

router = APIRouter(prefix="/working-agreements", tags=["working-agreements"], dependencies=[Depends(require_feature_flag("pulse_surveys"))])


@router.get("", response_model=list[WorkingAgreementOut])
async def list_working_agreements(
    workspace_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> list[WorkingAgreement]:
    ensure_workspace_access(user, workspace_id)
    result = await db.execute(select(WorkingAgreement).where(WorkingAgreement.workspace_id == workspace_id).order_by(WorkingAgreement.title))
    return list(result.scalars().all())


@router.put("/{title}", response_model=WorkingAgreementOut)
async def upsert_working_agreement(
    title: str,
    payload: WorkingAgreementUpsert,
    manager: User = Depends(require_role(UserRole.WORKSPACE_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
) -> WorkingAgreement:
    if manager.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    result = await db.execute(
        select(WorkingAgreement).where(WorkingAgreement.workspace_id == manager.workspace_id, WorkingAgreement.title == title)
    )
    agreement = result.scalar_one_or_none()
    before = {"body_markdown": agreement.body_markdown} if agreement else None
    if agreement is None:
        agreement = WorkingAgreement(workspace_id=manager.workspace_id, title=title, body_markdown=payload.body_markdown, repo_id=payload.repo_id)
        db.add(agreement)
    else:
        agreement.body_markdown = payload.body_markdown
        agreement.repo_id = payload.repo_id
    agreement.updated_by_user_id = manager.id
    await db.flush()
    await record_audit_for_user(
        db, user=manager, action="working_agreement.upserted", entity_type="working_agreement", entity_id=str(agreement.id),
        before=before, after={"title": agreement.title},
    )
    await db.commit()
    await db.refresh(agreement)
    return agreement
