"""
Git Efficiency & Quality Metrics (Phase 3 competitor-parity): the PR-level
leading indicators — PR Size, Cycle Time broken into Coding/Pickup/Review/
Deploy Time, Merge Frequency, Review Depth, PRs Merged Without Review,
Rework Rate, Refactor Rate — plus Change Failure Rate and MTTR, computed from
real `PullRequest`/`Commit`/`PullRequestReview`/`Deployment` rows. Everything
here is either a direct read of GitHub's own numbers (additions/deletions,
review timestamps, deployment state) or an explicitly-documented heuristic
over them — never an LLM guess, and never silently fabricated when the
underlying data isn't there (a metric with nothing to compute from returns
`None`, same discipline as DORAMetrics' historical CFR/MTTR null).

Rework Rate and Refactor Rate in particular are approximations: a byte-exact
version needs real `git blame` against a full clone, which this codebase
doesn't keep (commits are ingested as diffs via the GitHub API, not a clone).
What's here instead is a file-level proxy, documented at each function.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Commit, Deployment, PullRequest, PullRequestReview

REWORK_LOOKBACK_DAYS = 21


class EfficiencyMetrics:
    """Plain data holder — see app/schemas.py's EfficiencyReport for the API shape this feeds."""

    def __init__(self) -> None:
        self.merged_pr_count: int = 0
        self.coding_time_hours: float | None = None
        self.pr_pickup_time_hours: float | None = None
        self.pr_review_time_hours: float | None = None
        self.deploy_time_hours: float | None = None
        self.cycle_time_hours: float | None = None
        self.merge_frequency_per_dev_per_week: float | None = None
        self.pr_size_lines: float | None = None
        self.review_depth_per_pr: float | None = None
        self.prs_merged_without_review_pct: float | None = None
        self.rework_rate_pct: float | None = None
        self.refactor_rate_pct: float | None = None
        self.change_failure_rate_pct: float | None = None
        self.mttr_hours: float | None = None


def _avg(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


async def compute_efficiency_metrics(
    db: AsyncSession,
    repo_ids: list[UUID],
    period_start: datetime,
    period_end: datetime,
    author_logins: list[str] | None = None,
) -> EfficiencyMetrics:
    """
    `author_logins` (Phase 6/7 — People/Team segmentation, alongside the
    existing Repo/Service filter every panel already has): scopes PR-level
    metrics to these GitHub logins' own PRs, and Rework/Refactor Rate to
    their own commits — one login for a person filter, several for a team.
    Change Failure Rate and MTTR are never person/team-scoped — a deployment
    isn't authored by one developer — so they're always computed repo-wide
    regardless of this parameter.
    """
    metrics = EfficiencyMetrics()
    if not repo_ids:
        return metrics

    pr_filters = [
        PullRequest.repo_id.in_(repo_ids),
        PullRequest.state == "merged",
        PullRequest.merged_at.is_not(None),
        PullRequest.merged_at >= period_start,
        PullRequest.merged_at <= period_end,
    ]
    if author_logins:
        pr_filters.append(PullRequest.author_github_login.in_(author_logins))
    prs_result = await db.execute(select(PullRequest).where(*pr_filters))
    prs = list(prs_result.scalars().all())
    metrics.merged_pr_count = len(prs)
    # CFR/MTTR (Deployment-backed) and Rework/Refactor Rate (Commit-backed)
    # don't depend on there being any merged PRs in the period at all — a
    # repo that pushes straight to main, or a period with commits but no
    # merges, still has real data to compute these from. Only PR Size,
    # Cycle/Pickup/Review/Deploy Time, Merge Frequency, and Review Depth
    # genuinely need at least one merged PR.
    metrics.change_failure_rate_pct, metrics.mttr_hours = await _compute_cfr_mttr(db, repo_ids, period_start, period_end)
    metrics.rework_rate_pct, metrics.refactor_rate_pct = await _compute_rework_and_refactor_rate(
        db, repo_ids, period_start, period_end, author_logins=author_logins
    )
    if not prs:
        return metrics

    pr_ids = [pr.id for pr in prs]

    # First real commit per PR (committed_at ascending) — the push-ingested
    # commits that actually carry a timestamp before the PR existed, not the
    # synthetic per-PR commit `ingest_pull_request` creates at ingestion time.
    commits_result = await db.execute(
        select(Commit.pull_request_id, Commit.committed_at)
        .where(Commit.pull_request_id.in_(pr_ids))
        .order_by(Commit.pull_request_id, Commit.committed_at)
    )
    first_commit_at: dict[UUID, datetime] = {}
    for pr_id, committed_at in commits_result.all():
        if pr_id not in first_commit_at:
            first_commit_at[pr_id] = committed_at

    reviews_result = await db.execute(
        select(PullRequestReview.pull_request_id, PullRequestReview.submitted_at)
        .where(PullRequestReview.pull_request_id.in_(pr_ids))
        .order_by(PullRequestReview.pull_request_id, PullRequestReview.submitted_at)
    )
    reviews_by_pr: dict[UUID, list[datetime]] = defaultdict(list)
    review_count_by_pr: dict[UUID, int] = defaultdict(int)
    for pr_id, submitted_at in reviews_result.all():
        reviews_by_pr[pr_id].append(submitted_at)
        review_count_by_pr[pr_id] += 1

    coding_times, pickup_times, review_times, cycle_times, sizes = [], [], [], [], []
    authors: set[str] = set()
    reviewed_pr_count = 0

    for pr in prs:
        authors.add(pr.author_github_login)
        sizes.append(float(pr.additions + pr.deletions))

        start = first_commit_at.get(pr.id)
        if start is not None:
            if pr.opened_at >= start:
                coding_times.append((pr.opened_at - start).total_seconds() / 3600)
            if pr.merged_at is not None and pr.merged_at >= start:
                cycle_times.append((pr.merged_at - start).total_seconds() / 3600)

        first_review_at = reviews_by_pr.get(pr.id, [None])[0]
        if first_review_at is not None:
            reviewed_pr_count += 1
            if first_review_at >= pr.opened_at:
                pickup_times.append((first_review_at - pr.opened_at).total_seconds() / 3600)
            if pr.merged_at is not None and pr.merged_at >= first_review_at:
                review_times.append((pr.merged_at - first_review_at).total_seconds() / 3600)

    metrics.coding_time_hours = _avg(coding_times)
    metrics.pr_pickup_time_hours = _avg(pickup_times)
    metrics.pr_review_time_hours = _avg(review_times)
    metrics.cycle_time_hours = _avg(cycle_times)
    metrics.pr_size_lines = _avg(sizes)
    metrics.review_depth_per_pr = round(sum(review_count_by_pr.values()) / len(prs), 2)
    metrics.prs_merged_without_review_pct = round(100 * (len(prs) - reviewed_pr_count) / len(prs), 1)

    period_weeks = max((period_end - period_start).total_seconds() / (86400 * 7), 1e-9)
    metrics.merge_frequency_per_dev_per_week = (
        round(len(prs) / len(authors) / period_weeks, 2) if authors else None
    )

    metrics.deploy_time_hours = await _compute_deploy_time(db, prs)

    return metrics


async def _compute_deploy_time(db: AsyncSession, merged_prs: list[PullRequest]) -> float | None:
    """Merge -> shipped-to-production, matched by merge_commit_sha. PRs this
    repo never deployed via GitHub Deployments (or that predate the field
    being tracked) simply don't contribute a sample — not averaged as zero."""
    shas = [pr.merge_commit_sha for pr in merged_prs if pr.merge_commit_sha]
    if not shas:
        return None
    result = await db.execute(
        select(Deployment.sha, Deployment.resolved_at_gh).where(
            Deployment.sha.in_(shas), Deployment.state == "success", Deployment.resolved_at_gh.is_not(None)
        )
    )
    deployed_at_by_sha: dict[str, datetime] = {}
    for sha, resolved_at in result.all():
        if sha not in deployed_at_by_sha or resolved_at < deployed_at_by_sha[sha]:
            deployed_at_by_sha[sha] = resolved_at  # earliest successful deploy of this commit

    deploy_hours = [
        (deployed_at_by_sha[pr.merge_commit_sha] - pr.merged_at).total_seconds() / 3600
        for pr in merged_prs
        if pr.merge_commit_sha in deployed_at_by_sha
        and pr.merged_at is not None
        and deployed_at_by_sha[pr.merge_commit_sha] >= pr.merged_at
    ]
    return _avg(deploy_hours)


async def _compute_cfr_mttr(
    db: AsyncSession, repo_ids: list[UUID], period_start: datetime, period_end: datetime
) -> tuple[float | None, float | None]:
    """Change Failure Rate and MTTR from real Deployment rows — both null
    when this workspace's repos have never sent a `deployment_status` event
    (see app/routers/github_app.py), not guessed from PR/commit activity."""
    result = await db.execute(
        select(Deployment)
        .where(
            Deployment.repo_id.in_(repo_ids),
            Deployment.resolved_at_gh.is_not(None),
            Deployment.resolved_at_gh >= period_start,
            Deployment.resolved_at_gh <= period_end,
        )
        .order_by(Deployment.resolved_at_gh)
    )
    deployments = list(result.scalars().all())
    if not deployments:
        return None, None

    failures = [d for d in deployments if d.state in ("failure", "error")]
    cfr = round(100 * len(failures) / len(deployments), 1)

    # For MTTR: next successful deploy, same repo+environment, after each failure.
    by_repo_env: dict[tuple[UUID, str], list[Deployment]] = defaultdict(list)
    for d in deployments:
        by_repo_env[(d.repo_id, d.environment)].append(d)

    restore_hours: list[float] = []
    for failure in failures:
        candidates = by_repo_env[(failure.repo_id, failure.environment)]
        next_success = next(
            (d for d in candidates if d.state == "success" and d.resolved_at_gh > failure.resolved_at_gh), None
        )
        if next_success is not None:
            restore_hours.append((next_success.resolved_at_gh - failure.resolved_at_gh).total_seconds() / 3600)

    return cfr, _avg(restore_hours)


async def _compute_rework_and_refactor_rate(
    db: AsyncSession,
    repo_ids: list[UUID],
    period_start: datetime,
    period_end: datetime,
    author_logins: list[str] | None = None,
) -> tuple[float | None, float | None]:
    """
    Rework Rate (heuristic): the share of this period's added lines that land
    in a file the SAME author already committed to within the prior 21 days —
    a file-level recency proxy for "modifying code I just wrote", not a true
    line-level git-blame rework rate.

    Refactor Rate (heuristic): the share of this period's changed lines
    (additions+deletions) coming from commits whose additions and deletions
    are roughly balanced (>=50% of the larger side) — a shape-based proxy for
    "restructuring code" as opposed to pure net-new or pure deletion, not a
    semantic analysis of whether logic actually changed.

    Both only consider push-ingested commits with a non-empty
    `touched_file_paths` — the synthetic per-PR commit never has one (see
    Commit.touched_file_paths), so PR-only repos with no push history simply
    return None for both rather than a misleading 0%.
    """
    lookback_start = period_start - timedelta(days=REWORK_LOOKBACK_DAYS)
    commit_filters = [
        Commit.repo_id.in_(repo_ids),
        Commit.committed_at >= lookback_start,
        Commit.committed_at <= period_end,
    ]
    # Only these authors' own commits are ever relevant — rework/refactor
    # matching is keyed by each commit's own author (see by_author below), so
    # fetching other authors' history for a scoped query would be wasted
    # rows, not a correctness issue either way.
    if author_logins:
        commit_filters.append(Commit.author_github_login.in_(author_logins))
    result = await db.execute(select(Commit).where(*commit_filters).order_by(Commit.committed_at))
    commits = [c for c in result.scalars().all() if c.touched_file_paths]
    if not commits:
        return None, None

    period_commits = [c for c in commits if c.committed_at >= period_start]
    if not period_commits:
        return None, None

    # author -> list of (committed_at, set(file_paths)) across the full lookback+period window, in order.
    by_author: dict[str, list[tuple[datetime, set[str]]]] = defaultdict(list)
    for c in commits:
        by_author[c.author_github_login].append((c.committed_at, set(c.touched_file_paths)))

    total_additions = sum(c.additions for c in period_commits) or 1  # avoid /0; additions are all-zero only for empty diffs
    rework_additions = 0
    total_changed_lines = sum(c.additions + c.deletions for c in period_commits) or 1
    refactor_lines = 0

    for commit in period_commits:
        commit_files = set(commit.touched_file_paths)
        prior = [
            files
            for committed_at, files in by_author[commit.author_github_login]
            if committed_at < commit.committed_at and committed_at >= commit.committed_at - timedelta(days=REWORK_LOOKBACK_DAYS)
        ]
        if any(commit_files & files for files in prior):
            rework_additions += commit.additions

        changed = commit.additions + commit.deletions
        if changed > 0 and commit.deletions > 0:
            balance = min(commit.additions, commit.deletions) / max(commit.additions, commit.deletions)
            if balance >= 0.5:
                refactor_lines += changed

    rework_rate = round(100 * rework_additions / total_additions, 1)
    refactor_rate = round(100 * refactor_lines / total_changed_lines, 1)
    return rework_rate, refactor_rate
