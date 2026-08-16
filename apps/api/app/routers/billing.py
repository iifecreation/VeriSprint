"""
Billing (spec Section 7): Stripe Checkout for new self-serve subscriptions,
the hosted Customer Portal for self-serve plan changes/cancellation, and the
webhook that keeps `Subscription` (the detailed billing record) and
`Workspace.plan_tier`/`Workspace.mrr` (the fast, denormalized read used
everywhere else) in sync with what Stripe actually charged.

Every workspace-mutating action here is audited; `checkout`/`portal` require
WORKSPACE_ADMIN (spec: billing is explicitly out of MANAGER's scope).
"""
import logging
from datetime import datetime, timezone
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit, record_audit_for_user
from app.auth.dependencies import get_internal_user, require_role
from app.db.models import (
    Subscription,
    SubscriptionStatus,
    User,
    UserRole,
    Workspace,
    WorkspacePlanTier,
)
from app.db.session import AsyncSessionLocal, get_db
from app.feature_flags import is_feature_enabled_for_user
from app.integrations.stripe_client import (
    StripeNotConfigured,
    construct_webhook_event,
    create_billing_portal_session,
    create_checkout_session,
    monthly_amount_from_subscription,
    plan_tier_for_price_id,
)
from app.observability import record_error
from app.schemas import (
    BillingPortalRequest,
    BillingPortalResponse,
    CheckoutRequest,
    CheckoutResponse,
    ResolvedFeatureFlags,
    SubscriptionOut,
)

router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)

_require_workspace_admin = require_role(UserRole.WORKSPACE_ADMIN)

_STRIPE_STATUS_MAP: dict[str, SubscriptionStatus] = {
    "trialing": SubscriptionStatus.TRIALING,
    "active": SubscriptionStatus.ACTIVE,
    "past_due": SubscriptionStatus.PAST_DUE,
    "incomplete": SubscriptionStatus.PAST_DUE,
    "unpaid": SubscriptionStatus.PAST_DUE,
    "paused": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELED,
    "incomplete_expired": SubscriptionStatus.CANCELED,
}


async def _get_or_create_subscription(db: AsyncSession, workspace_id: UUID) -> Subscription:
    result = await db.execute(select(Subscription).where(Subscription.workspace_id == workspace_id))
    sub = result.scalar_one_or_none()
    if sub is None:
        sub = Subscription(workspace_id=workspace_id)
        db.add(sub)
        await db.flush()
    return sub


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout(
    payload: CheckoutRequest,
    admin: User = Depends(_require_workspace_admin),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    try:
        plan_tier = WorkspacePlanTier(payload.plan_tier)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown plan_tier: {payload.plan_tier}") from exc
    if plan_tier in (WorkspacePlanTier.FREE, WorkspacePlanTier.ENTERPRISE):
        raise HTTPException(status_code=400, detail=f"{plan_tier.value} isn't purchasable through checkout")

    sub = await _get_or_create_subscription(db, admin.workspace_id)
    try:
        session = create_checkout_session(
            plan_tier=plan_tier,
            workspace_id=str(admin.workspace_id),
            customer_id=sub.stripe_customer_id,
            customer_email=admin.email,
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
        )
    except (StripeNotConfigured, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message or str(exc)}") from exc

    if not session.url:
        raise HTTPException(status_code=502, detail="Stripe did not return a checkout URL")

    await record_audit_for_user(
        db, user=admin, action="billing.checkout_started", entity_type="subscription", entity_id=str(sub.id),
        after={"plan_tier": plan_tier.value},
    )
    await db.commit()
    return CheckoutResponse(checkout_url=session.url)


@router.post("/portal", response_model=BillingPortalResponse)
async def billing_portal(
    payload: BillingPortalRequest,
    admin: User = Depends(_require_workspace_admin),
    db: AsyncSession = Depends(get_db),
) -> BillingPortalResponse:
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    sub = await _get_or_create_subscription(db, admin.workspace_id)
    if not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account yet — subscribe to a plan first")

    try:
        session = create_billing_portal_session(customer_id=sub.stripe_customer_id, return_url=payload.return_url)
    except StripeNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=f"Stripe error: {exc.user_message or str(exc)}") from exc

    return BillingPortalResponse(portal_url=session.url)


@router.get("/subscription", response_model=SubscriptionOut)
async def get_subscription(
    user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Subscription:
    if user.workspace_id is None:
        raise HTTPException(status_code=404, detail="No subscription — account isn't attached to a workspace")
    sub = await _get_or_create_subscription(db, user.workspace_id)
    await db.commit()
    return sub


@router.get("/feature-flags", response_model=ResolvedFeatureFlags)
async def get_resolved_feature_flags(
    keys: str, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ResolvedFeatureFlags:
    """`keys` is a comma-separated list — the frontend nav resolves every
    Phase 2/3 flag it cares about in one call rather than one round trip each."""
    resolved = {}
    for key in [k.strip() for k in keys.split(",") if k.strip()]:
        resolved[key] = await is_feature_enabled_for_user(db, key=key, user=user)
    return ResolvedFeatureFlags(flags=resolved)


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = construct_webhook_event(payload, sig_header)
    except StripeNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid webhook signature: {exc}") from exc

    async with AsyncSessionLocal() as db:
        try:
            if event.type == "checkout.session.completed":
                await _handle_checkout_completed(db, event.data.object)
            elif event.type in ("customer.subscription.created", "customer.subscription.updated"):
                await _handle_subscription_synced(db, event.data.object)
            elif event.type == "customer.subscription.deleted":
                await _handle_subscription_deleted(db, event.data.object)
            elif event.type == "invoice.payment_failed":
                await _handle_payment_failed(db, event.data.object)
        except Exception as exc:
            logger.exception("Stripe webhook handler failed for event %s (%s)", event.id, event.type)
            await record_error(source="billing", message=f"Webhook {event.type} ({event.id}) failed: {exc}")
            # 200 anyway — a 5xx here makes Stripe retry indefinitely for what's
            # often a data problem on our side, not a transient one. The error
            # is captured for an operator to see on the Super-Admin Dashboard.

    return {"received": True}


async def _handle_checkout_completed(db: AsyncSession, session: dict) -> None:
    workspace_id_str = session.get("client_reference_id") or (session.get("metadata") or {}).get("workspace_id")
    if not workspace_id_str:
        await record_error(source="billing", message=f"checkout.session.completed with no workspace_id (session {session.get('id')})")
        return
    workspace = await db.get(Workspace, UUID(workspace_id_str))
    if workspace is None:
        return

    sub = await _get_or_create_subscription(db, workspace.id)
    sub.stripe_customer_id = session.get("customer") or sub.stripe_customer_id
    sub.stripe_subscription_id = session.get("subscription") or sub.stripe_subscription_id
    await record_audit(
        db, actor="stripe-webhook", workspace_id=workspace.id, action="billing.checkout_completed",
        entity_type="subscription", entity_id=str(sub.id),
        after={"stripe_customer_id": sub.stripe_customer_id, "stripe_subscription_id": sub.stripe_subscription_id},
    )
    await db.commit()


async def _handle_subscription_synced(db: AsyncSession, subscription: dict) -> None:
    workspace_id_str = (subscription.get("metadata") or {}).get("workspace_id")
    stripe_subscription_id = subscription.get("id")
    stripe_customer_id = subscription.get("customer")

    sub = None
    if workspace_id_str:
        result = await db.execute(select(Subscription).where(Subscription.workspace_id == UUID(workspace_id_str)))
        sub = result.scalar_one_or_none()
    if sub is None and stripe_subscription_id:
        result = await db.execute(select(Subscription).where(Subscription.stripe_subscription_id == stripe_subscription_id))
        sub = result.scalar_one_or_none()
    if sub is None and stripe_customer_id:
        result = await db.execute(select(Subscription).where(Subscription.stripe_customer_id == stripe_customer_id))
        sub = result.scalar_one_or_none()
    if sub is None:
        await record_error(source="billing", message=f"customer.subscription event for unknown workspace (subscription {stripe_subscription_id})")
        return

    workspace = await db.get(Workspace, sub.workspace_id)
    if workspace is None:
        return

    before = {"plan_tier": sub.plan_tier.value, "status": sub.status.value, "mrr": sub.mrr}

    sub.stripe_subscription_id = stripe_subscription_id or sub.stripe_subscription_id
    sub.stripe_customer_id = stripe_customer_id or sub.stripe_customer_id
    sub.status = _STRIPE_STATUS_MAP.get(subscription.get("status", ""), sub.status)
    sub.mrr = monthly_amount_from_subscription(subscription)

    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = (items[0].get("price") or {}).get("id")
        plan_tier = plan_tier_for_price_id(price_id) if price_id else None
        if plan_tier is not None:
            sub.plan_tier = plan_tier

    current_period_start = subscription.get("current_period_start") or subscription.get("start_date")
    if current_period_start:
        sub.renewed_at = datetime.fromtimestamp(current_period_start, tz=timezone.utc)

    # Denormalized onto Workspace for fast reads everywhere else — only when
    # the subscription is actually in good standing.
    if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING):
        workspace.plan_tier = sub.plan_tier
        workspace.mrr = sub.mrr

    await record_audit(
        db, actor="stripe-webhook", workspace_id=workspace.id, action="billing.subscription_synced",
        entity_type="subscription", entity_id=str(sub.id), before=before,
        after={"plan_tier": sub.plan_tier.value, "status": sub.status.value, "mrr": sub.mrr},
    )
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, subscription: dict) -> None:
    stripe_subscription_id = subscription.get("id")
    result = await db.execute(select(Subscription).where(Subscription.stripe_subscription_id == stripe_subscription_id))
    sub = result.scalar_one_or_none()
    if sub is None:
        return

    workspace = await db.get(Workspace, sub.workspace_id)
    before = {"plan_tier": sub.plan_tier.value, "status": sub.status.value, "mrr": sub.mrr}

    sub.status = SubscriptionStatus.CANCELED
    sub.mrr = 0.0
    if workspace is not None:
        workspace.plan_tier = WorkspacePlanTier.FREE
        workspace.mrr = 0.0

    await record_audit(
        db, actor="stripe-webhook", workspace_id=sub.workspace_id, action="billing.subscription_canceled",
        entity_type="subscription", entity_id=str(sub.id), before=before,
        after={"plan_tier": WorkspacePlanTier.FREE.value, "status": sub.status.value, "mrr": 0.0},
    )
    await db.commit()


async def _handle_payment_failed(db: AsyncSession, invoice: dict) -> None:
    stripe_customer_id = invoice.get("customer")
    result = await db.execute(select(Subscription).where(Subscription.stripe_customer_id == stripe_customer_id))
    sub = result.scalar_one_or_none()
    await record_error(
        source="billing",
        message=f"Payment failed for customer {stripe_customer_id} (invoice {invoice.get('id')})",
        workspace_id=sub.workspace_id if sub else None,
    )
    if sub is not None:
        sub.status = SubscriptionStatus.PAST_DUE
        await db.commit()
