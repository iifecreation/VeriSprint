"""Thin wrapper for enqueueing jobs onto the Redis-backed arq queue from request handlers."""
from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.config import get_settings

settings = get_settings()

_pool: ArqRedis | None = None


async def get_pool() -> ArqRedis:
    global _pool
    if _pool is None:
        _pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    return _pool


async def enqueue(job_name: str, *args, **kwargs) -> None:
    pool = await get_pool()
    await pool.enqueue_job(job_name, *args, **kwargs)
