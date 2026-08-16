"""
Durable Change & Code Health Signals (Phase 2 competitor-parity): a real
proxy built from the Evidence Ledger the LLM analysis pipeline already
produces — not a synthesized churn/line-survival metric VeriSprint has no
data to back. `test_added` counts toward health; `test_missing`/`dead_code`/
`todo_found` count against it; `risk` is reported but not scored either way
(too context-dependent to weight without more signal).
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Commit, EvidenceItem, EvidenceKind, Repo
from app.db.session import get_db
from app.schemas import CodeHealthSignals

router = APIRouter(prefix="/code-health", tags=["code-health"])


@router.get("", response_model=CodeHealthSignals, dependencies=[Depends(require_feature_flag("code_health_signals"))])
async def get_code_health(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> CodeHealthSignals:
    result = await db.execute(
        select(EvidenceItem.kind, func.count())
        .join(Commit, Commit.id == EvidenceItem.commit_id)
        .where(Commit.repo_id == repo.id, Commit.committed_at >= period_start, Commit.committed_at <= period_end)
        .group_by(EvidenceItem.kind)
    )
    counts = dict(result.all())

    test_added = counts.get(EvidenceKind.TEST_ADDED, 0)
    test_missing = counts.get(EvidenceKind.TEST_MISSING, 0)
    dead_code = counts.get(EvidenceKind.DEAD_CODE, 0)
    todo = counts.get(EvidenceKind.TODO_FOUND, 0)
    risk = counts.get(EvidenceKind.RISK, 0)
    total = sum(counts.values())

    # A simple, transparent formula: positive signal (tests added) against
    # negative signal (missing tests, dead code, TODOs) — never a black box.
    negative = test_missing + dead_code + todo
    denominator = test_added + negative
    health_score = round(100 * test_added / denominator, 1) if denominator > 0 else None

    return CodeHealthSignals(
        period_start=period_start,
        period_end=period_end,
        total_evidence_items=total,
        test_added_count=test_added,
        test_missing_count=test_missing,
        dead_code_count=dead_code,
        todo_count=todo,
        risk_count=risk,
        health_score=health_score,
    )
