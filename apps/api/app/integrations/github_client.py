"""
GitHub App client: mints short-lived installation tokens and fetches
commit/PR diffs + surrounding file context. Mostly read-only scopes —
Pull requests (write) and Issues (write) were added in Phase 4 for PR
Workflow Automation (see app/pr_policy.py, app/workers/pr_policy.py): adding
labels, requesting reviewers, and auto-approving narrowly-safe PRs. Every
write function below is called only from behind its own FeatureFlag,
default off.
"""
import time

import jwt
from github import Auth, Github
from github.GithubException import GithubException

from app.config import get_settings

settings = get_settings()

# Fixed label set + colors applied by PR Workflow Automation — same labels
# for every workspace, not per-workspace configurable yet. Matches the
# classification labels app/pr_policy.py can return.
_POLICY_LABEL_COLORS = {
    "new-contributor": "0E8A16",
    "missing-tests": "D93F0B",
    "needs-security-review": "B60205",
    "large-pr": "FBCA04",
    "safe-changes": "0052CC",
}


def _app_jwt() -> str:
    """Sign a short-lived JWT as the GitHub App itself (used to mint installation tokens)."""
    now = int(time.time())
    payload = {"iat": now - 60, "exp": now + 9 * 60, "iss": settings.github_app_id}
    return jwt.encode(payload, settings.github_app_private_key, algorithm="RS256")


def get_installation_client(installation_id: int) -> Github:
    auth = Auth.AppAuth(settings.github_app_id, settings.github_app_private_key).get_installation_auth(
        installation_id
    )
    return Github(auth=auth)


def fetch_commit_diff(installation_id: int, repo_full_name: str, sha: str) -> str:
    """Fetch the unified diff for a single commit."""
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    commit = repo.get_commit(sha)
    return "\n".join(f.patch or "" for f in commit.files if f.patch)


def fetch_commit_details(installation_id: int, repo_full_name: str, sha: str) -> dict:
    """
    Same GitHub Commit API call as fetch_commit_diff, but also returns the
    real additions/deletions/file-path stats GitHub already computes per
    file — needed for PR Size, Rework Rate, and Refactor Rate (app/metrics.py)
    without a second round-trip for the same commit.
    """
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    commit = repo.get_commit(sha)
    files = list(commit.files)
    return {
        "diff": "\n".join(f.patch or "" for f in files if f.patch),
        "additions": sum(f.additions for f in files),
        "deletions": sum(f.deletions for f in files),
        "file_paths": [f.filename for f in files],
    }


def fetch_pull_request_diff(installation_id: int, repo_full_name: str, number: int) -> str:
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    pr = repo.get_pull(number)
    return "\n".join(f.patch or "" for f in pr.get_files() if f.patch)


def fetch_repo_tree(installation_id: int, repo_full_name: str, branch: str) -> list[str]:
    """
    Real file paths from the repo's default branch, via the Git Trees API
    (recursive) — used by the Onboarding Doc Generator so the doc reflects
    the codebase's actual structure rather than an assumed one.
    """
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    branch_ref = repo.get_branch(branch)
    tree = repo.get_git_tree(branch_ref.commit.sha, recursive=True)
    return [entry.path for entry in tree.tree if entry.type == "blob"]


def fetch_pull_request_files(installation_id: int, repo_full_name: str, number: int) -> list[str]:
    """Just the touched file paths for a PR — the fast, LLM-independent input
    app/pr_policy.py classifies on. Separate from fetch_pull_request_diff,
    which fetches full patch text for the (slower, LLM-dependent) evidence
    pipeline; this needs only filenames."""
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    pr = repo.get_pull(number)
    return [f.filename for f in pr.get_files()]


def add_labels(installation_id: int, repo_full_name: str, pr_number: int, labels: list[str]) -> None:
    """Adds labels to a PR, auto-creating any that don't exist in the repo
    yet — GitHub's Issues API 404s on an unrecognized label name rather than
    creating it on the fly, so this checks/creates first."""
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    for label in labels:
        try:
            repo.get_label(label)
        except GithubException as exc:
            if exc.status != 404:
                raise
            repo.create_label(name=label, color=_POLICY_LABEL_COLORS.get(label, "999999"))
    issue = repo.get_issue(pr_number)  # PRs share the Issues API for labels
    issue.add_to_labels(*labels)


def request_reviewers(installation_id: int, repo_full_name: str, pr_number: int, reviewers: list[str]) -> None:
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    pr = repo.get_pull(pr_number)
    pr.create_review_request(reviewers=reviewers)


def approve_pull_request(installation_id: int, repo_full_name: str, pr_number: int, body: str) -> None:
    """Adds one approving review as the GitHub App's own bot identity — the
    same thing a human reviewer clicking "Approve" would do. Does NOT bypass
    a repo's required-review count or branch protection rules; it only
    contributes one review toward them."""
    gh = get_installation_client(installation_id)
    repo = gh.get_repo(repo_full_name)
    pr = repo.get_pull(pr_number)
    pr.create_review(body=body, event="APPROVE")
