"""
AI Repo Chat ("Ask Your Codebase") — natural-language Q&A over a repo's
EvidenceItems, answered by the configured LLM provider with citations. Every
interaction is logged to ChatQuery for auditability (spec Section 8).
"""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChatQuery
from app.db.session import get_db
from app.integrations.llm_client import answer_repo_chat_question
from app.schemas import ChatQueryOut, RepoChatAnswer, RepoChatQuery

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=RepoChatAnswer)
async def repo_chat(query: RepoChatQuery) -> RepoChatAnswer:
    return await answer_repo_chat_question(query.repo_id, query.question, asked_by=query.asked_by)


@router.get("/history", response_model=list[ChatQueryOut])
async def chat_history(repo_id: UUID, db: AsyncSession = Depends(get_db)) -> list[ChatQuery]:
    result = await db.execute(
        select(ChatQuery).where(ChatQuery.repo_id == repo_id).order_by(ChatQuery.created_at.desc()).limit(50)
    )
    return list(result.scalars().all())
