"""
Error + metrics pipeline (spec Section 7): the actual data source behind the
Super-Admin Dashboard's error monitoring and system-health panels. Two halves:

  - `record_error` / `capture_worker_errors` — every ingestion failure, LLM
    timeout, failed webhook delivery, and unhandled API exception lands a real
    `ErrorEvent` row. Workers are wrapped with `capture_worker_errors` at
    registration time (see `app/queue/worker.py`) so no individual job needs
    to remember to call this itself; the API side is wired via a global
    exception handler in `app/main.py`.
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

from app.db.models import ErrorEvent, ErrorSeverity, SystemMetric
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

P = ParamSpec("P")
T = TypeVar("T")


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
