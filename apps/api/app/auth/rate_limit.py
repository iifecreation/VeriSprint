"""
Fixed-window rate limiting for the unauthenticated auth endpoints (login,
password reset) — the only endpoints in the API an attacker can hit
repeatedly without ever holding a valid credential, which makes them the
actual target for brute-force/credential-stuffing, not the RBAC-protected
routers everything else sits behind.

Backed by the same Redis instance the arq queue already uses — no new
infra. Fails *open* on a Redis outage: a rate limiter that's down shouldn't
also take down login, it just stops limiting until Redis recovers, and that
gap is logged so it's visible on the Super-Admin Dashboard's error feed.
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
    """Best-effort caller IP. Trusts `X-Forwarded-For` only for its first
    hop — fine here since this only feeds a rate-limit key, never an
    authorization decision, so a spoofed header at worst buys an attacker a
    fresh bucket, not access to anything."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
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
        logger.warning("Rate limiter Redis call failed — failing open for key=%s", key, exc_info=True)
        return

    if count > max_attempts:
        ttl = await client.ttl(key)
        retry_after = ttl if ttl and ttl > 0 else window_seconds
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {retry_after} seconds.")
