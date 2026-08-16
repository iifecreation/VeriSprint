from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.db.models import Repo
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import RepoOut, RepoUpdate

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("", response_model=list[RepoOut])
async def list_repos(db: AsyncSession = Depends(get_db)) -> list[Repo]:
    result = await db.execute(select(Repo).where(Repo.is_active.is_(True)))
    return list(result.scalars().all())


@router.get("/{repo_id}", response_model=RepoOut)
async def get_repo(repo_id: UUID, db: AsyncSession = Depends(get_db)) -> Repo:
    repo = await db.get(Repo, repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    return repo


@router.patch("/{repo_id}", response_model=RepoOut)
async def update_repo(repo_id: UUID, payload: RepoUpdate, db: AsyncSession = Depends(get_db)) -> Repo:
    repo = await db.get(Repo, repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    before = {"slack_channel_id": repo.slack_channel_id}
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(repo, field, value)
    await db.flush()
    await record_audit(
        db, actor="user", action="repo.updated", entity_type="repo", entity_id=str(repo.id),
        repo_id=repo.id, before=before, after=updates,
    )
    await db.commit()
    await db.refresh(repo)
    return repo


@router.post("/{repo_id}/send-digest")
async def trigger_digest(repo_id: UUID, day: date, db: AsyncSession = Depends(get_db)) -> dict:
    repo = await db.get(Repo, repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    await enqueue("send_daily_digest", str(repo_id), day.isoformat())
    return {"queued": True}
