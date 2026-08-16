"""
Investment Allocation Dashboard (Phase 2 competitor-parity): where engineering
time actually went, by repo and by person — a real aggregation of commit
volume and line changes, not a self-reported time-tracking estimate.
"""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_workspace_for_user, require_feature_flag
from app.db.models import Commit, Repo, Workspace
from app.db.session import get_db
from app.schemas import AllocationEntry, AllocationReport

router = APIRouter(prefix="/allocation", tags=["allocation"])


@router.get("", response_model=AllocationReport, dependencies=[Depends(require_feature_flag("investment_allocation"))])
async def get_allocation_report(
    period_start: datetime,
    period_end: datetime,
    workspace: Workspace = Depends(get_workspace_for_user),
    db: AsyncSession = Depends(get_db),
) -> AllocationReport:
    repos_result = await db.execute(select(Repo).where(Repo.workspace_id == workspace.id))
    repos = {r.id: r.full_name for r in repos_result.scalars().all()}
    if not repos:
        return AllocationReport(period_start=period_start, period_end=period_end, by_repo=[], by_person=[])

    commits_result = await db.execute(
        select(Commit.repo_id, Commit.author_github_login, Commit.additions, Commit.deletions).where(
            Commit.repo_id.in_(repos.keys()), Commit.committed_at >= period_start, Commit.committed_at <= period_end
        )
    )
    rows = commits_result.all()
    total_commits = len(rows)

    def _aggregate(key_fn) -> list[AllocationEntry]:
        agg: dict[str, dict[str, int]] = {}
        for repo_id, author, additions, deletions in rows:
            key = key_fn(repo_id, author)
            bucket = agg.setdefault(key, {"commits": 0, "additions": 0, "deletions": 0})
            bucket["commits"] += 1
            bucket["additions"] += additions or 0
            bucket["deletions"] += deletions or 0
        entries = [
            AllocationEntry(
                label=label, commit_count=v["commits"], additions=v["additions"], deletions=v["deletions"],
                pct_of_commits=round(100 * v["commits"] / total_commits, 1) if total_commits else 0.0,
            )
            for label, v in agg.items()
        ]
        entries.sort(key=lambda e: e.commit_count, reverse=True)
        return entries

    by_repo = _aggregate(lambda repo_id, author: repos.get(repo_id, str(repo_id)))
    by_person = _aggregate(lambda repo_id, author: author)

    return AllocationReport(period_start=period_start, period_end=period_end, by_repo=by_repo, by_person=by_person)
