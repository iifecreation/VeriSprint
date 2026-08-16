"""
GitHub App install flow + webhook receiver (Step 1-2).

Read-only scopes only for MVP: Contents (read), Metadata (read), Pull requests
(read). Webhook events (push, pull_request) enqueue ingestion jobs rather than
doing the fetch inline, so we ack GitHub fast and let the worker do the I/O.
"""
import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Installation, Repo
from app.db.session import get_db
from app.queue.client import enqueue

router = APIRouter(prefix="/github", tags=["github-app"])
settings = get_settings()


def _verify_signature(payload: bytes, signature_header: str | None) -> None:
    if not settings.github_webhook_secret:
        # Explicit opt-out only in local dev when no secret is configured yet.
        return
    if not signature_header:
        raise HTTPException(status_code=401, detail="Missing X-Hub-Signature-256")
    expected = "sha256=" + hmac.new(
        settings.github_webhook_secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


@router.post("/webhook")
async def github_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    payload = await request.body()
    _verify_signature(payload, request.headers.get("X-Hub-Signature-256"))
    event = request.headers.get("X-GitHub-Event", "")
    body = json.loads(payload)

    if event == "installation" and body.get("action") == "created":
        await _handle_installation_created(db, body)
    elif event == "installation_repositories":
        await _handle_repos_added(db, body)
    elif event == "push":
        await enqueue("ingest_push", body)
    elif event == "pull_request":
        await enqueue("ingest_pull_request", body)

    return {"ok": True}


async def _handle_installation_created(db: AsyncSession, body: dict) -> None:
    installation = body["installation"]
    result = await db.execute(
        select(Installation).where(
            Installation.github_installation_id == installation["id"]
        )
    )
    if result.scalar_one_or_none() is None:
        db.add(
            Installation(
                github_installation_id=installation["id"],
                account_login=installation["account"]["login"],
            )
        )
        await db.commit()


async def _handle_repos_added(db: AsyncSession, body: dict) -> None:
    result = await db.execute(
        select(Installation).where(
            Installation.github_installation_id == body["installation"]["id"]
        )
    )
    installation = result.scalar_one_or_none()
    if installation is None:
        return
    for repo in body.get("repositories_added", []):
        db.add(
            Repo(
                installation_id=installation.id,
                github_repo_id=repo["id"],
                full_name=repo["full_name"],
            )
        )
    await db.commit()


@router.get("/install")
async def install_redirect() -> dict:
    """Front end links here to kick off the GitHub App install flow."""
    return {
        "install_url": f"https://github.com/apps/{settings.github_app_id}/installations/new"
    }
