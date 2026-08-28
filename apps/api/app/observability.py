"""
Error + metrics pipeline (spec Section 7): the actual data source behind the
Super-Admin Dashboard's error monitoring and system-health panels. Three
pieces:

  - `record_error` / `capture_worker_errors` — every ingestion failure, LLM
    timeout, failed webhook delivery, and unhandled API exception lands a real
    `ErrorEvent` row. Workers are wrapped with `capture_worker_errors` at
    registration time (see `app/queue/worker.py`) so no individual job needs
    to remember to call this itself; the API side is wired via a global
    exception handler in `app/main.py`.
  - `_maybe_alert` — a real-time email alert on top of that, not a substitute
    for it: a passive dashboard panel only helps if someone happens to be
    looking at it, so error/critical severity also best-effort emails
    OPERATOR_ALERT_EMAIL. Throttled per `source` via Redis (SET NX EX) so a
    repeating failure (e.g. Redis itself down, or a bad deploy) sends one
    email per cooldown window, not one per occurrence — every occurrence
    still lands its own ErrorEvent row regardless of whether the email fired.
  - `record_metric` — a thin helper for `SystemMetric` time-series points
    (queue depth, LLM call latency/cost, webhook delivery status). Cron-driven
    collection lives in `app/workers/scheduler.py`.

Sentry (`app/config.py`'s `SENTRY_DSN`) is a complementary, optional layer for
full stack traces / alerting — it is not the panel's data source. If Sentry
isn't configured, the DB-backed pipeline here still works end to end.
"""
import functools
import logging
from collections.abc import Awaitable, Callable
from typing import ParamSpec, TypeVar
from uuid import UUID

import redis.asyncio as redis

from app.config import get_settings
from app.db.models import ErrorEvent, ErrorSeverity, SystemMetric
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)
settings = get_settings()

P = ParamSpec("P")
T = TypeVar("T")

_redis_client: redis.Redis | None = None
# CRITICAL alerts every time (rare by construction); ERROR is throttled to
# at most one email per source per window so a repeating failure doesn't
# flood the inbox — the dashboard still shows every individual occurrence.
_ALERT_COOLDOWN_SECONDS = {ErrorSeverity.ERROR: 900, ErrorSeverity.CRITICAL: 0}


def _client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis_client


async def _maybe_alert(*, source: str, message: str, severity: ErrorSeverity) -> None:
    """Best-effort — never raises, never blocks recording the ErrorEvent
    itself. Silently no-ops if neither RESEND_API_KEY nor an alert address
    is configured, same "degrade, don't break" discipline as the rest of
    this module's optional integrations."""
    if severity not in (ErrorSeverity.ERROR, ErrorSeverity.CRITICAL):
        return
    to_address = settings.operator_alert_email or settings.contact_notify_email
    if not to_address or not settings.resend_api_key:
        return

    cooldown = _ALERT_COOLDOWN_SECONDS[severity]
    if cooldown:
        try:
            throttle_key = f"error-alert-cooldown:{source}:{severity.value}"
            # SET ... NX EX — atomically "claim" this cooldown window; only
            # the caller that actually sets the key sends the email.
            claimed = await _client().set(throttle_key, "1", nx=True, ex=cooldown)
            if not claimed:
                return
        except Exception:
            logger.warning("Alert throttle check failed — sending anyway rather than staying silent", exc_info=True)

    try:
        from app.integrations.email_client import send_email  # local import avoids a circular module load

        send_email(
            to=to_address,
            subject=f"[VeriSprint] {severity.value.upper()} in {source}",
            text=(
                f"A {severity.value} was just recorded on VeriSprint.\n\n"
                f"Source: {source}\nMessage: {message[:1000]}\n\n"
                "Full detail (including any earlier occurrences) is in the Operator Console -> Errors panel."
            ),
        )
    except Exception:
        logger.warning("Failed to send error alert email for source=%s", source, exc_info=True)


async def record_error(
    *,
    source: str,
    message: str,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    workspace_id: UUID | None = None,
    stack_ref: str | None = None,
) -> None:
    """Open its own session rather than reuse a request/job's — the whole point
    is to still record something if the caller's own transaction is what
    failed. Never raises: an observability write must not mask the real error."""
    try:
        async with AsyncSessionLocal() as db:
            db.add(
                ErrorEvent(
                    workspace_id=workspace_id, source=source, severity=severity,
                    message=message[:4000], stack_ref=stack_ref,
                )
            )
            await db.commit()
    except Exception:
        logger.exception("Failed to record ErrorEvent (source=%s) — swallowing so the original error still propagates", source)

    await _maybe_alert(source=source, message=message, severity=severity)


async def record_metric(*, metric_name: str, value: float, workspace_id: UUID | None = None) -> None:
    try:
        async with AsyncSessionLocal() as db:
            db.add(SystemMetric(metric_name=metric_name, value=value, workspace_id=workspace_id))
            await db.commit()
    except Exception:
        logger.exception("Failed to record SystemMetric %s", metric_name)


def capture_worker_errors(source: str) -> Callable[[Callable[P, Awaitable[T]]], Callable[P, Awaitable[T]]]:
    """Wrap an arq job function so any exception it raises lands an ErrorEvent
    before propagating — arq's own retry/max_tries handling still applies
    unchanged, since the exception is re-raised, not swallowed.

    Applied at registration in `app/queue/worker.py` rather than on each job
    function's definition, so job source files stay free of this concern.
    `functools.wraps` preserves `__name__`, which is what arq uses as the job
    name — this must keep matching the string passed to `enqueue()`.
    """

    def decorator(func: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            try:
                return await func(*args, **kwargs)
            except Exception as exc:
                # ctx is always the first positional arg for an arq job function.
                job_try = None
                if args and isinstance(args[0], dict):
                    job_try = args[0].get("job_try")
                await record_error(
                    source=source,
                    message=f"{func.__name__} failed (try {job_try}): {exc}",
                    severity=ErrorSeverity.ERROR,
                )
                raise

        return wrapper

    return decorator
