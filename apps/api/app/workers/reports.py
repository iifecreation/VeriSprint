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

from app.ai_signals import is_ai_assisted
from app.audit import record_audit
from app.benchmarks import classify, classify_delivery_risk_quadrant
from app.db.models import (
    AIToolSubscription,
    Commit,
    ConfidenceScore,
    EvidenceItem,
    EvidenceKind,
    ReportDocument,
    Repo,
    Sprint,
    TeamGoal,
    Ticket,
    Workspace,
)
from app.db.session import AsyncSessionLocal
from app.delivery_risk import compute_delivery_accuracy
from app.goals import GOAL_METRIC_COMPUTERS, compute_progress_pct, is_goal_breaching
from app.integrations.github_client import fetch_repo_tree
from app.integrations.llm_client import draft_report
from app.investment import compute_investment_profile
from app.metrics import compute_efficiency_metrics
from app.routers.ai_cost import _is_active as _subscription_is_active
from app.routers.ai_cost import _monthly_cost as _subscription_monthly_cost
from app.routers.capitalization import _classify as _classify_ticket
from app.routers.capitalization import _MINUTES_PER_COMMIT


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


def _fmt_usd(amount: float) -> str:
    """`$2,000` for a whole number, `$2,000.50` otherwise — avoids the
    trailing `.0` a bare `f"{amount:,}"` leaves on every float."""
    return f"${amount:,.0f}" if amount == round(amount) else f"${amount:,.2f}"


async def _section_shipped_activity(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    context_text, commit_count, contributor_count = await _gather_period_context(db, repo_id, period_start, period_end)
    return f"**Shipped Activity**\n\n{commit_count} commit(s) from {contributor_count} contributor(s):\n\n{context_text}"


async def _section_cost_capitalization(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    repo = await db.get(Repo, repo_id)
    workspace = await db.get(Workspace, repo.workspace_id) if repo else None
    hourly_rate = workspace.hourly_rate_usd if workspace else None

    tickets_result = await db.execute(select(Ticket).where(Ticket.repo_id == repo_id))
    ticket_by_key = {t.key: t for t in tickets_result.scalars().all()}

    commits_result = await db.execute(
        select(Commit.linked_ticket_key).where(
            Commit.repo_id == repo_id, Commit.committed_at >= period_start, Commit.committed_at <= period_end,
            Commit.linked_ticket_key.is_not(None),
        )
    )
    buckets = {"capitalizable_new_development": 0, "non_capitalizable_maintenance": 0}
    for (key,) in commits_result.all():
        ticket = ticket_by_key.get(key)
        category = _classify_ticket(ticket) if ticket else "capitalizable_new_development"
        buckets[category] += 1

    lines = ["**Cost Capitalization**", ""]
    for category, count in buckets.items():
        hours = round(count * _MINUTES_PER_COMMIT / 60, 2)
        label = "Capitalizable new development" if category == "capitalizable_new_development" else "Non-capitalizable maintenance"
        cost_text = f" ({_fmt_usd(round(hours * hourly_rate, 2))})" if hourly_rate else ""
        lines.append(f"- {label}: {hours}h est.{cost_text}")
    return "\n".join(lines)


async def _section_ai_contribution(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    result = await db.execute(
        select(Commit.message).where(Commit.repo_id == repo_id, Commit.committed_at >= period_start, Commit.committed_at <= period_end)
    )
    messages = [m or "" for (m,) in result.all()]
    if not messages:
        return "**AI Contribution**\n\nNo commits in this period."
    ai_count = sum(1 for m in messages if is_ai_assisted(m))
    pct = round(100 * ai_count / len(messages), 1)
    return f"**AI Contribution**\n\n{ai_count}/{len(messages)} commit(s) self-disclosed AI assistance ({pct}%)."


async def _section_ai_tool_cost(db, repo_id: UUID) -> str:
    repo = await db.get(Repo, repo_id)
    if repo is None:
        return "**AI Tool Spend**\n\nRepo not found."
    result = await db.execute(select(AIToolSubscription).where(AIToolSubscription.workspace_id == repo.workspace_id))
    subs = [s for s in result.scalars().all() if _subscription_is_active(s)]
    if not subs:
        return "**AI Tool Spend**\n\nNo active AI tool subscriptions tracked."
    total = round(sum(_subscription_monthly_cost(s) for s in subs), 2)
    lines = ["**AI Tool Spend**", "", f"{_fmt_usd(total)}/mo across {len(subs)} active subscription(s):"]
    for s in subs:
        lines.append(f"- {s.tool_name}: {s.seat_count} seat(s), {_fmt_usd(_subscription_monthly_cost(s))}/mo")
    return "\n".join(lines)


async def _section_engineering_health(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    """Phase 6: the Git Efficiency Metrics panel's numbers, in prose form —
    same compute_efficiency_metrics call, same benchmark bands, never a
    second, drifting copy of the math."""
    m = await compute_efficiency_metrics(db, [repo_id], period_start, period_end)
    lines = ["**Engineering Health**", "", f"{m.merged_pr_count} PR(s) merged in this period."]

    def _line(label: str, value, unit: str, metric_key: str) -> None:
        if value is None:
            return
        band = classify(metric_key, value)
        band_text = f" ({band.replace('_', ' ')})" if band else ""
        lines.append(f"- {label}: {value}{unit}{band_text}")

    _line("Cycle time", m.cycle_time_hours, "h", "cycle_time_hours")
    _line("PR size", m.pr_size_lines, " lines", "pr_size_lines")
    _line("Rework rate", m.rework_rate_pct, "%", "rework_rate_pct")
    _line("Change failure rate", m.change_failure_rate_pct, "%", "change_failure_rate_pct")
    _line("MTTR", m.mttr_hours, "h", "mttr_hours")
    if m.prs_merged_without_review_pct is not None:
        lines.append(f"- PRs merged without review: {m.prs_merged_without_review_pct}%")
    return "\n".join(lines)


async def _section_investment_profile(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    """Phase 6: the Investment Profile panel's category breakdown, in prose
    form — same compute_investment_profile call that /insights uses."""
    profile = await compute_investment_profile(db, [repo_id], period_start, period_end)
    total = sum(profile.lines_by_category.values())
    if not total and not profile.uncategorized_lines:
        return "**Investment Profile**\n\nNo ticket-linked commit activity in this period to categorize."
    lines = ["**Investment Profile**", ""]
    labels = {
        "new_value": "New Value", "feature_enhancements": "Feature Enhancements",
        "developer_experience": "Developer Experience", "keeping_the_lights_on": "Keeping the Lights On",
    }
    for category, label in labels.items():
        pct = profile.pct_of_categorized(category)
        if pct is not None:
            lines.append(f"- {label}: {pct}%")
    return "\n".join(lines)


async def _section_delivery_risk(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    """Phase 6: Planning & Capacity Accuracy for the sprint(s) overlapping
    this report's period — same compute_delivery_accuracy /sprints uses."""
    sprints_result = await db.execute(
        select(Sprint).where(
            Sprint.repo_id == repo_id, Sprint.start_date <= period_end, Sprint.end_date >= period_start
        ).order_by(Sprint.start_date.desc())
    )
    sprints = list(sprints_result.scalars().all())
    if not sprints:
        return "**Delivery Predictability**\n\nNo sprint overlaps this report's period."

    lines = ["**Delivery Predictability**", ""]
    for sprint in sprints:
        acc = await compute_delivery_accuracy(db, sprint)
        quadrant = classify_delivery_risk_quadrant(acc.planning_accuracy_pct, acc.capacity_accuracy_pct)
        quadrant_text = f" — {quadrant.replace('_', ' ')}" if quadrant else ""
        planning_text = f"{acc.planning_accuracy_pct}%" if acc.planning_accuracy_pct is not None else "n/a"
        capacity_text = f"{acc.capacity_accuracy_pct}%" if acc.capacity_accuracy_pct is not None else "n/a"
        lines.append(
            f"- {sprint.name}: Planning Accuracy {planning_text}, Capacity Accuracy {capacity_text}{quadrant_text} "
            f"({acc.planned_completed_count}/{acc.planned_ticket_count} planned tickets done, "
            f"{acc.added_completed_count} unplanned done)"
        )
    return "\n".join(lines)


async def _section_goals_progress(db, repo_id: UUID, period_start: datetime, period_end: datetime) -> str:
    """Phase 6: active Team Goals (org-level and cascading) whose period
    overlaps this report's period, with the same direction-aware progress
    math /insights' Goals panel uses."""
    repo = await db.get(Repo, repo_id)
    if repo is None:
        return "**Goals**\n\nRepo not found."
    result = await db.execute(
        select(TeamGoal).where(
            TeamGoal.workspace_id == repo.workspace_id,
            TeamGoal.period_start <= period_end, TeamGoal.period_end >= period_start,
        ).order_by(TeamGoal.parent_goal_id.is_(None).desc(), TeamGoal.period_start)
    )
    goals = list(result.scalars().all())
    if not goals:
        return "**Goals**\n\nNo active goals for this period."

    lines = ["**Goals**", ""]
    for goal in goals:
        computer = GOAL_METRIC_COMPUTERS.get(goal.metric_key)
        current = await computer(db, goal.workspace_id, goal.repo_id, goal.period_start, goal.period_end) if computer else None
        progress = compute_progress_pct(goal.metric_key, current, goal.target_value)
        breaching = is_goal_breaching(progress, goal.period_start, goal.period_end, datetime.now(timezone.utc))
        prefix = "  ↳ " if goal.parent_goal_id else "- "
        status = " — OFF TRACK" if breaching else ""
        progress_text = f"{progress}%" if progress is not None else "n/a"
        lines.append(f"{prefix}{goal.name}: {current} / {goal.target_value} ({progress_text}){status}")
    return "\n".join(lines)


_CUSTOM_SECTION_BUILDERS = {
    "shipped_activity": _section_shipped_activity,
    "cost_capitalization": _section_cost_capitalization,
    "ai_contribution": _section_ai_contribution,
    "engineering_health": _section_engineering_health,
    "investment_profile": _section_investment_profile,
    "delivery_risk": _section_delivery_risk,
    "goals_progress": _section_goals_progress,
}

# Phase 6: pre-selected section bundles for a given stakeholder audience —
# pure convenience over the same Report Builder/custom_sections mechanism
# above (see routers/reports.py's GET /reports/custom/templates), not a
# separate report type or generation path.
REPORT_TEMPLATES: dict[str, dict] = {
    "leadership_update": {
        "label": "Leadership Update",
        "description": (
            "Business-impact framing for executives/the board: what shipped, delivery predictability, "
            "where engineering investment went, AI spend. Minimal technical detail."
        ),
        "sections": ["shipped_activity", "delivery_risk", "investment_profile", "cost_capitalization", "ai_tool_cost"],
    },
    "engineering_team_update": {
        "label": "Engineering Team Update",
        "description": (
            "Operational detail for engineering managers and teams: efficiency benchmarks, goal progress, "
            "delivery risk, AI-assisted contribution."
        ),
        "sections": ["engineering_health", "goals_progress", "delivery_risk", "ai_contribution", "shipped_activity"],
    },
}


async def generate_custom_report(ctx, repo_id: str, report_id: str) -> None:
    """Report Builder: assembles only the sections the workspace picked
    (`report.custom_sections`), each one computed directly from real rows —
    deliberately no LLM narrative step here, unlike the other report types,
    since a workspace choosing exactly what goes in a report is asking for
    a precise assembly, not a rewritten one."""
    async with AsyncSessionLocal() as db:
        report = await db.get(ReportDocument, UUID(report_id))
        if report is None:
            return
        try:
            sections = report.custom_sections or []
            blocks = []
            for key in sections:
                if key == "ai_tool_cost":
                    blocks.append(await _section_ai_tool_cost(db, UUID(repo_id)))
                    continue
                builder = _CUSTOM_SECTION_BUILDERS.get(key)
                if builder is None:
                    continue
                blocks.append(await builder(db, UUID(repo_id), report.period_start, report.period_end))

            report.summary_text = "\n\n---\n\n".join(blocks) if blocks else "(no sections selected)"
            report.status = "ready"
            await db.flush()
            await record_audit(
                db, actor="system", action="report.generated", entity_type="report_document",
                entity_id=str(report.id), repo_id=UUID(repo_id), after={"report_type": "custom", "sections": sections},
            )
            await db.commit()
        except Exception:
            report.status = "failed"
            await db.commit()
            raise
