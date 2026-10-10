from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user
from app.db.models import Repo, Service, User
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import RepoOut, RepoUpdate
from app.billing_access import require_active_access

router = APIRouter(prefix="/repos", tags=["repos"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=list[RepoOut])
async def list_repos(
    workspace_id: UUID | None = None,
    user: User = Depends(get_internal_user),
    db: AsyncSession = Depends(get_db),
) -> list[Repo]:
    # Default to the caller's own workspace; SUPER_ADMIN may pass an explicit
    # workspace_id to look at any tenant's repos (Super-Admin Dashboard).
    target_workspace_id = workspace_id or user.workspace_id
    if target_workspace_id is None:
        return []
    ensure_workspace_access(user, target_workspace_id)
    result = await db.execute(
        select(Repo).where(Repo.workspace_id == target_workspace_id, Repo.is_active.is_(True))
    )
    return list(result.scalars().all())


@router.get("/{repo_id}", response_model=RepoOut)
async def get_repo(repo: Repo = Depends(get_repo_for_user)) -> Repo:
    return repo


@router.patch("/{repo_id}", response_model=RepoOut)
async def update_repo(
    payload: RepoUpdate,
    repo: Repo = Depends(get_repo_for_user),
    user: User = Depends(get_internal_user),
    db: AsyncSession = Depends(get_db),
) -> Repo:
    before = {"slack_channel_id": repo.slack_channel_id}
    updates = payload.model_dump(exclude_unset=True)
    if "service_id" in updates and updates["service_id"] is not None:
        service = await db.get(Service, updates["service_id"])
        if service is None or service.workspace_id != repo.workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    for field, value in updates.items():
        setattr(repo, field, value)
    await db.flush()
    # before_json/after_json are plain JSON columns — stringify UUID values
    # (e.g. service_id) before handing them to record_audit_for_user, since
    # Python's json module can't serialize a UUID directly.
    audit_after = {k: (str(v) if isinstance(v, UUID) else v) for k, v in updates.items()}
    await record_audit_for_user(
        db, user=user, action="repo.updated", entity_type="repo", entity_id=str(repo.id),
        repo_id=repo.id, before=before, after=audit_after,
    )
    await db.commit()
    await db.refresh(repo)
    return repo


@router.post("/{repo_id}/send-digest")
async def trigger_digest(day: date, repo: Repo = Depends(get_repo_for_user)) -> dict:
    await enqueue("send_daily_digest", str(repo.id), day.isoformat())
    return {"queued": True}
