"""
PR Workflow Automation (Phase 4 competitor-parity — VeriSprint's equivalent
of gitStream's "PR-policy-as-code" + auto-approve): runs on every opened/
synchronized PR webhook, classifies it via the fixed rule set in
app/pr_policy.py, and takes real, auditable GitHub writes — labeling,
reviewer auto-assignment, and (most conservatively gated) auto-approval of
narrowly-safe changes. Each of the three capabilities is behind its own
FeatureFlag, default off: pr_policy_labeling, pr_policy_reviewer_assignment,
pr_policy_auto_approve. Every write actually made is recorded in the audit
trail — this never silently touches a customer's repo.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.audit import record_audit
from app.db.models import Commit, PullRequest, Repo, Workspace
from app.db.session import AsyncSessionLocal
from app.feature_flags import is_feature_enabled
from app.integrations.github_client import (
    add_labels,
    approve_pull_request,
    fetch_pull_request_files,
    request_reviewers,
)
from app.pr_policy import classify_pull_request

LOOKBACK_REVIEWERS_PER_FILE = 3
REVIEWER_HISTORY_LOOKBACK_DAYS = 180


async def apply_pr_policy(ctx, payload: dict) -> None:
    action = payload.get("action")
    if action not in ("opened", "synchronize"):
        return

    repo_full_name = payload["repository"]["full_name"]
    installation_id = payload["installation"]["id"]
    pr_payload = payload["pull_request"]
    pr_number = pr_payload["number"]
    head_sha = pr_payload["head"]["sha"]
    author = pr_payload["user"]["login"]

    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(select(Repo).where(Repo.full_name == repo_full_name))
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            return
        workspace = await db.get(Workspace, repo.workspace_id)
        if workspace is None:
            return

        labeling_on = await is_feature_enabled(db, key="pr_policy_labeling", workspace=workspace)
        reviewer_on = await is_feature_enabled(db, key="pr_policy_reviewer_assignment", workspace=workspace)
        approve_on = await is_feature_enabled(db, key="pr_policy_auto_approve", workspace=workspace)
        if not (labeling_on or reviewer_on or approve_on):
            return  # nothing enabled for this workspace — don't even fetch PR files

        pr_result = await db.execute(
            select(PullRequest).where(PullRequest.repo_id == repo.id, PullRequest.number == pr_number)
        )
        pr = pr_result.scalar_one_or_none()
        if pr is None:
            # ingest_pull_request handles this same webhook delivery and may
            # not have created the row yet in whichever order the two jobs
            # happen to run — nothing to attach decisions to this time; the
            # PR's next synchronize event (or this one, retried) catches up.
            return

        touched_file_paths = fetch_pull_request_files(installation_id, repo_full_name, pr_number)
        total_changed_lines = pr.additions + pr.deletions

        prior_merged_count = await db.scalar(
            select(func.count()).select_from(PullRequest).where(
                PullRequest.repo_id == repo.id, PullRequest.author_github_login == author,
                PullRequest.state == "merged", PullRequest.id != pr.id,
            )
        )

        decision = classify_pull_request(
            touched_file_paths=touched_file_paths,
            total_changed_lines=total_changed_lines,
            is_new_contributor=(prior_merged_count or 0) == 0,
        )

        actions_taken: dict = {}

        if labeling_on and decision.labels:
            already = pr.policy_labels_applied or []
            new_labels = [label for label in decision.labels if label not in already]
            if new_labels:
                add_labels(installation_id, repo_full_name, pr_number, new_labels)
                pr.policy_labels_applied = already + new_labels
                actions_taken["labels_added"] = new_labels

        if reviewer_on:
            suggested = await _suggest_reviewers(db, repo.id, touched_file_paths, author)
            already = pr.policy_reviewers_requested or []
            new_reviewers = [r for r in suggested if r not in already]
            if new_reviewers:
                request_reviewers(installation_id, repo_full_name, pr_number, new_reviewers)
                pr.policy_reviewers_requested = already + new_reviewers
                actions_taken["reviewers_requested"] = new_reviewers

        if approve_on and decision.is_safe_to_auto_approve and pr.policy_auto_approved_sha != head_sha:
            approve_pull_request(
                installation_id, repo_full_name, pr_number,
                "Auto-approved by VeriSprint: this PR only touches non-functional files "
                f"within {total_changed_lines} changed lines. This adds one approving review — "
                "it doesn't bypass this repo's required-review count or branch protection rules.",
            )
            pr.policy_auto_approved_sha = head_sha
            actions_taken["auto_approved_sha"] = head_sha

        if actions_taken:
            await record_audit(
                db, actor="system", action="pr_policy.applied", entity_type="pull_request",
                entity_id=str(pr.id), repo_id=repo.id, workspace_id=repo.workspace_id, after=actions_taken,
            )

        await db.commit()


async def _suggest_reviewers(db, repo_id, touched_file_paths: list[str], author: str) -> list[str]:
    """Same basis as PR AutoRoute (app/routers/pr_autoroute.py) — most
    commits touching each file, excluding the PR's own author — but matched
    in Python against Commit.touched_file_paths (Phase 3's JSON column)
    rather than EvidenceItem's sparse, LLM-selected subset, since this has
    to work before (or without) analysis ever running."""
    if not touched_file_paths:
        return []
    touched_set = set(touched_file_paths)
    cutoff = datetime.now(timezone.utc) - timedelta(days=REVIEWER_HISTORY_LOOKBACK_DAYS)
    commits_result = await db.execute(
        select(Commit.author_github_login, Commit.touched_file_paths).where(
            Commit.repo_id == repo_id, Commit.author_github_login != author, Commit.committed_at >= cutoff
        )
    )
    counts: dict[str, int] = {}
    for commit_author, paths in commits_result.all():
        if touched_set & set(paths or []):
            counts[commit_author] = counts.get(commit_author, 0) + 1
    return sorted(counts, key=lambda a: counts[a], reverse=True)[:LOOKBACK_REVIEWERS_PER_FILE]
