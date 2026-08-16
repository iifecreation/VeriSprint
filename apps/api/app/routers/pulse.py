"""
Pulse Surveys (Phase 3 competitor-parity): a single question sent to a
workspace; responses are genuinely anonymous on every read path — see
`PulseSurveyResponse`'s docstring in app/db/models.py. Results are only ever
real submitted responses; an unanswered survey shows zero responses, never a
synthesized placeholder score.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, require_feature_flag, require_role
from app.db.models import PulseSurvey, PulseSurveyResponse, User, UserRole
from app.db.session import get_db
from app.schemas import PulseSurveyCreate, PulseSurveyOut, PulseSurveyResponseCreate

router = APIRouter(prefix="/pulse-surveys", tags=["pulse-surveys"], dependencies=[Depends(require_feature_flag("pulse_surveys"))])


async def _to_out(db: AsyncSession, survey: PulseSurvey) -> PulseSurveyOut:
    count = await db.scalar(select(func.count()).select_from(PulseSurveyResponse).where(PulseSurveyResponse.survey_id == survey.id))
    avg = await db.scalar(select(func.avg(PulseSurveyResponse.score)).where(PulseSurveyResponse.survey_id == survey.id))
    return PulseSurveyOut(
        id=survey.id, workspace_id=survey.workspace_id, question=survey.question, closes_at=survey.closes_at,
        response_count=count or 0, average_score=round(avg, 2) if avg is not None else None, created_at=survey.created_at,
    )


@router.get("", response_model=list[PulseSurveyOut])
async def list_pulse_surveys(
    workspace_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> list[PulseSurveyOut]:
    ensure_workspace_access(user, workspace_id)
    result = await db.execute(select(PulseSurvey).where(PulseSurvey.workspace_id == workspace_id).order_by(PulseSurvey.created_at.desc()))
    return [await _to_out(db, s) for s in result.scalars().all()]


@router.post("", response_model=PulseSurveyOut)
async def create_pulse_survey(
    payload: PulseSurveyCreate,
    manager: User = Depends(require_role(UserRole.WORKSPACE_ADMIN, UserRole.MANAGER)),
    db: AsyncSession = Depends(get_db),
) -> PulseSurveyOut:
    if manager.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    survey = PulseSurvey(workspace_id=manager.workspace_id, question=payload.question, closes_at=payload.closes_at, created_by_user_id=manager.id)
    db.add(survey)
    await db.flush()
    await record_audit_for_user(db, user=manager, action="pulse_survey.created", entity_type="pulse_survey", entity_id=str(survey.id), after={"question": survey.question})
    await db.commit()
    return await _to_out(db, survey)


@router.post("/{survey_id}/respond")
async def respond_to_pulse_survey(
    survey_id: UUID, payload: PulseSurveyResponseCreate, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> dict:
    survey = await db.get(PulseSurvey, survey_id)
    if survey is None:
        raise HTTPException(status_code=404, detail="Survey not found")
    ensure_workspace_access(user, survey.workspace_id)

    existing = await db.execute(
        select(PulseSurveyResponse).where(PulseSurveyResponse.survey_id == survey_id, PulseSurveyResponse.user_id == user.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="You've already responded to this survey")

    db.add(PulseSurveyResponse(survey_id=survey_id, user_id=user.id, score=payload.score, comment=payload.comment))
    # No audit entry here on purpose — an audit trail entry naming the actor
    # would defeat the anonymity the survey promises.
    await db.commit()
    return {"ok": True}
