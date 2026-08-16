"""
Client Proof-of-Work Portal (spec Section 5.2): the public, unauthenticated
endpoint a client visits via an unguessable share link — no login sharing
needed, no raw code exposed, white-labeled with the agency's own branding.

Keyed by `ClientPortalLink.token` (Phase 3 competitor-parity task #30's
migration off the bare `ReportDocument.share_token`) — a link is now
independently revocable and can expire without touching the report it
points to. `report.share_token` is still populated at generation time for
backward compatibility but is no longer read here.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ClientPortalLink, Repo, ReportDocument, Workspace
from app.db.session import get_db
from app.schemas import PortalBranding, PublicPortalReportOut

router = APIRouter(prefix="/portal", tags=["client-portal"])


@router.get("/{token}", response_model=PublicPortalReportOut)
async def get_public_portal_report(token: str, db: AsyncSession = Depends(get_db)) -> PublicPortalReportOut:
    result = await db.execute(select(ClientPortalLink).where(ClientPortalLink.token == token))
    link = result.scalar_one_or_none()
    if link is None or link.revoked:
        raise HTTPException(status_code=404, detail="This portal link is invalid or has been revoked.")
    if link.expires_at is not None and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=404, detail="This portal link has expired.")

    report = await db.get(ReportDocument, link.report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="This portal link is invalid or has expired.")

    repo = await db.get(Repo, report.repo_id)
    workspace = await db.get(Workspace, repo.workspace_id) if repo else None
    branding = (
        PortalBranding(name=workspace.name, logo_url=workspace.logo_url, primary_color_hex=workspace.primary_color_hex)
        if workspace is not None
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
