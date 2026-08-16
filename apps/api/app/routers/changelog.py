"""Visual Changelog (Phase 2 competitor-parity): merged PRs and commits, grouped by day — a real activity timeline, not a hand-curated release-notes page."""
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_repo_for_user, require_feature_flag
from app.db.models import Commit, PullRequest, Repo
from app.db.session import get_db
from app.schemas import ChangelogDay

router = APIRouter(prefix="/changelog", tags=["changelog"])


@router.get("", response_model=list[ChangelogDay], dependencies=[Depends(require_feature_flag("visual_changelog"))])
async def get_visual_changelog(
    period_start: datetime,
    period_end: datetime,
    repo: Repo = Depends(get_repo_for_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChangelogDay]:
    result = await db.execute(
        select(PullRequest).where(
            PullRequest.repo_id == repo.id,
            PullRequest.state == "merged",
            PullRequest.merged_at.is_not(None),
            PullRequest.merged_at >= period_start,
            PullRequest.merged_at <= period_end,
        )
    )
    prs = list(result.scalars().all())

    commit_counts_by_pr: dict = {}
    if prs:
        counts_result = await db.execute(
            select(Commit.pull_request_id, func.count())
            .where(Commit.pull_request_id.in_([pr.id for pr in prs]))
            .group_by(Commit.pull_request_id)
        )
        commit_counts_by_pr = dict(counts_result.all())

    by_day: dict[datetime, list[PullRequest]] = defaultdict(list)
    for pr in prs:
        day = pr.merged_at.replace(hour=0, minute=0, second=0, microsecond=0)
        by_day[day].append(pr)

    days: list[ChangelogDay] = []
    for day, day_prs in sorted(by_day.items(), reverse=True):
        commit_count = sum(commit_counts_by_pr.get(pr.id, 0) for pr in day_prs)
        days.append(
            ChangelogDay(
                day=day,
                merged_pr_count=len(day_prs),
                commit_count=commit_count,
                entries=[f"#{pr.number} {pr.title} (@{pr.author_github_login})" for pr in day_prs],
            )
        )
    return days
