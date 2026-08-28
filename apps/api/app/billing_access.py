"""
Trial + paywall enforcement: the actual gate deciding whether a workspace's
data-serving endpoints respond or 402. Every workspace starts on a real,
timestamped 2-day trial (`Workspace.trial_ends_at`, set once at creation —
see app/routers/github_app.py::_handle_installation_created) rather than
staying on an unlimited implicit free tier forever, which is what this repo
did before this module existed: connect a repo, use every core feature
indefinitely, never see a bill.

`require_active_access` (the FastAPI dependency routers actually use) is an
explicit per-router opt-in, not a change to the shared `get_internal_user`
every router already depends on — billing, settings, auth, and the GitHub
webhook/install flow must keep working for a trial-expired or never-paying
workspace, or there would be no way for them to ever pay. See app/main.py's
router registration for exactly which routers carry this dependency.
"""
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_internal_user
from app.db.models import User, UserRole, Workspace, WorkspacePlanTier
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession


def workspace_has_active_access(workspace: Workspace) -> bool:
    """True if this workspace should be able to use core product features
    right now — either because it has (or recently had — see the PAST_DUE
    grace-period note below) a real paid plan, or because its 2-day trial
    hasn't run out yet.

    Checking `plan_tier != FREE` rather than re-querying `Subscription`
    directly is deliberate: both billing webhook handlers
    (app/routers/billing.py's Stripe and Paystack paths) already denormalize
    the paid tier onto `Workspace.plan_tier` the moment a payment succeeds,
    specifically so reads like this one don't need a second table. A
    `PAST_DUE` subscription (a failed renewal charge) does NOT reset
    `plan_tier` back to FREE — only an actual cancellation does — so a
    workspace mid-dunning keeps access during that grace period, the same
    way Stripe itself keeps retrying a card before giving up.
    """
    if workspace.plan_tier != WorkspacePlanTier.FREE:
        return True
    if workspace.trial_ends_at is not None and workspace.trial_ends_at > datetime.now(timezone.utc):
        return True
    return False


async def require_active_access(
    user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> User:
    """Add as a router-level dependency — `APIRouter(..., dependencies=[Depends(require_active_access)])`
    — on any router that represents real product value a workspace could
    otherwise use for free forever. SUPER_ADMIN always passes (the operator
    role needs to reach every workspace's data regardless of that
    workspace's own billing state)."""
    if user.role == UserRole.SUPER_ADMIN:
        return user
    if user.workspace_id is None:
        return user  # nothing to gate — every gated endpoint below this also 400s with no workspace anyway

    workspace = await db.get(Workspace, user.workspace_id)
    if workspace is None or not workspace_has_active_access(workspace):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your free trial has ended. Subscribe from Settings -> Plan & Billing to keep using VeriSprint.",
        )
    return user
