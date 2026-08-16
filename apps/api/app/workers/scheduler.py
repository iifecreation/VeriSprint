"""Daily cron dispatcher — fans out per-repo maintenance jobs for every active repo."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.models import Repo
from app.db.session import AsyncSessionLocal
from app.queue.client import enqueue


async def run_daily_maintenance(ctx) -> None:
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Repo).where(Repo.is_active.is_(True)))
        repos = list(result.scalars().all())

    for repo in repos:
        await enqueue("detect_orphan_commits", str(repo.id))
        await enqueue("detect_activity_anomalies", str(repo.id))
        await enqueue("send_daily_digest", str(repo.id), yesterday)
