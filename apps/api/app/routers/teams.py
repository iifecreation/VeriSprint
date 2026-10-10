"""
Team segmentation (Phase 7 competitor-parity): CRUD for a named group of
GitHub logins — see app/db/models.py's Team docstring for why this is a
plain JSON list rather than a join table to User rows. Consumed by
app/routers/efficiency.py's `team_id` param and app/goals.py-style metric
computers can resolve one the same way.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user
from app.db.models import Team, User
from app.db.session import get_db
from app.schemas import TeamCreate, TeamOut, TeamUpdate
from app.billing_access import require_active_access

router = APIRouter(prefix="/teams", tags=["teams"], dependencies=[Depends(require_active_access)])


async def _team_for_user(team_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> Team:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    ensure_workspace_access(user, team.workspace_id)
    return team


@router.get("", response_model=list[TeamOut])
async def list_teams(user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)) -> list[Team]:
    if user.workspace_id is None:
        return []
    result = await db.execute(select(Team).where(Team.workspace_id == user.workspace_id).order_by(Team.name))
    return list(result.scalars().all())


@router.post("", response_model=TeamOut)
async def create_team(
    payload: TeamCreate, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> Team:
    if user.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    team = Team(workspace_id=user.workspace_id, name=payload.name, member_github_logins=payload.member_github_logins)
    db.add(team)
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="team.created", entity_type="team", entity_id=str(team.id),
        after={"name": team.name, "member_github_logins": team.member_github_logins},
    )
    await db.commit()
    await db.refresh(team)
    return team


@router.patch("/{team_id}", response_model=TeamOut)
async def update_team(
    payload: TeamUpdate, team: Team = Depends(_team_for_user),
    user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db),
) -> Team:
    before = {"name": team.name, "member_github_logins": team.member_github_logins}
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(team, field, value)
    await db.flush()
    await record_audit_for_user(
        db, user=user, action="team.updated", entity_type="team", entity_id=str(team.id), before=before, after=updates,
    )
    await db.commit()
    await db.refresh(team)
    return team


@router.delete("/{team_id}")
async def delete_team(
    team: Team = Depends(_team_for_user), user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> dict:
    await record_audit_for_user(
        db, user=user, action="team.deleted", entity_type="team", entity_id=str(team.id),
        before={"name": team.name, "member_github_logins": team.member_github_logins},
    )
    await db.delete(team)
    await db.commit()
    return {"ok": True}
