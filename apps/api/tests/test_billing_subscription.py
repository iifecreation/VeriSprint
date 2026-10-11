"""
Regression test for a real captured production error (surfaced via the
Operator Console's Errors panel): GET /billing/subscription's
select-then-insert raced two concurrent callers into both seeing no row and
both inserting, so the second always lost to Subscription.workspace_id's
unique constraint with a raw 500. app/routers/billing.py's
_get_or_create_subscription now does an ON CONFLICT DO NOTHING upsert
instead, making the insert itself race-safe.
"""
import asyncio

from sqlalchemy import func, select

from app.db.models import Subscription
from app.db.session import AsyncSessionLocal
from app.routers.billing import _get_or_create_subscription


async def test_creates_a_subscription_when_none_exists(db, workspace):
    sub = await _get_or_create_subscription(db, workspace.id)
    await db.commit()

    assert sub.workspace_id == workspace.id
    assert sub.plan_tier.value == "free"
    assert sub.status.value == "trialing"


async def test_returns_the_existing_subscription_without_creating_a_duplicate(db, workspace):
    first = await _get_or_create_subscription(db, workspace.id)
    await db.commit()

    second = await _get_or_create_subscription(db, workspace.id)
    assert second.id == first.id

    count = await db.scalar(select(func.count()).select_from(Subscription).where(Subscription.workspace_id == workspace.id))
    assert count == 1


async def test_concurrent_calls_race_safely_into_exactly_one_row(db, workspace):
    # Two independent sessions (separate DB connections) racing the same
    # select-then-insert — this is the exact scenario that used to raise
    # IntegrityError: duplicate key value violates ix_subscriptions_workspace_id.
    async def call_in_fresh_session() -> None:
        async with AsyncSessionLocal() as session:
            await _get_or_create_subscription(session, workspace.id)
            await session.commit()

    await asyncio.gather(call_in_fresh_session(), call_in_fresh_session())

    count = await db.scalar(select(func.count()).select_from(Subscription).where(Subscription.workspace_id == workspace.id))
    assert count == 1
