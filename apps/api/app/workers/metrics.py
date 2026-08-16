"""
System-health metrics collection (spec Section 7): real Redis queue depth and
real workspace/repo activity counts, recorded on a frequent cron so the
Super-Admin Dashboard's system-health panel has an actual time series rather
than a single live snapshot. LLM cost/latency-per-call is a known gap — the
LLM client's completion calls are synchronous (blocking, called from arq job
threads) and don't yet have a metrics hook; adding one means threading an
async DB write through every call site in app/integrations/llm_client.py,
deferred rather than done partially here.
"""
from sqlalchemy import func, select

from app.db.models import Repo, Workspace, WorkspaceStatus
from app.db.session import AsyncSessionLocal
from app.observability import record_metric
from app.queue.client import get_pool

ARQ_QUEUE_KEY = "arq:queue"  # matches WorkerSettings' default queue_name in app/queue/worker.py


async def collect_system_metrics(ctx) -> None:
    pool = await get_pool()
    # arq stores its queue as a Redis sorted set (score = scheduled run time),
    # not a list — ZCARD is the real "how many jobs are queued" count.
    queue_depth = await pool.zcard(ARQ_QUEUE_KEY)
    await record_metric(metric_name="queue_depth", value=float(queue_depth))

    async with AsyncSessionLocal() as db:
        active_workspaces = await db.scalar(
            select(func.count()).select_from(Workspace).where(Workspace.status == WorkspaceStatus.ACTIVE)
        )
        active_repos = await db.scalar(select(func.count()).select_from(Repo).where(Repo.is_active.is_(True)))

    await record_metric(metric_name="active_workspaces", value=float(active_workspaces or 0))
    await record_metric(metric_name="active_repos", value=float(active_repos or 0))
