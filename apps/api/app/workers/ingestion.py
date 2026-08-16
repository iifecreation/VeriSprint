"""
Ingestion worker jobs (Step 2): triggered by GitHub webhooks. Fetches the
commit/PR diff + surrounding context, stores the raw diff in object storage,
persists Commit/PullRequest rows, then hands off to the analysis job.
"""
import re
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import Commit, PullRequest, Repo
from app.db.session import AsyncSessionLocal
from app.integrations.github_client import fetch_commit_diff, fetch_pull_request_diff
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

            diff = fetch_commit_diff(installation_id, repo_full_name, commit_payload["id"])
            object_key = f"{repo.id}/{commit_payload['id']}.diff"
            put_raw_diff(object_key, diff)

            commit = Commit(
                repo_id=repo.id,
                sha=commit_payload["id"],
                author_github_login=commit_payload.get("author", {}).get("username", "unknown"),
                message=commit_payload["message"],
                committed_at=datetime.fromisoformat(commit_payload["timestamp"]).astimezone(timezone.utc),
                raw_diff_object_key=object_key,
                files_changed=len(commit_payload.get("added", []) + commit_payload.get("modified", []) + commit_payload.get("removed", [])),
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
    if action not in ("opened", "edited", "synchronize", "closed"):
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
                body=body,
                linked_ticket_key=ticket_key,
            )
            db.add(pr)
        else:
            pr.title = title
            pr.state = "merged" if pr_payload.get("merged") else pr_payload["state"]
            pr.body = body
            pr.linked_ticket_key = ticket_key or pr.linked_ticket_key

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
