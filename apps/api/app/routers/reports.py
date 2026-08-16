"""
Reports engine (Sections 4 Phase 2/3, 5.2, 5.3, 5.8): sprint rollups, investor
updates, onboarding docs, and Client Proof-of-Work Portal reports. Every
generation is queued (LLM drafting can take a few seconds) — the row is
created with status="generating" immediately, and a worker fills it in.
"""
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Repo, ReportDocument, ReportType, Sprint
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import GenerateReportRequest, ReportDocumentOut

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportDocumentOut])
async def list_reports(
    repo_id: UUID, report_type: str | None = None, db: AsyncSession = Depends(get_db)
) -> list[ReportDocument]:
    stmt = select(ReportDocument).where(ReportDocument.repo_id == repo_id).order_by(ReportDocument.created_at.desc())
    if report_type is not None:
        stmt = stmt.where(ReportDocument.report_type == report_type)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{report_id}", response_model=ReportDocumentOut)
async def get_report(report_id: UUID, db: AsyncSession = Depends(get_db)) -> ReportDocument:
    report = await db.get(ReportDocument, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("/sprint-rollup", response_model=ReportDocumentOut)
async def generate_sprint_rollup(payload: GenerateReportRequest, db: AsyncSession = Depends(get_db)) -> ReportDocument:
    if payload.sprint_id is None:
        raise HTTPException(status_code=400, detail="sprint_id is required for a sprint rollup")
    sprint = await db.get(Sprint, payload.sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")

    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.SPRINT_ROLLUP,
        period_start=sprint.start_date,
        period_end=sprint.end_date,
        title=payload.title or f"Sprint Rollup: {sprint.name}",
        status="generating",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_sprint_rollup", str(payload.repo_id), str(sprint.id), str(report.id))
    return report


@router.post("/investor-update", response_model=ReportDocumentOut)
async def generate_investor_update(payload: GenerateReportRequest, db: AsyncSession = Depends(get_db)) -> ReportDocument:
    if payload.period_start is None or payload.period_end is None:
        raise HTTPException(status_code=400, detail="period_start and period_end are required")

    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.INVESTOR_UPDATE,
        period_start=payload.period_start,
        period_end=payload.period_end,
        title=payload.title or f"Investor Update: {payload.period_start.date()} to {payload.period_end.date()}",
        status="generating",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_investor_update", str(payload.repo_id), str(report.id))
    return report


@router.post("/client-portal", response_model=ReportDocumentOut)
async def generate_client_portal_report(payload: GenerateReportRequest, db: AsyncSession = Depends(get_db)) -> ReportDocument:
    if payload.period_start is None or payload.period_end is None:
        raise HTTPException(status_code=400, detail="period_start and period_end are required")

    # Mint the share token now, not on successful generation — the client link
    # must stay stable even if this generation attempt fails (the portal page
    # then just shows "generating"/"failed" at the same URL, not a dead link).
    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.CLIENT_PORTAL,
        period_start=payload.period_start,
        period_end=payload.period_end,
        title=payload.title or f"Delivery Summary: {payload.period_start.date()} to {payload.period_end.date()}",
        status="generating",
        share_token=secrets.token_urlsafe(24),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_client_portal_report", str(payload.repo_id), str(report.id))
    return report


@router.post("/onboarding-doc", response_model=ReportDocumentOut)
async def generate_onboarding_doc(payload: GenerateReportRequest, db: AsyncSession = Depends(get_db)) -> ReportDocument:
    repo = await db.get(Repo, payload.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")

    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.ONBOARDING_DOC,
        title=payload.title or f"Onboarding Guide: {repo.full_name}",
        status="generating",
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_onboarding_doc", str(payload.repo_id), str(report.id))
    return report
