"""
Paystack integration — second billing processor, alongside Stripe
(app/integrations/stripe_client.py). Stripe requires the receiving business
to be legally based in one of its ~46 supported countries, which excludes
most of Africa; Paystack (itself a Stripe subsidiary, built specifically for
Nigerian/Ghanaian/South African businesses) is what a workspace whose
business sits outside Stripe's supported countries pays through instead.

No official Paystack Python SDK is a project dependency, so this talks to
Paystack's REST API directly via httpx — the same library already used for
GitHub's API (app/integrations/github_client.py) and OAuth (routers/auth.py).
Real, correct usage against Paystack's actual documented API shapes,
verified everywhere possible without live keys (signature verification,
request construction); live checkout/webhook delivery needs a real
PAYSTACK_SECRET_KEY to exercise end to end.
"""
import hashlib
import hmac

import httpx

from app.config import get_settings
from app.db.models import WorkspacePlanTier

settings = get_settings()

PAYSTACK_BASE_URL = "https://api.paystack.co"


class PaystackNotConfigured(Exception):
    pass


class PaystackError(Exception):
    """A non-2xx response from Paystack's API, or a documented `status: false` payload."""


def _require_configured() -> None:
    if not settings.paystack_secret_key:
        raise PaystackNotConfigured("PAYSTACK_SECRET_KEY is not configured — Paystack billing is unavailable")


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.paystack_secret_key}", "Content-Type": "application/json"}


def _raise_on_failure(resp: httpx.Response) -> dict:
    body = resp.json() if resp.content else {}
    if resp.status_code >= 400 or body.get("status") is False:
        message = body.get("message") or f"Paystack request failed with {resp.status_code}"
        raise PaystackError(message)
    return body


def create_or_update_plan(
    *, plan_tier: WorkspacePlanTier, name: str, amount_usd: float, interval: str, existing_plan_code: str | None
) -> str:
    """Returns the plan_code to store on PricingPlan.paystack_plan_code.

    Paystack plans are quoted in the smallest currency unit ("kobo" for NGN,
    "cents" for USD — both just amount * 100). Unlike Stripe Prices, Paystack
    *does* support updating an existing plan's amount in place via PUT — but
    this app deliberately never does that (see PricingPlan's docstring): an
    in-place amount change would silently reprice every subscriber already
    attached to that plan code. A price change always creates a new plan
    instead, exactly mirroring the Stripe side's immutable-Price behavior,
    so both providers give the same guarantee regardless of `existing_plan_code`.
    """
    _require_configured()
    paystack_interval = "annually" if interval == "year" else "monthly"
    payload = {
        "name": f"VeriSprint {name}",
        "amount": round(amount_usd * 100),
        "interval": paystack_interval,
        "currency": "USD",
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(f"{PAYSTACK_BASE_URL}/plan", headers=_headers(), json=payload)
    body = _raise_on_failure(resp)
    plan_code = body.get("data", {}).get("plan_code")
    if not plan_code:
        raise PaystackError("Paystack did not return a plan_code")
    return plan_code


def initialize_transaction(
    *, plan_code: str, workspace_id: str, plan_tier: WorkspacePlanTier, customer_email: str, callback_url: str
) -> str:
    """Returns the authorization_url to redirect the payer to — the Paystack
    equivalent of Stripe Checkout Session's `.url`. Passing `plan` here means
    a successful charge automatically creates a recurring subscription
    against that plan; Paystack (not this app) handles future billing cycles
    and fires a webhook on each one."""
    _require_configured()
    payload = {
        "email": customer_email,
        "plan": plan_code,
        "callback_url": callback_url,
        "metadata": {"workspace_id": workspace_id, "plan_tier": plan_tier.value},
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(f"{PAYSTACK_BASE_URL}/transaction/initialize", headers=_headers(), json=payload)
    body = _raise_on_failure(resp)
    authorization_url = body.get("data", {}).get("authorization_url")
    if not authorization_url:
        raise PaystackError("Paystack did not return an authorization_url")
    return authorization_url


def verify_transaction(reference: str) -> dict:
    """Confirms a transaction actually succeeded before trusting its webhook
    or a client-side redirect — the same "never trust the redirect alone"
    discipline Stripe's webhook signature verification enforces."""
    _require_configured()
    with httpx.Client(timeout=15) as client:
        resp = client.get(f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}", headers=_headers())
    body = _raise_on_failure(resp)
    return body.get("data", {})


def get_customer_manage_link(customer_code: str) -> str | None:
    """Paystack has no direct equivalent of Stripe's hosted Billing Portal —
    subscription management for a Paystack-billed workspace happens through
    Paystack's own customer-facing emails/links sent at subscription time,
    or through support. Returns None so callers can show that explanation
    instead of a broken portal link."""
    return None


def verify_webhook_signature(payload: bytes, signature_header: str | None) -> None:
    """Raises PaystackError on a missing/forged signature — callers must
    400/401, never process an unverified event. Paystack signs with
    HMAC-SHA512 of the raw request body using the secret key, hex-encoded,
    sent as `x-paystack-signature` — documented in Paystack's webhook guide."""
    if not settings.paystack_secret_key:
        raise PaystackNotConfigured("PAYSTACK_SECRET_KEY is not configured")
    if not signature_header:
        raise PaystackError("Missing x-paystack-signature header")
    expected = hmac.new(settings.paystack_secret_key.encode(), payload, hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise PaystackError("Invalid Paystack webhook signature")


def monthly_amount_from_transaction(data: dict, interval: str) -> float:
    """Real MRR from a verified transaction's amount — same normalization
    discipline as stripe_client.monthly_amount_from_subscription."""
    amount_major = (data.get("amount") or 0) / 100.0
    if interval == "year":
        return round(amount_major / 12, 2)
    return round(amount_major, 2)
