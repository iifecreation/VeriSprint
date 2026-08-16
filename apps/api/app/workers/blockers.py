"""
Blocker Nudge Bot (Phase 2 competitor-parity): flags a ticket sitting in a
non-terminal status with no new shipped evidence in a while — framed as a
check-in prompt, same "question, not accusation" convention as every other
reconciliation flag. Pure timestamp comparison on real Commit/Ticket rows; no
LLM call, no guessing at why someone is stuck.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select

from app.audit import record_audit
from app.db.models import Commit, ReconciliationFlag, ReconciliationFlagType, Ticket
from app.db.session import AsyncSessionLocal

NON_TERMINAL_STATUSES = {"in_progress", "in_review"}
STALE_THRESHOLD_DAYS = 5


async def detect_blockers(ctx, repo_id: str) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)

    async with AsyncSessionLocal() as db:
        tickets_result = await db.execute(select(Ticket).where(Ticket.repo_id == UUID(repo_id)))
        tickets = [t for t in tickets_result.scalars().all() if t.status.lower() in NON_TERMINAL_STATUSES]

        for ticket in tickets:
            last_commit_at = await db.scalar(
                select(func.max(Commit.committed_at)).where(
                    Commit.repo_id == UUID(repo_id), Commit.linked_ticket_key == ticket.key
                )
            )
            reference_time = last_commit_at or ticket.created_at
            if reference_time is None or reference_time > cutoff:
                continue  # recent activity (or no reference point at all) — nothing to flag

            existing = await db.execute(
                select(ReconciliationFlag).where(
                    ReconciliationFlag.ticket_id == ticket.id,
                    ReconciliationFlag.flag_type == ReconciliationFlagType.POSSIBLE_BLOCKER,
                    ReconciliationFlag.is_resolved.is_(False),
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue  # already nudged and not yet resolved

            stale_days = (now - reference_time).days
            basis = "since its last shipped commit" if last_commit_at else "since it was created"
            flag = ReconciliationFlag(
                ticket_id=ticket.id,
                repo_id=UUID(repo_id),
                person_github_login=ticket.assignee_github_login,
                flag_type=ReconciliationFlagType.POSSIBLE_BLOCKER,
                question=(
                    f"{ticket.key} has been \"{ticket.status}\" for {stale_days} days with no new "
                    f"commits {basis} — worth checking if it's blocked on something?"
                ),
                detail_json={"status": ticket.status, "stale_days": stale_days, "had_prior_commits": last_commit_at is not None},
            )
            db.add(flag)
            await db.flush()
            await record_audit(
                db, actor="system", action="reconciliation_flag.created", entity_type="reconciliation_flag",
                entity_id=str(flag.id), repo_id=UUID(repo_id),
                after={"flag_type": "possible_blocker", "ticket_key": ticket.key, "stale_days": stale_days},
            )

        await db.commit()
