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

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_internal_user, get_repo_for_user
from app.db.models import ClientPortalLink, Repo, ReportDocument, ReportType, Sprint, User
from app.db.session import get_db
from app.queue.client import enqueue
from app.schemas import GenerateCustomReportRequest, GenerateReportRequest, ReportDocumentOut, ReportSectionOption
from app.billing_access import require_active_access

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(require_active_access)])

# Report Builder's real, deterministically-computed sections (see
# app/workers/reports.py's `generate_custom_report`) — each one pulls from
# an existing, already-shipped feature's own data, never a new metric
# invented just for this list.
CUSTOM_REPORT_SECTIONS: list[ReportSectionOption] = [
    ReportSectionOption(
        key="shipped_activity", label="Shipped Activity",
        description="Real commits and their evidence-backed summaries in the selected period.",
    ),
    ReportSectionOption(
        key="cost_capitalization", label="Cost Capitalization",
        description="Capitalizable new development vs. non-capitalizable maintenance split, same as the Cost Capitalization report.",
    ),
    ReportSectionOption(
        key="ai_contribution", label="AI Contribution",
        description="Self-disclosed AI-assisted commit percentage, same signal as the AI Contribution Tracker.",
    ),
    ReportSectionOption(
        key="ai_tool_cost", label="AI Tool Spend",
        description="Current active AI coding tool subscriptions and their normalized monthly cost.",
    ),
]
_VALID_SECTION_KEYS = {s.key for s in CUSTOM_REPORT_SECTIONS}


async def _repo_for_payload(payload: GenerateReportRequest, user: User, db: AsyncSession) -> Repo:
    repo = await db.get(Repo, payload.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    ensure_workspace_access(user, repo.workspace_id)
    return repo


@router.get("", response_model=list[ReportDocumentOut])
async def list_reports(
    report_type: str | None = None, repo: Repo = Depends(get_repo_for_user), db: AsyncSession = Depends(get_db)
) -> list[ReportDocument]:
    stmt = select(ReportDocument).where(ReportDocument.repo_id == repo.id).order_by(ReportDocument.created_at.desc())
    if report_type is not None:
        stmt = stmt.where(ReportDocument.report_type == report_type)
    result = await db.execute(stmt.limit(200))
    return list(result.scalars().all())


@router.get("/{report_id}", response_model=ReportDocumentOut)
async def get_report(
    report_id: UUID, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    report = await db.get(ReportDocument, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    repo = await db.get(Repo, report.repo_id)
    if repo is not None:
        ensure_workspace_access(user, repo.workspace_id)
    return report


@router.get("/custom/sections", response_model=list[ReportSectionOption])
async def list_custom_report_sections(user: User = Depends(get_internal_user)) -> list[ReportSectionOption]:
    return CUSTOM_REPORT_SECTIONS


@router.post("/custom", response_model=ReportDocumentOut)
async def generate_custom_report(
    payload: GenerateCustomReportRequest, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    repo = await db.get(Repo, payload.repo_id)
    if repo is None:
        raise HTTPException(status_code=404, detail="Repo not found")
    ensure_workspace_access(user, repo.workspace_id)

    unknown = [s for s in payload.sections if s not in _VALID_SECTION_KEYS]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown section(s): {', '.join(unknown)}")
    if payload.period_end < payload.period_start:
        raise HTTPException(status_code=400, detail="period_end can't be before period_start")

    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.CUSTOM,
        period_start=payload.period_start,
        period_end=payload.period_end,
        title=payload.title or f"Custom Report: {payload.period_start.date()} to {payload.period_end.date()}",
        status="generating",
        custom_sections=payload.sections,
    )
    db.add(report)
    await db.flush()  # populate report.id (client-side uuid4 default) for the audit entry
    await record_audit_for_user(
        db, user=user, action="report.generated", entity_type="report_document", entity_id=str(report.id),
        repo_id=payload.repo_id, after={"report_type": report.report_type.value, "sections": payload.sections},
    )
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_custom_report", str(payload.repo_id), str(report.id))
    return report


@router.post("/sprint-rollup", response_model=ReportDocumentOut)
async def generate_sprint_rollup(
    payload: GenerateReportRequest, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    await _repo_for_payload(payload, user, db)
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
    await db.flush()  # populate report.id (client-side uuid4 default) for the audit entry
    await record_audit_for_user(
        db, user=user, action="report.generated", entity_type="report_document", entity_id=str(report.id),
        repo_id=payload.repo_id, after={"report_type": report.report_type.value, "sprint_id": str(sprint.id)},
    )
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_sprint_rollup", str(payload.repo_id), str(sprint.id), str(report.id))
    return report


@router.post("/investor-update", response_model=ReportDocumentOut)
async def generate_investor_update(
    payload: GenerateReportRequest, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    await _repo_for_payload(payload, user, db)
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
    await db.flush()  # populate report.id (client-side uuid4 default) for the audit entry
    await record_audit_for_user(
        db, user=user, action="report.generated", entity_type="report_document", entity_id=str(report.id),
        repo_id=payload.repo_id, after={"report_type": report.report_type.value},
    )
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_investor_update", str(payload.repo_id), str(report.id))
    return report


@router.post("/client-portal", response_model=ReportDocumentOut)
async def generate_client_portal_report(
    payload: GenerateReportRequest, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    repo = await _repo_for_payload(payload, user, db)
    if payload.period_start is None or payload.period_end is None:
        raise HTTPException(status_code=400, detail="period_start and period_end are required")

    # Mint the link token now, not on successful generation — the client link
    # must stay stable even if this generation attempt fails (the portal page
    # then just shows "generating"/"failed" at the same URL, not a dead link).
    # `share_token` on the report itself still carries the same value for the
    # frontend's existing /portal/{token} link — ClientPortalLink is the real
    # lookup now (revocable/expirable independent of the report).
    token = secrets.token_urlsafe(24)
    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.CLIENT_PORTAL,
        period_start=payload.period_start,
        period_end=payload.period_end,
        title=payload.title or f"Delivery Summary: {payload.period_start.date()} to {payload.period_end.date()}",
        status="generating",
        share_token=token,
    )
    db.add(report)
    await db.flush()  # populate report.id (client-side uuid4 default) for the FK + audit entry below
    db.add(ClientPortalLink(workspace_id=repo.workspace_id, report_id=report.id, token=token))
    await record_audit_for_user(
        db, user=user, action="report.generated", entity_type="report_document", entity_id=str(report.id),
        repo_id=payload.repo_id, after={"report_type": report.report_type.value},
    )
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_client_portal_report", str(payload.repo_id), str(report.id))
    return report


@router.post("/onboarding-doc", response_model=ReportDocumentOut)
async def generate_onboarding_doc(
    payload: GenerateReportRequest, user: User = Depends(get_internal_user), db: AsyncSession = Depends(get_db)
) -> ReportDocument:
    repo = await _repo_for_payload(payload, user, db)

    report = ReportDocument(
        repo_id=payload.repo_id,
        report_type=ReportType.ONBOARDING_DOC,
        title=payload.title or f"Onboarding Guide: {repo.full_name}",
        status="generating",
    )
    db.add(report)
    await db.flush()  # populate report.id (client-side uuid4 default) for the audit entry
    await record_audit_for_user(
        db, user=user, action="report.generated", entity_type="report_document", entity_id=str(report.id),
        repo_id=payload.repo_id, after={"report_type": report.report_type.value},
    )
    await db.commit()
    await db.refresh(report)
    await enqueue("generate_onboarding_doc", str(payload.repo_id), str(report.id))
    return report
