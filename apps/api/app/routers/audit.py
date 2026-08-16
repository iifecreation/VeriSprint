"""Compliance & Audit Trail mode: browse and export the append-only AuditLogEntry trail."""
import csv
import io
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLogEntry
from app.db.session import get_db
from app.schemas import AuditLogEntryOut

router = APIRouter(prefix="/audit", tags=["audit"])


def _filtered_query(repo_id: UUID | None, start: datetime | None, end: datetime | None):
    stmt = select(AuditLogEntry).order_by(AuditLogEntry.created_at.desc())
    if repo_id is not None:
        stmt = stmt.where(AuditLogEntry.repo_id == repo_id)
    if start is not None:
        stmt = stmt.where(AuditLogEntry.created_at >= start)
    if end is not None:
        stmt = stmt.where(AuditLogEntry.created_at <= end)
    return stmt


@router.get("", response_model=list[AuditLogEntryOut])
async def list_audit_entries(
    repo_id: UUID | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogEntry]:
    stmt = _filtered_query(repo_id, start, end).limit(min(limit, 1000))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/export")
async def export_audit_entries(
    repo_id: UUID | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    result = await db.execute(_filtered_query(repo_id, start, end).limit(50_000))
    entries = list(result.scalars().all())

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "created_at", "actor", "action", "entity_type", "entity_id", "repo_id", "before_json", "after_json"])
    for e in entries:
        writer.writerow(
            [
                str(e.id),
                e.created_at.isoformat(),
                e.actor,
                e.action,
                e.entity_type,
                e.entity_id,
                str(e.repo_id) if e.repo_id else "",
                e.before_json or "",
                e.after_json or "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=verisprint-audit-log.csv"},
    )
