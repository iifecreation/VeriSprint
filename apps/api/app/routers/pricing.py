"""
Platform-wide pricing (spec: admin-editable pricing, no manual provider-side
work). `GET /pricing-plans` is public — the marketing site's /pricing page
reads live numbers from here instead of hardcoding them. `PUT
/pricing-plans/{tier}` is SUPER_ADMIN-only (this sets the platform's own
price list, not a per-workspace setting) and is what actually creates/
rotates the Stripe Price and Paystack Plan objects — see PricingPlan's
docstring in app/db/models.py for why that's a create-new, not an edit-in-place.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import require_role
from app.db.models import PricingPlan, User, UserRole, WorkspacePlanTier
from app.db.session import get_db
from app.integrations import paystack_client, stripe_client
from app.integrations.paystack_client import PaystackError, PaystackNotConfigured
from app.integrations.stripe_client import StripeNotConfigured
from app.schemas import PricingPlanOut, PricingPlanUpdate

router = APIRouter(prefix="/pricing-plans", tags=["pricing"])
logger = logging.getLogger(__name__)

# Only these three are ever sold self-serve — FREE has no price to set,
# ENTERPRISE is sales-assisted and priced per-deal, matching the same
# constraint app/routers/billing.py's checkout endpoint already enforces.
_SELF_SERVE_TIERS = (WorkspacePlanTier.TEAM, WorkspacePlanTier.GROWTH, WorkspacePlanTier.AGENCY)

_DEFAULT_NAME = {
    WorkspacePlanTier.TEAM: "Team",
    WorkspacePlanTier.GROWTH: "Growth",
    WorkspacePlanTier.AGENCY: "Agency",
}


def _to_out(plan: PricingPlan) -> PricingPlanOut:
    return PricingPlanOut(
        id=plan.id, tier=plan.tier.value, name=plan.name, price_usd=plan.price_usd,
        billing_interval=plan.billing_interval, is_active=plan.is_active,
        has_stripe_price=plan.stripe_price_id is not None, has_paystack_plan=plan.paystack_plan_code is not None,
        updated_at=plan.updated_at,
    )


@router.get("", response_model=list[PricingPlanOut])
async def list_pricing_plans(db: AsyncSession = Depends(get_db)) -> list[PricingPlanOut]:
    """Public — no auth. This is exactly what a visitor's browser is allowed
    to see: current self-serve prices, nothing workspace-specific."""
    result = await db.execute(
        select(PricingPlan).where(PricingPlan.tier.in_(_SELF_SERVE_TIERS)).order_by(PricingPlan.tier)
    )
    return [_to_out(p) for p in result.scalars().all()]


@router.put("/{tier}", response_model=PricingPlanOut)
async def set_pricing_plan(
    tier: str,
    payload: PricingPlanUpdate,
    admin: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> PricingPlanOut:
    try:
        plan_tier = WorkspacePlanTier(tier)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown tier: {tier}") from exc
    if plan_tier not in _SELF_SERVE_TIERS:
        raise HTTPException(status_code=400, detail=f"{plan_tier.value} isn't self-serve priced — team/growth/agency only")

    result = await db.execute(select(PricingPlan).where(PricingPlan.tier == plan_tier))
    plan = result.scalar_one_or_none()
    is_new = plan is None
    before = None
    if plan is None:
        plan = PricingPlan(
            tier=plan_tier, name=payload.name or _DEFAULT_NAME[plan_tier],
            price_usd=payload.price_usd if payload.price_usd is not None else 0.0,
            billing_interval=payload.billing_interval or "month",
        )
        db.add(plan)
    else:
        before = {"price_usd": plan.price_usd, "billing_interval": plan.billing_interval, "name": plan.name}
        if payload.name is not None:
            plan.name = payload.name
        if payload.billing_interval is not None:
            plan.billing_interval = payload.billing_interval
        if payload.is_active is not None:
            plan.is_active = payload.is_active

    price_changed = is_new or (payload.price_usd is not None and payload.price_usd != plan.price_usd)
    if payload.price_usd is not None:
        plan.price_usd = payload.price_usd

    # Only touch the provider side when the price (or a brand-new plan)
    # actually changed — an is_active/name-only edit shouldn't mint a new
    # Stripe Price for no reason.
    if price_changed:
        try:
            plan.stripe_price_id = stripe_client.create_stripe_price(
                name=plan.name, amount_usd=plan.price_usd, interval=plan.billing_interval,
            )
        except StripeNotConfigured:
            logger.info("Stripe not configured — pricing_plans.%s saved without a Stripe price", plan_tier.value)
        try:
            plan.paystack_plan_code = paystack_client.create_or_update_plan(
                plan_tier=plan_tier, name=plan.name, amount_usd=plan.price_usd,
                interval=plan.billing_interval, existing_plan_code=plan.paystack_plan_code,
            )
        except PaystackNotConfigured:
            logger.info("Paystack not configured — pricing_plans.%s saved without a Paystack plan", plan_tier.value)
        except PaystackError as exc:
            logger.warning("Paystack plan sync failed for %s: %s", plan_tier.value, exc)

    plan.updated_by_user_id = admin.id
    await db.flush()
    await record_audit_for_user(
        db, user=admin, action="pricing_plan.updated", entity_type="pricing_plan", entity_id=str(plan.id),
        before=before, after={"price_usd": plan.price_usd, "billing_interval": plan.billing_interval, "name": plan.name},
    )
    await db.commit()
    await db.refresh(plan)
    return _to_out(plan)
