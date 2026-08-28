"""
AI Contribution Tracker (Phase 2 competitor-parity): detects self-disclosed
AI assistance in commit messages — `Co-Authored-By:` trailers naming a known
AI tool, or an explicit "Generated with <tool>" line, both real conventions
tools like Claude Code and GitHub Copilot actually write. This only catches
what a commit message discloses; it is not a behavioral/stylometric guess at
whether AI wrote the code.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_signals import is_ai_assisted
from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Commit, Repo
from app.db.session import get_db
from app.schemas import ContributionReport, ContributorStat
from app.billing_access import require_active_access

router = APIRouter(prefix="/contributions", tags=["contributions"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=ContributionReport, dependencies=[Depends(require_feature_flag("ai_contribution_tracker"))])
async def get_contribution_report(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> ContributionReport:
    result = await db.execute(
        select(Commit.author_github_login, Commit.message).where(
            Commit.repo_id == repo.id, Commit.committed_at >= period_start, Commit.committed_at <= period_end
        )
    )
    rows = result.all()

    by_author: dict[str, list[bool]] = {}
    for author, message in rows:
        by_author.setdefault(author, []).append(is_ai_assisted(message or ""))

    contributors = [
        ContributorStat(
            author_github_login=author,
            commit_count=len(flags),
            ai_assisted_commit_count=sum(flags),
            ai_assisted_pct=round(100 * sum(flags) / len(flags), 1) if flags else 0.0,
        )
        for author, flags in by_author.items()
    ]
    contributors.sort(key=lambda c: c.commit_count, reverse=True)

    return ContributionReport(period_start=period_start, period_end=period_end, contributors=contributors)
