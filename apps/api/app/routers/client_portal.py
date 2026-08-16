"""
Client Proof-of-Work Portal (spec Section 5.2): the public, unauthenticated
endpoint a client visits via an unguessable share link — no login sharing
needed, no raw code exposed, white-labeled with the agency's own branding.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ReportDocument, ReportType, WorkspaceSettings
from app.db.session import get_db
from app.schemas import PortalBranding, PublicPortalReportOut

router = APIRouter(prefix="/portal", tags=["client-portal"])


@router.get("/{share_token}", response_model=PublicPortalReportOut)
async def get_public_portal_report(share_token: str, db: AsyncSession = Depends(get_db)) -> PublicPortalReportOut:
    result = await db.execute(
        select(ReportDocument).where(
            ReportDocument.share_token == share_token,
            ReportDocument.report_type == ReportType.CLIENT_PORTAL,
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="This portal link is invalid or has expired.")

    settings_result = await db.execute(select(WorkspaceSettings).limit(1))
    ws = settings_result.scalar_one_or_none()
    branding = (
        PortalBranding(name=ws.name, logo_url=ws.logo_url, primary_color_hex=ws.primary_color_hex)
        if ws is not None
        else PortalBranding(name="VeriSprint", logo_url=None, primary_color_hex="#111827")
    )

    return PublicPortalReportOut(
        title=report.title,
        status=report.status,
        summary_text=report.summary_text if report.status == "ready" else None,
        period_start=report.period_start,
        period_end=report.period_end,
        branding=branding,
    )
