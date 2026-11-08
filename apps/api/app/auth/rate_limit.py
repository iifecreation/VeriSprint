"""
Fixed-window rate limiting for the unauthenticated auth endpoints (login,
password reset) — the only endpoints in the API an attacker can hit
repeatedly without ever holding a valid credential, which makes them the
actual target for brute-force/credential-stuffing, not the RBAC-protected
routers everything else sits behind.

Backed by the same Redis instance the arq queue already uses — no new
infra. On a Redis outage it fails *closed* in production (requests get a
503 rather than unlimited attempts) and open in local development.
"""
import logging

import redis.asyncio as redis
from fastapi import HTTPException, Request

from app.config import get_settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def _client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis_client


def client_ip(request: Request) -> str:
    """The caller's IP for rate-limit keys.

    X-Forwarded-For is client-controlled except for the entries our own
    proxies append to the end, so we only trust the entry exactly
    TRUSTED_PROXY_HOPS from the right. With 0 hops (no proxy) the header is
    ignored entirely — otherwise an attacker could send a new fake IP on
    every request and never hit the per-IP limit."""
    hops = get_settings().trusted_proxy_hops
    if hops > 0:
        forwarded = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(forwarded) >= hops:
            return forwarded[-hops]
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(*, key: str, max_attempts: int, window_seconds: int) -> None:
    """Raises 429 once `key` has been hit more than `max_attempts` times
    within `window_seconds` of its first hit (a simple fixed window, not a
    sliding one — precise enough for this and a single Redis round trip)."""
    try:
        client = _client()
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, window_seconds)
    except HTTPException:
        raise
    except Exception:
        # Production fails closed: an attacker who can knock Redis over must
        # not get unlimited password guesses. Dev fails open for convenience.
        if get_settings().is_production:
            logger.error("Rate limiter unavailable — failing closed for key=%s", key, exc_info=True)
            raise HTTPException(status_code=503, detail="Temporarily unavailable — please try again shortly.") from None
        logger.warning("Rate limiter Redis call failed — failing open for key=%s", key, exc_info=True)
        return

    if count > max_attempts:
        ttl = await client.ttl(key)
        retry_after = ttl if ttl and ttl > 0 else window_seconds
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {retry_after} seconds.")


async def limit_per_user(request: Request, *, scope: str, user_id: object, max_attempts: int, window_seconds: int) -> None:
    """Cost/abuse limit for authenticated actions (AI chat, report
    generation, invites) — keyed by user, plus a looser per-IP cap."""
    await enforce_rate_limit(key=f"ratelimit:{scope}:user:{user_id}", max_attempts=max_attempts, window_seconds=window_seconds)
    await enforce_rate_limit(key=f"ratelimit:{scope}:ip:{client_ip(request)}", max_attempts=max_attempts * 3, window_seconds=window_seconds)


def per_user_limit(scope: str, max_attempts: int, window_seconds: int):
    """FastAPI dependency factory wrapping `limit_per_user` — attach with
    `dependencies=[Depends(per_user_limit("chat", 30, 600))]`."""
    from fastapi import Depends

    from app.auth.dependencies import get_current_user

    async def _dep(request: Request, user=Depends(get_current_user)) -> None:
        await limit_per_user(request, scope=scope, user_id=user.id, max_attempts=max_attempts, window_seconds=window_seconds)

    return _dep
