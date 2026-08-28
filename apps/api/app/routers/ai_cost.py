"""
AI Tool Cost Tracking: a workspace's own AI coding tool spend (GitHub
Copilot, Cursor, Claude Code seats, etc.), entered by the workspace itself —
never inferred, and never a comparative claim about any vendor's product.
Surfaced next to (not merged into) the existing Cost Capitalization report
and cross-referenced, on request, with the AI Contribution Tracker's real
self-disclosed adoption percentage for one repo — so a workspace can see
what it pays for AI tooling next to what it's measurably getting from it.
"""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_signals import is_ai_assisted
from app.auth.dependencies import get_internal_user, get_repo_for_user, require_feature_flag, require_role
from app.db.models import AIToolSubscription, Commit, User, UserRole
from app.db.session import get_db
from app.schemas import (
    AIToolCostReport,
    AIToolCostReportEntry,
    AIToolSubscriptionCreate,
    AIToolSubscriptionOut,
    AIToolSubscriptionUpdate,
)

router = APIRouter(prefix="/ai-tool-costs", tags=["ai-tool-costs"], dependencies=[Depends(require_feature_flag("ai_tool_cost_tracking"))])


def _monthly_cost(sub: AIToolSubscription) -> float:
    total = sub.seat_count * sub.cost_per_seat_usd
    return round(total / 12, 2) if sub.billing_period == "annual" else round(total, 2)


def _is_active(sub: AIToolSubscription) -> bool:
    return sub.ended_on is None or sub.ended_on >= date.today()


def _to_out(sub: AIToolSubscription) -> AIToolSubscriptionOut:
    return AIToolSubscriptionOut(
        id=sub.id, workspace_id=sub.workspace_id, tool_name=sub.tool_name, seat_count=sub.seat_count,
        cost_per_seat_usd=sub.cost_per_seat_usd, billing_period=sub.billing_period, started_on=sub.started_on,
        ended_on=sub.ended_on, notes=sub.notes, created_at=sub.created_at,
        monthly_cost_usd=_monthly_cost(sub), is_active=_is_active(sub),
    )


async def _list_for_workspace(db: AsyncSession, workspace_id: UUID) -> list[AIToolSubscription]:
    result = await db.execute(
        select(AIToolSubscription).where(AIToolSubscription.workspace_id == workspace_id).order_by(AIToolSubscription.tool_name)
    )
    return list(result.scalars().all())


@router.get("", response_model=list[AIToolSubscriptionOut])
async def list_subscriptions(user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> list[AIToolSubscriptionOut]:
    if user.workspace_id is None:
        return []
    subs = await _list_for_workspace(db, user.workspace_id)
    return [_to_out(s) for s in subs]


@router.post("", response_model=AIToolSubscriptionOut)
async def create_subscription(
    payload: AIToolSubscriptionCreate,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> AIToolSubscriptionOut:
    if admin.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    if payload.ended_on is not None and payload.ended_on < payload.started_on:
        raise HTTPException(status_code=400, detail="ended_on can't be before started_on")
    sub = AIToolSubscription(
        workspace_id=admin.workspace_id, tool_name=payload.tool_name, seat_count=payload.seat_count,
        cost_per_seat_usd=payload.cost_per_seat_usd, billing_period=payload.billing_period,
        started_on=payload.started_on, ended_on=payload.ended_on, notes=payload.notes,
        created_by_user_id=admin.id,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return _to_out(sub)


@router.patch("/{subscription_id}", response_model=AIToolSubscriptionOut)
async def update_subscription(
    subscription_id: UUID,
    payload: AIToolSubscriptionUpdate,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> AIToolSubscriptionOut:
    sub = await db.get(AIToolSubscription, subscription_id)
    if sub is None or (admin.role != UserRole.SUPER_ADMIN and sub.workspace_id != admin.workspace_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    updates = payload.model_dump(exclude_unset=True)
    started_on = updates.get("started_on", sub.started_on)
    ended_on = updates.get("ended_on", sub.ended_on)
    if ended_on is not None and started_on is not None and ended_on < started_on:
        raise HTTPException(status_code=400, detail="ended_on can't be before started_on")
    for field, value in updates.items():
        setattr(sub, field, value)
    await db.commit()
    await db.refresh(sub)
    return _to_out(sub)


@router.delete("/{subscription_id}")
async def delete_subscription(
    subscription_id: UUID, admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> dict:
    sub = await db.get(AIToolSubscription, subscription_id)
    if sub is None or (admin.role != UserRole.SUPER_ADMIN and sub.workspace_id != admin.workspace_id):
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
    return {"deleted": True}


@router.get("/report", response_model=AIToolCostReport)
async def get_cost_report(
    repo_id: UUID | None = None,
    user: User = Depends(get_internal_user),
    db: AsyncSession = Depends(get_db),
) -> AIToolCostReport:
    """Total workspace AI-tool spend, normalized to a monthly figure across
    mixed billing periods. Pass `repo_id` to also cross-reference against
    that repo's real AI Contribution Tracker adoption percentage — this
    endpoint computes it directly rather than calling the /contributions
    endpoint over HTTP, since it's already inside the same request/DB
    session."""
    if user.workspace_id is None:
        return AIToolCostReport(total_monthly_cost_usd=0.0, active_subscription_count=0, entries=[], subscriptions=[])

    subs = await _list_for_workspace(db, user.workspace_id)
    active = [s for s in subs if _is_active(s)]
    entries = [AIToolCostReportEntry(tool_name=s.tool_name, seat_count=s.seat_count, monthly_cost_usd=_monthly_cost(s)) for s in active]
    total_monthly = round(sum(e.monthly_cost_usd for e in entries), 2)

    repo_ai_assisted_pct = None
    cost_per_adoption_point_usd = None
    if repo_id is not None:
        # Reuses get_repo_for_user's own workspace-membership check by hand
        # here (rather than as a FastAPI dependency) since repo_id is
        # optional on this endpoint and that dependency requires it.
        repo = await get_repo_for_user(repo_id=repo_id, user=user, db=db)
        commits_result = await db.execute(select(Commit.message).where(Commit.repo_id == repo.id))
        messages = [m or "" for (m,) in commits_result.all()]
        if messages:
            ai_count = sum(1 for m in messages if is_ai_assisted(m))
            repo_ai_assisted_pct = round(100 * ai_count / len(messages), 1)
            if repo_ai_assisted_pct > 0:
                cost_per_adoption_point_usd = round(total_monthly / repo_ai_assisted_pct, 2)

    return AIToolCostReport(
        total_monthly_cost_usd=total_monthly,
        active_subscription_count=len(active),
        entries=entries,
        subscriptions=[_to_out(s) for s in subs],
        repo_ai_assisted_pct=repo_ai_assisted_pct,
        cost_per_adoption_point_usd=cost_per_adoption_point_usd,
    )
