"""
Orphan Commit Detector (spec Section 5.6): finds genuine work that was done
but never linked to any ticket, and raises an ORPHAN_COMMIT flag suggesting
it get retroactively tracked — a pure DB query, no LLM call needed.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import Commit, ReconciliationFlag, ReconciliationFlagType
from app.db.session import AsyncSessionLocal

LOOKBACK_DAYS = 14


async def detect_orphan_commits(ctx, repo_id: str) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Commit).where(
                Commit.repo_id == UUID(repo_id),
                Commit.linked_ticket_key.is_(None),
                Commit.committed_at >= cutoff,
                Commit.status == "analyzed",  # only flag commits we've actually analyzed
            )
        )
        orphans = list(result.scalars().all())
        if not orphans:
            return

        existing = await db.execute(
            select(ReconciliationFlag.commit_id).where(
                ReconciliationFlag.repo_id == UUID(repo_id),
                ReconciliationFlag.flag_type == ReconciliationFlagType.ORPHAN_COMMIT,
                ReconciliationFlag.is_resolved.is_(False),
            )
        )
        already_flagged = {c for (c,) in existing.all() if c is not None}

        for commit in orphans:
            if commit.id in already_flagged:
                continue
            flag = ReconciliationFlag(
                repo_id=UUID(repo_id),
                commit_id=commit.id,
                person_github_login=commit.author_github_login,
                flag_type=ReconciliationFlagType.ORPHAN_COMMIT,
                question=(
                    f"@{commit.author_github_login}'s commit \"{commit.message.splitlines()[0]}\" "
                    f"({commit.sha[:7]}) isn't linked to any ticket. Should one be created for it "
                    "so this work gets tracked and credited?"
                ),
                detail_json={"sha": commit.sha, "committed_at": commit.committed_at.isoformat()},
            )
            db.add(flag)
            await db.flush()
            await record_audit(
                db,
                actor="system",
                action="reconciliation_flag.created",
                entity_type="reconciliation_flag",
                entity_id=str(flag.id),
                repo_id=UUID(repo_id),
                after={"flag_type": "orphan_commit", "commit_sha": commit.sha},
            )

        await db.commit()
