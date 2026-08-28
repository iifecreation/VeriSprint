"""
Stripe integration (spec Section 7): Checkout (new subscription), the hosted
Customer Portal (self-serve plan changes/cancellation), and webhook
verification. Self-serve tiers only (team/growth/agency) — ENTERPRISE is
sales-assisted and provisioned manually via the Super-Admin Dashboard, never
through Checkout.

Per the confirmed approach for third-party billing: this is real, correct
SDK usage against Stripe's actual API shapes — verified everywhere possible
without live keys (webhook signature rejection, request construction). Live
checkout/webhook delivery needs a real STRIPE_SECRET_KEY /
STRIPE_WEBHOOK_SECRET to actually exercise end to end.

Prices are no longer static STRIPE_PRICE_ID_* env vars — see
app/db/models.py::PricingPlan and app/routers/pricing.py. A Super Admin
editing a price there is what creates/rotates the actual Stripe Price
object; this module just reads whatever PricingPlan.stripe_price_id
currently points at.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import stripe

from app.config import get_settings
from app.db.models import PricingPlan, WorkspacePlanTier

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


class StripeNotConfigured(Exception):
    pass


def _require_configured() -> None:
    if not settings.stripe_secret_key:
        raise StripeNotConfigured("STRIPE_SECRET_KEY is not configured — billing is unavailable")


async def price_id_for_plan_tier(db: AsyncSession, plan_tier: WorkspacePlanTier) -> str:
    result = await db.execute(select(PricingPlan).where(PricingPlan.tier == plan_tier, PricingPlan.is_active.is_(True)))
    plan = result.scalar_one_or_none()
    if plan is None or not plan.stripe_price_id:
        raise ValueError(
            f"No Stripe price configured for plan tier {plan_tier.value} — set one from the Operator "
            "Console's Pricing panel (self-serve tiers: team/growth/agency)"
        )
    return plan.stripe_price_id


async def plan_tier_for_price_id(db: AsyncSession, price_id: str) -> WorkspacePlanTier | None:
    result = await db.execute(select(PricingPlan).where(PricingPlan.stripe_price_id == price_id))
    plan = result.scalar_one_or_none()
    return plan.tier if plan else None


def create_stripe_price(*, name: str, amount_usd: float, interval: str) -> str:
    """Creates a brand-new Stripe Product+Price in one call (Price.create's
    inline `product_data` implicitly creates the Product too) and returns
    the new price's id. Called only from app/routers/pricing.py when a
    Super Admin sets or changes a tier's price — never called per-checkout.
    Stripe Prices are immutable once created, which is exactly the
    "existing subscribers keep their old price" guarantee PricingPlan's
    docstring describes; this function embraces that by always creating a
    new one rather than trying to mutate anything."""
    _require_configured()
    price = stripe.Price.create(
        unit_amount=round(amount_usd * 100),
        currency="usd",
        recurring={"interval": interval},
        product_data={"name": f"VeriSprint {name}"},
    )
    return price.id


def create_checkout_session(
    *,
    price_id: str,
    plan_tier: WorkspacePlanTier,
    workspace_id: str,
    customer_id: str | None,
    customer_email: str | None,
    success_url: str,
    cancel_url: str,
) -> stripe.checkout.Session:
    _require_configured()

    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": workspace_id,
        "metadata": {"workspace_id": workspace_id, "plan_tier": plan_tier.value},
        "subscription_data": {"metadata": {"workspace_id": workspace_id, "plan_tier": plan_tier.value}},
    }
    if customer_id:
        params["customer"] = customer_id
    elif customer_email:
        params["customer_email"] = customer_email

    return stripe.checkout.Session.create(**params)


def create_billing_portal_session(*, customer_id: str, return_url: str) -> stripe.billing_portal.Session:
    _require_configured()
    return stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    """Raises stripe.SignatureVerificationError on a forged/mismatched payload
    — callers must 400/401, never process an unverified event."""
    if not settings.stripe_webhook_secret:
        raise StripeNotConfigured("STRIPE_WEBHOOK_SECRET is not configured")
    return stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)


def monthly_amount_from_subscription(subscription: dict) -> float:
    """Real MRR from the subscription's first line item — annual prices are
    normalized to a monthly-equivalent, never a guessed number."""
    items = subscription.get("items", {}).get("data", [])
    if not items:
        return 0.0
    price = items[0].get("price", {})
    unit_amount = price.get("unit_amount") or 0
    quantity = items[0].get("quantity") or 1
    interval = (price.get("recurring") or {}).get("interval", "month")
    dollars = (unit_amount / 100.0) * quantity
    if interval == "year":
        return round(dollars / 12, 2)
    if interval == "week":
        return round(dollars * 52 / 12, 2)
    if interval == "day":
        return round(dollars * 365 / 12, 2)
    return round(dollars, 2)
