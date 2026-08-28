"""
GitHub App install flow + webhook receiver (Step 1-2).

Read-only scopes only for MVP: Contents (read), Metadata (read), Pull requests
(read). Webhook events (push, pull_request) enqueue ingestion jobs rather than
doing the fetch inline, so we ack GitHub fast and let the worker do the I/O.

A new GitHub App installation creates a new Workspace (spec Section 11) —
one tenant per installed account/org.
"""
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.config import get_settings
from app.db.models import Repo, User, UserRole, Workspace, WorkspaceStatus
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
    elif event == "installation" and body.get("action") == "deleted":
        await _handle_installation_deleted(db, body)
    elif event == "installation" and body.get("action") in ("suspend", "unsuspend"):
        await _handle_installation_suspend_toggle(db, body)
    elif event == "installation_repositories":
        await _handle_installation_repositories(db, body)
    elif event == "push":
        await enqueue("ingest_push", body)
    elif event == "pull_request":
        await enqueue("ingest_pull_request", body)

    return {"ok": True}


async def _handle_installation_created(db: AsyncSession, body: dict) -> None:
    installation = body["installation"]
    result = await db.execute(
        select(Workspace).where(Workspace.github_installation_id == installation["id"])
    )
    if result.scalar_one_or_none() is not None:
        return

    account_login = installation["account"]["login"]
    workspace = Workspace(
        name=account_login,
        github_installation_id=installation["id"],
        account_login=account_login,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=settings.trial_days),
    )
    db.add(workspace)
    await db.flush()  # populate workspace.id (client-side uuid4 default) for the FK below

    # The webhook's top-level `sender` is whoever clicked "Install" — link them
    # as the workspace's first WORKSPACE_ADMIN so RBAC has an owner from minute
    # one, without waiting on a separate GitHub OAuth login round trip.
    sender = body.get("sender") or {}
    installer_github_id = sender.get("id")
    if installer_github_id:
        result = await db.execute(select(User).where(User.github_id == installer_github_id))
        installer = result.scalar_one_or_none()
        if installer is None:
            installer = User(
                github_id=installer_github_id,
                github_login=sender.get("login"),
                avatar_url=sender.get("avatar_url"),
                role=UserRole.WORKSPACE_ADMIN,
                workspace_id=workspace.id,
            )
            db.add(installer)
        elif installer.workspace_id is None:
            installer.workspace_id = workspace.id
            installer.role = UserRole.WORKSPACE_ADMIN
        await db.flush()
        workspace.installed_by_user_id = installer.id

    # The `installation.created` payload includes the repo list directly
    # when `repository_selection` is "selected" (verified live: GitHub does
    # NOT reliably follow up with a separate `installation_repositories`
    # event in this case — only `_handle_installation_repositories` below
    # handles that event, for when repos are added/removed *after* install).
    # An "all repositories" installation has no `repositories` key here at
    # all; those repos are only visible via the installation access token,
    # not the webhook — out of scope until Repos are actually connected
    # through the dashboard's own repo picker.
    repositories = body.get("repositories") or []
    if repositories:
        existing_ids = {
            gh_id for (gh_id,) in (
                await db.execute(select(Repo.github_repo_id).where(Repo.workspace_id == workspace.id))
            ).all()
        }
        for repo in repositories:
            if repo["id"] in existing_ids:
                continue
            db.add(Repo(workspace_id=workspace.id, github_repo_id=repo["id"], full_name=repo["full_name"]))

    await record_audit(
        db, actor=sender.get("login", "github-webhook"), workspace_id=workspace.id,
        action="integration.github_app_connected", entity_type="workspace", entity_id=str(workspace.id),
        after={
            "account_login": account_login, "github_installation_id": installation["id"],
            "repositories": [r["full_name"] for r in repositories],
        },
    )
    await db.commit()


async def _handle_installation_deleted(db: AsyncSession, body: dict) -> None:
    """GitHub App uninstalled — we lose repo access entirely. Suspend the
    workspace (not delete it) so its history/reports/audit trail survive a
    reinstall, per the append-only audit trail guarantee."""
    installation = body["installation"]
    result = await db.execute(select(Workspace).where(Workspace.github_installation_id == installation["id"]))
    workspace = result.scalar_one_or_none()
    if workspace is None:
        return

    before = {"status": workspace.status.value}
    workspace.status = WorkspaceStatus.SUSPENDED
    repos_result = await db.execute(select(Repo).where(Repo.workspace_id == workspace.id))
    for repo in repos_result.scalars().all():
        repo.is_active = False

    sender = body.get("sender") or {}
    await record_audit(
        db, actor=sender.get("login", "github-webhook"), workspace_id=workspace.id,
        action="integration.github_app_disconnected", entity_type="workspace", entity_id=str(workspace.id),
        before=before, after={"status": workspace.status.value},
    )
    await db.commit()


async def _handle_installation_suspend_toggle(db: AsyncSession, body: dict) -> None:
    installation = body["installation"]
    result = await db.execute(select(Workspace).where(Workspace.github_installation_id == installation["id"]))
    workspace = result.scalar_one_or_none()
    if workspace is None:
        return

    before = {"status": workspace.status.value}
    workspace.status = (
        WorkspaceStatus.SUSPENDED if body.get("action") == "suspend" else WorkspaceStatus.ACTIVE
    )
    sender = body.get("sender") or {}
    await record_audit(
        db, actor=sender.get("login", "github-webhook"), workspace_id=workspace.id,
        action=f"integration.github_app_{body.get('action')}ed", entity_type="workspace", entity_id=str(workspace.id),
        before=before, after={"status": workspace.status.value},
    )
    await db.commit()


async def _handle_installation_repositories(db: AsyncSession, body: dict) -> None:
    result = await db.execute(
        select(Workspace).where(Workspace.github_installation_id == body["installation"]["id"])
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        return

    sender = body.get("sender") or {}
    added = body.get("repositories_added", [])
    for repo in added:
        db.add(
            Repo(
                workspace_id=workspace.id,
                github_repo_id=repo["id"],
                full_name=repo["full_name"],
            )
        )
    if added:
        await record_audit(
            db, actor=sender.get("login", "github-webhook"), workspace_id=workspace.id,
            action="integration.repos_added", entity_type="workspace", entity_id=str(workspace.id),
            after={"full_names": [r["full_name"] for r in added]},
        )

    removed = body.get("repositories_removed", [])
    if removed:
        removed_github_ids = {r["id"] for r in removed}
        existing_result = await db.execute(
            select(Repo).where(Repo.workspace_id == workspace.id, Repo.github_repo_id.in_(removed_github_ids))
        )
        removed_full_names = []
        for repo in existing_result.scalars().all():
            repo.is_active = False
            removed_full_names.append(repo.full_name)
        if removed_full_names:
            await record_audit(
                db, actor=sender.get("login", "github-webhook"), workspace_id=workspace.id,
                action="integration.repos_removed", entity_type="workspace", entity_id=str(workspace.id),
                after={"full_names": removed_full_names},
            )

    await db.commit()


@router.get("/install")
async def install_redirect() -> RedirectResponse:
    """The marketing site's "Connect a repo" buttons link straight to this
    URL as a plain `<a href>` — it has to issue a real HTTP redirect (not a
    JSON body describing where to go) or clicking through does nothing but
    show raw JSON instead of landing on GitHub's install screen. Uses the
    App's URL *slug* (GITHUB_APP_SLUG), not GITHUB_APP_ID — those are two
    different values; the numeric ID doesn't work in this URL."""
    if not settings.github_app_slug:
        # No app configured in this environment (local dev without a real
        # GitHub App yet) — send people somewhere that explains why, instead
        # of a broken/blank github.com URL with an empty app slug.
        return RedirectResponse(f"{settings.web_base_url}/login")
    return RedirectResponse(f"https://github.com/apps/{settings.github_app_slug}/installations/new")
