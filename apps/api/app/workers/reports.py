"""
Reports engine: sprint rollups, investor updates, client portal reports, and
onboarding docs. Every report is drafted by Claude strictly from real rows
already in Postgres (or, for onboarding docs, the real repo tree fetched live
from GitHub) — the worker never invents activity that isn't in the database.
"""
import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import (
    Commit,
    ConfidenceScore,
    EvidenceItem,
    EvidenceKind,
    ReportDocument,
    Repo,
    Sprint,
    Ticket,
)
from app.db.session import AsyncSessionLocal
from app.integrations.github_client import fetch_repo_tree
from app.integrations.llm_client import draft_report


async def _gather_period_context(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> tuple[str, int, int]:
    """Returns (formatted context text, commit_count, contributor_count) for a date window."""
    commits_result = await db.execute(
        select(Commit).where(
            Commit.repo_id == repo_id,
            Commit.committed_at >= period_start,
            Commit.committed_at <= period_end,
            Commit.status == "analyzed",
        )
    )
    commits = list(commits_result.scalars().all())
    if not commits:
        return "(no analyzed commits in this period)", 0, 0

    commit_ids = [c.id for c in commits]
    evidence_result = await db.execute(
        select(EvidenceItem).where(EvidenceItem.commit_id.in_(commit_ids), EvidenceItem.kind == EvidenceKind.SUMMARY)
    )
    summaries_by_commit = {e.commit_id: e.description for e in evidence_result.scalars().all()}

    lines = []
    for commit in commits:
        summary = summaries_by_commit.get(commit.id, commit.message.splitlines()[0])
        ticket_prefix = f"[{commit.linked_ticket_key}] " if commit.linked_ticket_key else ""
        lines.append(f"- {ticket_prefix}{summary} (by {commit.author_github_login})")

    contributors = {c.author_github_login for c in commits}
    return "\n".join(lines), len(commits), len(contributors)


async def generate_sprint_rollup(ctx, repo_id: str, sprint_id: str, report_id: str) -> None:
    async with AsyncSessionLocal() as db:
        report = await db.get(ReportDocument, UUID(report_id))
        sprint = await db.get(Sprint, UUID(sprint_id))
        if report is None or sprint is None:
            return
        try:
            context_text, commit_count, contributor_count = await _gather_period_context(
                db, UUID(repo_id), sprint.start_date, sprint.end_date
            )

            planned_lines = []
            for key in sprint.planned_ticket_keys:
                ticket_result = await db.execute(select(Ticket).where(Ticket.repo_id == UUID(repo_id), Ticket.key == key))
                ticket = ticket_result.scalar_one_or_none()
                if ticket is None:
                    planned_lines.append(f"- {key}: not found in tracked tickets")
                    continue
                score_result = await db.execute(
                    select(ConfidenceScore)
                    .where(ConfidenceScore.ticket_id == ticket.id)
                    .order_by(ConfidenceScore.computed_at.desc())
                    .limit(1)
                )
                score = score_result.scalar_one_or_none()
                score_text = f"confidence {score.score}/100" if score else "no verified evidence yet"
                planned_lines.append(f"- {key} ({ticket.title}) — status: {ticket.status}, {score_text}")

            context = (
                f"Sprint: {sprint.name} ({sprint.start_date.date()} to {sprint.end_date.date()})\n\n"
                f"Planned tickets:\n" + ("\n".join(planned_lines) or "(none planned)") + "\n\n"
                f"Real shipped activity in this window ({commit_count} commits, {contributor_count} contributors):\n{context_text}"
            )

            report.summary_text = draft_report("sprint_rollup", f"Sprint Rollup: {sprint.name}", context)
            report.status = "ready"
            await db.flush()
            await record_audit(
                db, actor="system", action="report.generated", entity_type="report_document",
                entity_id=str(report.id), repo_id=UUID(repo_id),
                after={"report_type": "sprint_rollup", "sprint": sprint.name},
            )
            await db.commit()
        except Exception:
            report.status = "failed"
            await db.commit()
            raise


async def generate_investor_update(ctx, repo_id: str, report_id: str) -> None:
    async with AsyncSessionLocal() as db:
        report = await db.get(ReportDocument, UUID(report_id))
        if report is None:
            return
        try:
            context_text, commit_count, contributor_count = await _gather_period_context(
                db, UUID(repo_id), report.period_start, report.period_end
            )
            context = (
                f"Period: {report.period_start.date()} to {report.period_end.date()}\n"
                f"{commit_count} verified commits from {contributor_count} contributor(s).\n\n"
                f"What was actually shipped:\n{context_text}"
            )
            report.summary_text = draft_report("investor_update", report.title, context)
            report.status = "ready"
            await db.flush()
            await record_audit(
                db, actor="system", action="report.generated", entity_type="report_document",
                entity_id=str(report.id), repo_id=UUID(repo_id), after={"report_type": "investor_update"},
            )
            await db.commit()
        except Exception:
            report.status = "failed"
            await db.commit()
            raise


async def generate_client_portal_report(ctx, repo_id: str, report_id: str) -> None:
    async with AsyncSessionLocal() as db:
        report = await db.get(ReportDocument, UUID(report_id))
        if report is None:
            return
        try:
            context_text, commit_count, contributor_count = await _gather_period_context(
                db, UUID(repo_id), report.period_start, report.period_end
            )
            context = (
                f"Billing period: {report.period_start.date()} to {report.period_end.date()}\n"
                f"{commit_count} verified pieces of work delivered.\n\n"
                f"What was delivered:\n{context_text}"
            )
            report.summary_text = draft_report("client_portal", report.title, context)
            report.status = "ready"
            if not report.share_token:
                report.share_token = secrets.token_urlsafe(24)
            await db.flush()
            await record_audit(
                db, actor="system", action="report.generated", entity_type="report_document",
                entity_id=str(report.id), repo_id=UUID(repo_id), after={"report_type": "client_portal"},
            )
            await db.commit()
        except Exception:
            report.status = "failed"
            await db.commit()
            raise


async def generate_onboarding_doc(ctx, repo_id: str, report_id: str) -> None:
    async with AsyncSessionLocal() as db:
        report = await db.get(ReportDocument, UUID(report_id))
        repo = await db.get(Repo, UUID(repo_id))
        if report is None or repo is None:
            return
        try:
            from app.db.models import Workspace

            workspace = await db.get(Workspace, repo.workspace_id)
            tree = fetch_repo_tree(workspace.github_installation_id, repo.full_name, repo.default_branch)

            recent_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            recent_start = recent_start.replace(day=max(1, recent_start.day - 30))
            context_text, commit_count, contributor_count = await _gather_period_context(
                db, UUID(repo_id), recent_start, datetime.now(timezone.utc)
            )

            context = (
                f"Repository: {repo.full_name} (default branch: {repo.default_branch})\n\n"
                f"File structure ({len(tree)} files):\n" + "\n".join(f"- {p}" for p in tree[:400]) + "\n\n"
                f"Recent activity, last 30 days ({commit_count} commits, {contributor_count} contributors):\n{context_text}"
            )

            report.summary_text = draft_report("onboarding_doc", f"Onboarding Guide: {repo.full_name}", context)
            report.status = "ready"
            await db.flush()
            await record_audit(
                db, actor="system", action="report.generated", entity_type="report_document",
                entity_id=str(report.id), repo_id=UUID(repo_id), after={"report_type": "onboarding_doc"},
            )
            await db.commit()
        except Exception:
            report.status = "failed"
            await db.commit()
            raise
