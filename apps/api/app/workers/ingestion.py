"""
Ingestion worker jobs (Step 2): triggered by GitHub webhooks. Fetches the
commit/PR diff + surrounding context, stores the raw diff in object storage,
persists Commit/PullRequest rows, then hands off to the analysis job.
"""
import re
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import Commit, Deployment, PullRequest, PullRequestReview, Repo
from app.db.session import AsyncSessionLocal
from app.integrations.github_client import fetch_commit_details, fetch_pull_request_diff
from app.integrations.object_storage import put_raw_diff

TICKET_KEY_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")


def _extract_ticket_key(text: str) -> str | None:
    match = TICKET_KEY_RE.search(text or "")
    return match.group(1) if match else None


async def ingest_push(ctx, payload: dict) -> None:
    """arq job: handle a GitHub `push` webhook event."""
    repo_full_name = payload["repository"]["full_name"]
    installation_id = payload["installation"]["id"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Repo).where(Repo.full_name == repo_full_name))
        repo = result.scalar_one_or_none()
        if repo is None:
            return  # repo not yet registered (installation webhook lagging)

        for commit_payload in payload.get("commits", []):
            existing = await db.execute(
                select(Commit).where(Commit.repo_id == repo.id, Commit.sha == commit_payload["id"])
            )
            if existing.scalar_one_or_none() is not None:
                continue

            details = fetch_commit_details(installation_id, repo_full_name, commit_payload["id"])
            object_key = f"{repo.id}/{commit_payload['id']}.diff"
            put_raw_diff(object_key, details["diff"])

            # The push payload's own added/modified/removed lists are the
            # commit's *tree-diff* paths; GitHub's Commit API `files` list
            # (details["file_paths"]) is the authoritative source we already
            # paid the API call for — prefer it, falling back to the webhook
            # payload only if the API returned nothing (e.g. a huge commit
            # GitHub truncates the files list for).
            touched_paths = details["file_paths"] or (
                commit_payload.get("added", []) + commit_payload.get("modified", []) + commit_payload.get("removed", [])
            )
            commit = Commit(
                repo_id=repo.id,
                sha=commit_payload["id"],
                author_github_login=commit_payload.get("author", {}).get("username", "unknown"),
                message=commit_payload["message"],
                committed_at=datetime.fromisoformat(commit_payload["timestamp"]).astimezone(timezone.utc),
                raw_diff_object_key=object_key,
                files_changed=len(touched_paths),
                additions=details["additions"],
                deletions=details["deletions"],
                touched_file_paths=touched_paths,
                linked_ticket_key=_extract_ticket_key(commit_payload["message"]),
                status="ingested",
            )
            db.add(commit)
            await db.flush()

            from app.queue.client import enqueue

            await enqueue("analyze_commit", str(commit.id))

        await db.commit()


async def ingest_pull_request(ctx, payload: dict) -> None:
    """arq job: handle a GitHub `pull_request` webhook event."""
    action = payload.get("action")
    if action not in ("opened", "edited", "synchronize", "closed", "review_requested"):
        return

    repo_full_name = payload["repository"]["full_name"]
    installation_id = payload["installation"]["id"]
    pr_payload = payload["pull_request"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Repo).where(Repo.full_name == repo_full_name))
        repo = result.scalar_one_or_none()
        if repo is None:
            return

        existing = await db.execute(
            select(PullRequest).where(PullRequest.repo_id == repo.id, PullRequest.number == pr_payload["number"])
        )
        pr = existing.scalar_one_or_none()
        title = pr_payload["title"]
        body = pr_payload.get("body") or ""
        ticket_key = _extract_ticket_key(title) or _extract_ticket_key(body)
        # Present on every `pull_request` delivery regardless of action —
        # GitHub's own diff stats, not re-derived from synthetic Commit rows.
        additions = pr_payload.get("additions", 0) or 0
        deletions = pr_payload.get("deletions", 0) or 0
        changed_files = pr_payload.get("changed_files", 0) or 0
        closed_at = (
            datetime.fromisoformat(pr_payload["closed_at"]).astimezone(timezone.utc)
            if pr_payload.get("closed_at")
            else None
        )
        merge_commit_sha = pr_payload.get("merge_commit_sha") if pr_payload.get("merged") else None

        if pr is None:
            pr = PullRequest(
                repo_id=repo.id,
                number=pr_payload["number"],
                title=title,
                author_github_login=pr_payload["user"]["login"],
                state="merged" if pr_payload.get("merged") else pr_payload["state"],
                merged_at=(
                    datetime.fromisoformat(pr_payload["merged_at"]).astimezone(timezone.utc)
                    if pr_payload.get("merged_at")
                    else None
                ),
                opened_at=datetime.fromisoformat(pr_payload["created_at"]).astimezone(timezone.utc),
                closed_at=closed_at,
                body=body,
                linked_ticket_key=ticket_key,
                additions=additions,
                deletions=deletions,
                changed_files=changed_files,
                merge_commit_sha=merge_commit_sha,
                first_review_requested_at=datetime.now(timezone.utc) if action == "review_requested" else None,
            )
            db.add(pr)
        else:
            pr.title = title
            pr.state = "merged" if pr_payload.get("merged") else pr_payload["state"]
            pr.body = body
            pr.linked_ticket_key = ticket_key or pr.linked_ticket_key
            pr.additions = additions
            pr.deletions = deletions
            pr.changed_files = changed_files
            pr.closed_at = closed_at or pr.closed_at
            pr.merge_commit_sha = merge_commit_sha or pr.merge_commit_sha
            if action == "review_requested" and pr.first_review_requested_at is None:
                pr.first_review_requested_at = datetime.now(timezone.utc)

        await db.flush()

        if action in ("opened", "synchronize"):
            diff = fetch_pull_request_diff(installation_id, repo_full_name, pr_payload["number"])
            object_key = f"{repo.id}/pr-{pr_payload['number']}-{pr_payload['head']['sha']}.diff"
            put_raw_diff(object_key, diff)
            # PR-level diffs are analyzed as a synthetic "commit" so they flow
            # through the same EvidenceItem pipeline as push-triggered commits.
            commit = Commit(
                repo_id=repo.id,
                pull_request_id=pr.id,
                sha=pr_payload["head"]["sha"],
                author_github_login=pr_payload["user"]["login"],
                message=f"{title}\n\n{body}",
                committed_at=datetime.now(timezone.utc),
                raw_diff_object_key=object_key,
                linked_ticket_key=ticket_key,
                status="ingested",
            )
            db.add(commit)
            await db.flush()

            from app.queue.client import enqueue

            await enqueue("analyze_commit", str(commit.id))

        await db.commit()


async def ingest_pull_request_review(ctx, payload: dict) -> None:
    """arq job: handle a GitHub `pull_request_review` webhook event — the
    source of PR Pickup Time, PR Review Time, and Review Depth (app/metrics.py).
    Only `submitted` reviews carry a real `submitted_at`; `dismissed`/`edited`
    actions touch a review we already have and aren't re-ingested here."""
    if payload.get("action") != "submitted":
        return

    repo_full_name = payload["repository"]["full_name"]
    review_payload = payload["review"]
    pr_payload = payload["pull_request"]

    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(select(Repo).where(Repo.full_name == repo_full_name))
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            return

        pr_result = await db.execute(
            select(PullRequest).where(PullRequest.repo_id == repo.id, PullRequest.number == pr_payload["number"])
        )
        pr = pr_result.scalar_one_or_none()
        if pr is None:
            return  # review arrived before the pull_request webhook that would have created this row — rare, not worth guessing a PR into existence for

        existing = await db.execute(
            select(PullRequestReview).where(PullRequestReview.github_review_id == review_payload["id"])
        )
        if existing.scalar_one_or_none() is not None:
            return

        db.add(
            PullRequestReview(
                pull_request_id=pr.id,
                github_review_id=review_payload["id"],
                reviewer_github_login=review_payload["user"]["login"],
                state=review_payload["state"],  # approved | changes_requested | commented
                submitted_at=datetime.fromisoformat(review_payload["submitted_at"]).astimezone(timezone.utc),
            )
        )
        await db.commit()


async def ingest_deployment_status(ctx, payload: dict) -> None:
    """arq job: handle a GitHub `deployment_status` webhook event — the real,
    non-guessed basis for Change Failure Rate and Mean Time to Restore (see
    app/benchmarks.py, app/metrics.py). Only fires for repos that actually
    use the GitHub Deployments API (Actions/Releases-based deploys); repos
    that don't simply never populate this table."""
    repo_full_name = payload["repository"]["full_name"]
    deployment_payload = payload["deployment"]
    status_payload = payload["deployment_status"]
    state = status_payload["state"]  # pending | success | failure | error | ...

    async with AsyncSessionLocal() as db:
        repo_result = await db.execute(select(Repo).where(Repo.full_name == repo_full_name))
        repo = repo_result.scalar_one_or_none()
        if repo is None:
            return

        existing = await db.execute(
            select(Deployment).where(
                Deployment.repo_id == repo.id, Deployment.github_deployment_id == deployment_payload["id"]
            )
        )
        deployment = existing.scalar_one_or_none()
        is_terminal = state in ("success", "failure", "error")
        resolved_at = (
            datetime.fromisoformat(status_payload["created_at"]).astimezone(timezone.utc) if is_terminal else None
        )

        if deployment is None:
            db.add(
                Deployment(
                    repo_id=repo.id,
                    github_deployment_id=deployment_payload["id"],
                    environment=deployment_payload.get("environment") or "production",
                    sha=deployment_payload["sha"],
                    state=state,
                    created_at_gh=datetime.fromisoformat(deployment_payload["created_at"]).astimezone(timezone.utc),
                    resolved_at_gh=resolved_at,
                )
            )
        else:
            deployment.state = state
            if resolved_at is not None:
                deployment.resolved_at_gh = resolved_at

        await db.commit()
