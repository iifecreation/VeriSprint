"""
Auto-drafted standup generator (Step 6): reuses the Step 3 analysis output
(EvidenceItem summaries), filtered to one person and one day — no extra LLM
call needed, which keeps this cheap to run for an entire team every morning.
"""
from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import Commit, EvidenceItem, EvidenceKind, StandupUpdate


async def generate_standup(ctx, repo_id: str, author_github_login: str, day_iso: str) -> None:
    from app.db.session import AsyncSessionLocal

    target_day = date.fromisoformat(day_iso)
    day_start = datetime.combine(target_day, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(target_day, time.max, tzinfo=timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Commit).where(
                Commit.repo_id == UUID(repo_id),
                Commit.author_github_login == author_github_login,
                Commit.committed_at >= day_start,
                Commit.committed_at <= day_end,
            )
        )
        commits = list(result.scalars().all())

        if not commits:
            return

        summaries: list[str] = []
        for commit in commits:
            evidence_result = await db.execute(
                select(EvidenceItem).where(
                    EvidenceItem.commit_id == commit.id,
                    EvidenceItem.kind == EvidenceKind.SUMMARY,
                )
            )
            summary_item = evidence_result.scalars().first()
            bullet = summary_item.description if summary_item else commit.message.splitlines()[0]
            ticket_prefix = f"[{commit.linked_ticket_key}] " if commit.linked_ticket_key else ""
            summaries.append(f"- {ticket_prefix}{bullet}")

        draft_text = f"**{author_github_login} — {target_day.isoformat()}**\n" + "\n".join(summaries)

        existing = await db.execute(
            select(StandupUpdate).where(
                StandupUpdate.repo_id == UUID(repo_id),
                StandupUpdate.author_github_login == author_github_login,
                StandupUpdate.date == day_start,
            )
        )
        standup = existing.scalar_one_or_none()
        if standup is None:
            standup = StandupUpdate(
                repo_id=UUID(repo_id),
                author_github_login=author_github_login,
                date=day_start,
            )
            db.add(standup)

        standup.draft_text = draft_text
        standup.commit_ids = [str(c.id) for c in commits]
        await db.flush()

        await record_audit(
            db,
            actor="system",
            action="standup.generated",
            entity_type="standup_update",
            entity_id=str(standup.id),
            repo_id=UUID(repo_id),
            after={"author_github_login": author_github_login, "date": target_day.isoformat(), "commit_count": len(commits)},
        )

        await db.commit()
