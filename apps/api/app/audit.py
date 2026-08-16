"""
Compliance & Audit Trail mode (spec Section 5.12): a single helper every
mutation path calls to append an AuditLogEntry in the same DB transaction as
the change itself, so the trail can never drift out of sync with reality.
"""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLogEntry


async def record_audit(
    db: AsyncSession,
    *,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    repo_id: UUID | None = None,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    """
    Add an audit entry to `db`'s pending transaction. Does NOT commit — call
    sites should already be inside a transaction they commit themselves, so
    the audit entry and the change it describes land atomically together.
    """
    db.add(
        AuditLogEntry(
            repo_id=repo_id,
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            before_json=before,
            after_json=after,
        )
    )
