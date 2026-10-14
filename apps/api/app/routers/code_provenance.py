"""
Code Provenance (per-commit line breakdown): see app/code_provenance.py's
module docstring for exactly what each bucket does and doesn't claim —
summarized in CodeProvenanceReport.method_note below, which is returned
with every response rather than left for documentation to drift out of
sync with.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.billing_access import require_active_access
from app.db.models import Commit, Repo
from app.db.session import get_db
from app.schemas import CodeProvenanceReport, CommitProvenanceOut

router = APIRouter(prefix="/code-provenance", tags=["code-provenance"], dependencies=[Depends(require_active_access)])


@router.get("", response_model=CodeProvenanceReport, dependencies=[Depends(require_feature_flag("code_provenance"))])
async def get_code_provenance_report(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> CodeProvenanceReport:
    result = await db.execute(
        select(Commit)
        .where(Commit.repo_id == repo.id, Commit.committed_at >= period_start, Commit.committed_at <= period_end)
        .order_by(Commit.committed_at.desc())
    )
    commits = list(result.scalars().all())

    total_original = total_ai = total_dup = analyzed = pending = 0
    commit_outs: list[CommitProvenanceOut] = []
    for c in commits:
        is_analyzed = c.original_engineering_lines is not None
        total_lines: int | None = None
        if is_analyzed:
            analyzed += 1
            original = c.original_engineering_lines or 0
            ai = c.ai_disclosed_lines or 0
            dup = c.duplicate_or_boilerplate_lines or 0
            total_original += original
            total_ai += ai
            total_dup += dup
            total_lines = original + ai + dup
        else:
            pending += 1

        first_line = (c.message or "").splitlines()[0] if c.message else ""
        commit_outs.append(
            CommitProvenanceOut(
                commit_id=c.id,
                sha=c.sha,
                author_github_login=c.author_github_login,
                message_summary=first_line[:200],
                committed_at=c.committed_at,
                original_engineering_lines=c.original_engineering_lines,
                ai_disclosed_lines=c.ai_disclosed_lines,
                duplicate_or_boilerplate_lines=c.duplicate_or_boilerplate_lines,
                total_lines=total_lines,
            )
        )

    grand_total = total_original + total_ai + total_dup
    return CodeProvenanceReport(
        period_start=period_start,
        period_end=period_end,
        total_original_engineering_lines=total_original,
        total_ai_disclosed_lines=total_ai,
        total_duplicate_or_boilerplate_lines=total_dup,
        original_engineering_pct=round(100 * total_original / grand_total, 1) if grand_total else None,
        ai_disclosed_pct=round(100 * total_ai / grand_total, 1) if grand_total else None,
        duplicate_or_boilerplate_pct=round(100 * total_dup / grand_total, 1) if grand_total else None,
        analyzed_commit_count=analyzed,
        pending_commit_count=pending,
        commits=commit_outs,
    )
