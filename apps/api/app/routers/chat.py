"""
AI Repo Chat ("Ask Your Codebase") — natural-language Q&A over a repo's
EvidenceItems, answered by the configured LLM provider with citations. Every
interaction is logged to ChatQuery for auditability (spec Section 8).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user
from app.db.models import ChatQuery, Repo, User
from app.db.session import get_db
from app.integrations.llm_client import answer_repo_chat_question
from app.schemas import ChatQueryOut, RepoChatAnswer, RepoChatQuery

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=RepoChatAnswer)
async def repo_chat(
    query: RepoChatQuery, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> RepoChatAnswer:
    repo = await db.get(Repo, query.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    ensure_workspace_access(user, repo.workspace_id)
    return await answer_repo_chat_question(query.repo_id, query.question, asked_by=query.asked_by)


@router.get("/history", response_model=list[ChatQueryOut])
async def chat_history(repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)) -> list[ChatQuery]:
    result = await db.execute(
        select(ChatQuery).where(ChatQuery.repo_id == repo.id).order_by(ChatQuery.created_at.desc()).limit(50)
    )
    return list(result.scalars().all())
