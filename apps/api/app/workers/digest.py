"""
Daily/sprint digest delivery (Step 8 + spec Phase 2 "Slack/email digests"):
builds a real summary from that day's analyzed commits, confidence scores,
and newly raised flags, then posts it to Slack (if the repo has a configured
channel) and emails it to contributors who have an email on file. Never sends
if there's genuinely nothing to report — no filler content.
"""
from datetime import date, datetime, time, timezone
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import (
    Commit,
    EvidenceItem,
    EvidenceKind,
    ReconciliationFlag,
    Repo,
    User,
)
from app.db.session import AsyncSessionLocal
from app.integrations.email_client import send_email
from app.integrations.slack_client import post_digest


async def _build_digest_text(db, repo: Repo, day_start: datetime, day_end: datetime) -> str | None:
    commits_result = await db.execute(
        select(Commit).where(
            Commit.repo_id == repo.id,
            Commit.committed_at >= day_start,
            Commit.committed_at <= day_end,
            Commit.status == "analyzed",
        )
    )
    commits = list(commits_result.scalars().all())

    flags_result = await db.execute(
        select(ReconciliationFlag).where(
            ReconciliationFlag.repo_id == repo.id,
            ReconciliationFlag.created_at >= day_start,
            ReconciliationFlag.created_at <= day_end,
        )
    )
    flags = list(flags_result.scalars().all())

    if not commits and not flags:
        return None

    lines = [f"VeriSprint daily digest — {repo.full_name} — {day_start.date().isoformat()}", ""]

    if commits:
        lines.append(f"Shipped ({len(commits)} commit{'s' if len(commits) != 1 else ''}):")
        for commit in commits:
            summary_result = await db.execute(
                select(EvidenceItem).where(EvidenceItem.commit_id == commit.id, EvidenceItem.kind == EvidenceKind.SUMMARY)
            )
            summary_item = summary_result.scalars().first()
            bullet = summary_item.description if summary_item else commit.message.splitlines()[0]
            ticket_prefix = f"[{commit.linked_ticket_key}] " if commit.linked_ticket_key else ""
            lines.append(f"  - {ticket_prefix}{bullet} (@{commit.author_github_login})")
        lines.append("")

    if flags:
        lines.append(f"Worth a look ({len(flags)} flag{'s' if len(flags) != 1 else ''}):")
        for flag in flags:
            lines.append(f"  - {flag.question}")

    return "\n".join(lines)


async def send_daily_digest(ctx, repo_id: str, day_iso: str) -> None:
    target_day = date.fromisoformat(day_iso)
    day_start = datetime.combine(target_day, time.min, tzinfo=timezone.utc)
    day_end = datetime.combine(target_day, time.max, tzinfo=timezone.utc)

    async with AsyncSessionLocal() as db:
        repo = await db.get(Repo, UUID(repo_id))
        if repo is None:
            return

        text = await _build_digest_text(db, repo, day_start, day_end)
        if text is None:
            return  # nothing real to report — send nothing

        sent_via: list[str] = []

        if repo.slack_channel_id:
            await post_digest(repo.slack_channel_id, text)
            sent_via.append(f"slack:{repo.slack_channel_id}")

        # Email every contributor who committed today and has an email on file.
        commits_result = await db.execute(
            select(Commit.author_github_login).where(
                Commit.repo_id == repo.id, Commit.committed_at >= day_start, Commit.committed_at <= day_end
            ).distinct()
        )
        authors = [a for (a,) in commits_result.all()]
        if authors:
            users_result = await db.execute(
                select(User).where(User.github_login.in_(authors), User.email.is_not(None))
            )
            for user in users_result.scalars().all():
                send_email(user.email, f"VeriSprint digest — {repo.full_name} — {target_day.isoformat()}", text)
                sent_via.append(f"email:{user.email}")

        if sent_via:
            await record_audit(
                db,
                actor="system",
                action="digest.sent",
                entity_type="repo",
                entity_id=str(repo.id),
                repo_id=repo.id,
                after={"day": target_day.isoformat(), "sent_via": sent_via},
            )
            await db.commit()
