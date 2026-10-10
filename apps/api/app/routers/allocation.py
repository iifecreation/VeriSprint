"""
Investment Allocation Dashboard (Phase 2 competitor-parity): where engineering
time actually went, by repo and by person — a real aggregation of commit
volume and line changes, not a self-reported time-tracking estimate.

Also hosts the Investment Profile (Phase 3 competitor-parity): the same
commit volume, but bucketed into the New Value / Feature Enhancements /
Developer Experience / Keeping the Lights On taxonomy — the actual
classification and aggregation lives in app/investment.py so app/goals.py can
target a category's share as a goal metric without importing this router.
"""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_ids_for_scope, get_workspace_for_user, require_feature_flag
from app.benchmarks import INVESTMENT_PROFILE_TARGETS
from app.db.models import Commit, Repo, Workspace
from app.db.session import get_db
from app.investment import compute_investment_profile
from app.metrics import compute_efficiency_metrics
from app.schemas import AllocationEntry, AllocationReport, InvestmentCategoryEntry, InvestmentProfileReport
from app.billing_access import require_active_access

router = APIRouter(prefix="/allocation", tags=["allocation"], dependencies=[Depends(require_active_access)])


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


@router.get(
    "/profile", response_model=InvestmentProfileReport, dependencies=[Depends(require_feature_flag("investment_profile"))]
)
async def get_investment_profile(
    period_start: datetime,
    period_end: datetime,
    repo_ids: list[UUID] = Depends(get_repo_ids_for_scope),
    db: AsyncSession = Depends(get_db),
) -> InvestmentProfileReport:
    """Phase 7: pass `service_id` instead of `repo_id` to scope by a named
    multi-repo Service — see get_repo_ids_for_scope."""
    profile = await compute_investment_profile(db, repo_ids, period_start, period_end)
    total_categorized_lines = sum(profile.lines_by_category.values())
    total_lines = total_categorized_lines + profile.uncategorized_lines

    categories = [
        InvestmentCategoryEntry(
            category=cat,
            ticket_count=len(profile.tickets_by_category[cat]),
            code_change_lines=profile.lines_by_category[cat],
            pct_of_categorized_lines=profile.pct_of_categorized(cat) or 0.0,
            target_pct=INVESTMENT_PROFILE_TARGETS[cat],
        )
        for cat in profile.lines_by_category
    ]

    m = await compute_efficiency_metrics(db, repo_ids, period_start, period_end)

    return InvestmentProfileReport(
        period_start=period_start,
        period_end=period_end,
        categories=categories,
        uncategorized_code_change_lines=profile.uncategorized_lines,
        uncategorized_pct_of_total=round(100 * profile.uncategorized_lines / total_lines, 1) if total_lines else 0.0,
        inefficiency_pool_pct=m.rework_rate_pct,
    )
