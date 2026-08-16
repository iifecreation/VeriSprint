"""
GitHub App client: mints short-lived installation tokens and fetches
commit/PR diffs + surrounding file context. Read-only scopes only.
"""
import time

import jwt
from github import Auth, Github

from app.config import get_settings

settings = get_settings()


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
