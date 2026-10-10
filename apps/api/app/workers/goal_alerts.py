"""
Goal breach alerting (Phase 3 competitor-parity — VeriSprint's equivalent of
the "nudge bot" pattern LinearB's guides call WorkerB): part of the daily
cron cycle (app/workers/scheduler.py), evaluates every currently-active
TeamGoal and posts a real Slack message (and emails the goal's owner) when
it's breaching. See app/goals.py's is_goal_breaching for exactly what
"breaching" means — never a prediction, just "still short at the halfway
mark of the goal's own period."
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.audit import record_audit
from app.db.models import Repo, TeamGoal, User
from app.db.session import AsyncSessionLocal
from app.goals import GOAL_METRIC_COMPUTERS, compute_progress_pct, is_goal_breaching
from app.integrations.email_client import send_email
from app.integrations.slack_client import post_digest

# Don't re-alert on the same goal within this window even if the daily cron
# somehow runs twice in a day — this job fires at most once per goal per day.
_RE_ALERT_COOLDOWN = timedelta(hours=20)


async def check_goal_breaches(ctx) -> None:
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(TeamGoal).where(TeamGoal.period_start <= now, TeamGoal.period_end >= now))
        goals = list(result.scalars().all())

        for goal in goals:
            if goal.last_alert_sent_at and (now - goal.last_alert_sent_at) < _RE_ALERT_COOLDOWN:
                continue
            computer = GOAL_METRIC_COMPUTERS.get(goal.metric_key)
            if computer is None:
                continue  # a goal whose metric_key predates removal/rename of its computer — nothing to evaluate

            current_value = await computer(db, goal.workspace_id, goal.repo_id, goal.period_start, goal.period_end)
            progress_pct = compute_progress_pct(goal.metric_key, current_value, goal.target_value)
            if not is_goal_breaching(progress_pct, goal.period_start, goal.period_end, now):
                continue

            days_left = max((goal.period_end - now).days, 0)
            text = (
                f"⚠️ Goal off track: *{goal.name}*\n"
                f"Metric: {goal.metric_key} — current {current_value}, target {goal.target_value} "
                f"({progress_pct}% progress, {days_left}d left in period)"
            )

            # Channel resolution: a repo-scoped goal posts to that repo's own
            # channel; an org-level goal (repo_id is None) posts to every
            # distinct channel configured across the workspace's repos —
            # there's no dedicated workspace-level Slack channel field yet.
            if goal.repo_id is not None:
                repo = await db.get(Repo, goal.repo_id)
                channels = [repo.slack_channel_id] if repo and repo.slack_channel_id else []
            else:
                repos_result = await db.execute(
                    select(Repo).where(Repo.workspace_id == goal.workspace_id, Repo.slack_channel_id.is_not(None))
                )
                channels = list({r.slack_channel_id for r in repos_result.scalars().all()})

            sent_via: list[str] = []
            for channel in channels:
                await post_digest(channel, text)
                sent_via.append(f"slack:{channel}")

            if goal.created_by_user_id:
                owner = await db.get(User, goal.created_by_user_id)
                if owner and owner.email:
                    send_email(owner.email, f"VeriSprint: goal off track — {goal.name}", text)
                    sent_via.append(f"email:{owner.email}")

            # The audit trail + throttle both record the attempt, not just a
            # successful delivery — a goal with no channel/owner-email
            # configured still shouldn't be re-evaluated every single day.
            goal.last_alert_sent_at = now
            await record_audit(
                db, actor="system", action="team_goal.breach_alerted", entity_type="team_goal",
                entity_id=str(goal.id), workspace_id=goal.workspace_id, repo_id=goal.repo_id,
                after={"progress_pct": progress_pct, "current_value": current_value, "sent_via": sent_via},
            )

        await db.commit()
