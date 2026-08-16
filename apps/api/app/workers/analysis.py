"""
LLM analysis worker job (Step 3): pulls a commit's raw diff, asks Claude for a
plain-English summary + EvidenceItems, persists them, and — if the commit is
linked to a ticket — kicks off confidence scoring and reconciliation.
"""
from uuid import UUID

from sqlalchemy import select

from app.db.models import Commit, EvidenceItem
from app.db.session import AsyncSessionLocal
from app.integrations.llm_client import analyze_commit_diff
from app.integrations.object_storage import get_raw_diff


async def analyze_commit(ctx, commit_id: str) -> None:
    async with AsyncSessionLocal() as db:
        commit = await db.get(Commit, UUID(commit_id))
        if commit is None:
            return

        diff = get_raw_diff(commit.raw_diff_object_key)
        try:
            result = analyze_commit_diff(commit.message, diff)
        except Exception:
            commit.status = "failed"
            await db.commit()
            raise

        ticket_key = commit.linked_ticket_key or result.get("ticket_key")
        if ticket_key and not commit.linked_ticket_key:
            commit.linked_ticket_key = ticket_key

        db.add(
            EvidenceItem(
                commit_id=commit.id,
                ticket_key=ticket_key,
                kind="summary",
                description=result["summary"],
            )
        )
        for item in result.get("evidence_items", []):
            db.add(
                EvidenceItem(
                    commit_id=commit.id,
                    ticket_key=ticket_key,
                    kind=item["kind"],
                    description=item["description"],
                    file_path=item.get("file_path"),
                    line_range=item.get("line_range"),
                )
            )

        commit.status = "analyzed"
        await db.commit()

    if ticket_key:
        from app.queue.client import enqueue

        # Look up the ticket by (repo, key) so downstream jobs get a real ticket_id.
        async with AsyncSessionLocal() as db:
            from app.db.models import Ticket

            result = await db.execute(
                select(Ticket).where(Ticket.repo_id == commit.repo_id, Ticket.key == ticket_key)
            )
            ticket = result.scalar_one_or_none()
        if ticket is not None:
            await enqueue("compute_confidence", str(ticket.id))
            await enqueue("reconcile_ticket", str(ticket.id))
