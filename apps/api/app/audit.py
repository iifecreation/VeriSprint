"""
Compliance & Audit Trail mode (spec Sections 5.12, 6, 13-Step-2): a single
helper every mutation path calls to append an AuditLogEntry in the same DB
transaction as the change itself, so the trail can never drift out of sync
with reality. Every privileged action (role change, billing change,
integration connect/disconnect, data export) must call this.
"""
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLogEntry, User


async def record_audit(
    db: AsyncSession,
    *,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    repo_id: UUID | None = None,
    workspace_id: UUID | None = None,
    actor_user_id: UUID | None = None,
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
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            before_json=before,
            after_json=after,
        )
    )


async def record_audit_for_user(
    db: AsyncSession,
    *,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    repo_id: UUID | None = None,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    """Convenience wrapper once a real authenticated `User` is available (post-task #22)."""
    await record_audit(
        db,
        actor=user.email or user.github_login or str(user.id),
        actor_user_id=user.id,
        workspace_id=user.workspace_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        repo_id=repo_id,
        before=before,
        after=after,
    )
