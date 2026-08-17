"""
PR AutoRoute (Phase 3 competitor-parity): suggests reviewers for an open PR
based on who has real, recent history touching the same files — via the
Evidence Ledger's per-file evidence, joined back to commit authorship. Not a
guess at expertise; a real "who else has worked in these files" lookup.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user, require_feature_flag
from app.db.models import Commit, EvidenceItem, PullRequest, Repo, User
from app.db.session import get_db
from app.schemas import PRAutoRouteResult, PullRequestOut, ReviewerSuggestion

router = APIRouter(prefix="/pr-autoroute", tags=["pr-autoroute"])

LOOKBACK_REVIEWERS_PER_FILE = 3


@router.get(
    "/pull-requests",
    response_model=list[PullRequestOut],
    dependencies=[Depends(require_feature_flag("pr_autoroute"))],
)
async def list_recent_pull_requests(
    repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)
) -> list[PullRequest]:
    """Real, recent PRs to pick from before asking for reviewer suggestions —
    without this, the feature has no way to know which PR you mean."""
    result = await db.execute(select(PullRequest).where(PullRequest.repo_id == repo.id).order_by(PullRequest.opened_at.desc()).limit(50))
    return list(result.scalars().all())


@router.get(
    "/{pull_request_id}/suggest",
    response_model=PRAutoRouteResult,
    dependencies=[Depends(require_feature_flag("pr_autoroute"))],
)
async def suggest_reviewers(
    pull_request_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> PRAutoRouteResult:
    pr = await db.get(PullRequest, pull_request_id)
    if pr is None:
        raise HTTPException(status_code=404, detail="Pull request not found")
    repo = await db.get(Repo, pr.repo_id)
    if repo is not None:
        ensure_workspace_access(user, repo.workspace_id)

    # Real files this PR's own commits touched, via their EvidenceItems.
    files_result = await db.execute(
        select(EvidenceItem.file_path)
        .join(Commit, Commit.id == EvidenceItem.commit_id)
        .where(Commit.pull_request_id == pr.id, EvidenceItem.file_path.is_not(None))
        .distinct()
    )
    file_paths = [f for (f,) in files_result.all()]

    suggestions: list[ReviewerSuggestion] = []
    all_suggested: dict[str, int] = {}
    for file_path in file_paths:
        history_result = await db.execute(
            select(Commit.author_github_login, func.count())
            .join(EvidenceItem, EvidenceItem.commit_id == Commit.id)
            .where(
                Commit.repo_id == pr.repo_id,
                EvidenceItem.file_path == file_path,
                Commit.author_github_login != pr.author_github_login,  # exclude the PR's own author
            )
            .group_by(Commit.author_github_login)
            .order_by(func.count().desc())
            .limit(LOOKBACK_REVIEWERS_PER_FILE)
        )
        reviewers = [author for author, _ in history_result.all()]
        if reviewers:
            suggestions.append(
                ReviewerSuggestion(file_path=file_path, suggested_reviewers=reviewers, basis="most commits touching this file, excluding the PR author")
            )
            for r in reviewers:
                all_suggested[r] = all_suggested.get(r, 0) + 1

    top_reviewers = sorted(all_suggested, key=lambda r: all_suggested[r], reverse=True)[:3]

    return PRAutoRouteResult(pr_number=pr.number, suggestions=suggestions, top_suggested_reviewers=top_reviewers)
