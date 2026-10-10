"""Team Goals & Targets (Phase 2 competitor-parity, OKR cascade + breach flagging in Phase 3): CRUD for a target on a real metric, with progress always read live — see app/goals.py."""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, require_feature_flag
from app.db.session import get_db
from app.db.models import Repo, TeamGoal, User
from app.goals import GOAL_METRIC_COMPUTERS, GOAL_METRIC_DIRECTIONS, compute_progress_pct, is_goal_breaching
from app.schemas import TeamGoalCreate, TeamGoalOut

router = APIRouter(prefix="/goals", tags=["goals"], dependencies=[Depends(require_feature_flag("team_goals"))])


async def _to_goal_out(db: AsyncSession, goal: TeamGoal) -> TeamGoalOut:
    computer = GOAL_METRIC_COMPUTERS.get(goal.metric_key)
    current_value = await computer(db, goal.workspace_id, goal.repo_id, goal.period_start, goal.period_end) if computer else None
    progress_pct = compute_progress_pct(goal.metric_key, current_value, goal.target_value)
    now = datetime.now(timezone.utc)
    return TeamGoalOut(
        id=goal.id, workspace_id=goal.workspace_id, repo_id=goal.repo_id, parent_goal_id=goal.parent_goal_id,
        name=goal.name, metric_key=goal.metric_key,
        direction=GOAL_METRIC_DIRECTIONS.get(goal.metric_key, "higher_is_better"),
        target_value=goal.target_value, period_start=goal.period_start, period_end=goal.period_end,
        current_value=current_value, progress_pct=progress_pct,
        is_breaching=is_goal_breaching(progress_pct, goal.period_start, goal.period_end, now),
        last_alert_sent_at=goal.last_alert_sent_at, created_at=goal.created_at,
    )


@router.get("", response_model=list[TeamGoalOut])
async def list_goals(
    workspace_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> list[TeamGoalOut]:
    ensure_workspace_access(user, workspace_id)
    result = await db.execute(select(TeamGoal).where(TeamGoal.workspace_id == workspace_id).order_by(TeamGoal.period_start.desc()))
    return [await _to_goal_out(db, g) for g in result.scalars().all()]


@router.post("", response_model=TeamGoalOut)
async def create_goal(
    payload: TeamGoalCreate, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> TeamGoalOut:
    if user.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    if payload.metric_key not in GOAL_METRIC_COMPUTERS:
        raise HTTPException(status_code=422, detail=f"Unknown metric_key: {payload.metric_key}. Known: {', '.join(GOAL_METRIC_COMPUTERS)}")
    if payload.repo_id is not None:
        repo = await db.get(Repo, payload.repo_id)
        if repo is None or repo.workspace_id != user.workspace_id:
            raise HTTPException(status_code=404, detail="Repo not found in your workspace")
    if payload.parent_goal_id is not None:
        parent = await db.get(TeamGoal, payload.parent_goal_id)
        if parent is None or parent.workspace_id != user.workspace_id:
            raise HTTPException(status_code=404, detail="Parent goal not found in your workspace")

    goal = TeamGoal(
        workspace_id=user.workspace_id, repo_id=payload.repo_id, parent_goal_id=payload.parent_goal_id,
        name=payload.name, metric_key=payload.metric_key,
        target_value=payload.target_value, period_start=payload.period_start, period_end=payload.period_end,
        created_by_user_id=user.id,
    )
    db.add(goal)
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="team_goal.created", entity_type="team_goal", entity_id=str(goal.id),
        after={"name": goal.name, "metric_key": goal.metric_key, "target_value": goal.target_value},
    )
    await db.commit()
    return await _to_goal_out(db, goal)


@router.delete("/{goal_id}")
async def delete_goal(goal_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> dict:
    goal = await db.get(TeamGoal, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    ensure_workspace_access(user, goal.workspace_id)
    await record_audit_for_user(
        db, user=user, action="team_goal.deleted", entity_type="team_goal", entity_id=str(goal.id),
        before={"name": goal.name, "metric_key": goal.metric_key},
    )
    await db.delete(goal)
    await db.commit()
    return {"ok": True}
