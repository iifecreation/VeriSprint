"""Compliance & Audit Trail mode: browse and export the append-only AuditLogEntry trail."""
import csv
import io
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, require_role
from app.db.models import AuditLogEntry, User, UserRole
from app.db.session import get_db
from app.schemas import AuditLogEntryOut

router = APIRouter(prefix="/audit", tags=["audit"])

# Full audit trail visibility is a workspace-admin/manager concern, not every role.
_can_view_audit = require_role(UserRole.WORKSPACE_ADMIN, UserRole.MANAGER)


def _filtered_query(workspace_id: UUID, repo_id: UUID | None, start: datetime | None, end: datetime | None):
    stmt = select(AuditLogEntry).where(AuditLogEntry.workspace_id == workspace_id).order_by(
        AuditLogEntry.created_at.desc()
    )
    if repo_id is not None:
        stmt = stmt.where(AuditLogEntry.repo_id == repo_id)
    if start is not None:
        stmt = stmt.where(AuditLogEntry.created_at >= start)
    if end is not None:
        stmt = stmt.where(AuditLogEntry.created_at <= end)
    return stmt


@router.get("", response_model=list[AuditLogEntryOut])
async def list_audit_entries(
    workspace_id: UUID | None = None,
    repo_id: UUID | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = 200,
    user: User = Depends(_can_view_audit),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogEntry]:
    target_workspace_id = workspace_id or user.workspace_id
    if target_workspace_id is None:
        return []
    ensure_workspace_access(user, target_workspace_id)
    stmt = _filtered_query(target_workspace_id, repo_id, start, end).limit(min(limit, 1000))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/export")
async def export_audit_entries(
    workspace_id: UUID | None = None,
    repo_id: UUID | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    user: User = Depends(_can_view_audit),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    target_workspace_id = workspace_id or user.workspace_id
    entries: list[AuditLogEntry] = []
    if target_workspace_id is not None:
        ensure_workspace_access(user, target_workspace_id)
        result = await db.execute(_filtered_query(target_workspace_id, repo_id, start, end).limit(50_000))
        entries = list(result.scalars().all())
        # "Data export" is itself a privileged, auditable action (spec Section 6).
        await record_audit_for_user(
            db, user=user, action="audit_log.exported", entity_type="workspace", entity_id=str(target_workspace_id),
            after={"repo_id": str(repo_id) if repo_id else None, "row_count": len(entries)},
        )
        await db.commit()

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
