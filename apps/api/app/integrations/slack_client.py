"""
Slack app (Step 8): Bolt app used both for daily/sprint digest delivery
(triggered by the worker) and for answering Repo Chat questions asked
directly from Slack via the `/verisprint` slash command.

The Bolt app is constructed lazily so the API can boot without Slack
credentials configured yet (SLACK_BOT_TOKEN/SLACK_SIGNING_SECRET empty is the
default local-dev state) — it's only built the first time something actually
needs it, at which point missing credentials become a clear runtime error.
"""
from functools import lru_cache

from slack_bolt.app.async_app import AsyncApp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Repo
from app.db.session import AsyncSessionLocal

settings = get_settings()


async def resolve_repo_for_slack_channel(db: AsyncSession, channel_id: str | None) -> Repo | None:
    """A Slack channel maps to a Repo via `Repo.slack_channel_id` (set from
    the repo's Settings page) — never a UUID itself, so the slash command's
    `channel_id` (Slack's own id, e.g. "C0123456789") must be looked up, not
    parsed as one."""
    if not channel_id:
        return None
    result = await db.execute(select(Repo).where(Repo.slack_channel_id == channel_id))
    return result.scalars().first()


@lru_cache
def get_bolt_app() -> AsyncApp:
    if not settings.slack_bot_token or not settings.slack_signing_secret:
        raise RuntimeError(
            "Slack is not configured — set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET"
        )
    app = AsyncApp(token=settings.slack_bot_token, signing_secret=settings.slack_signing_secret)

    @app.command("/verisprint")
    async def handle_repo_chat_command(ack, respond, command):
        await ack()
        question = command.get("text", "").strip()
        if not question:
            await respond("Ask a question about the repo, e.g. `/verisprint what shipped yesterday?`")
            return

        from app.integrations.llm_client import answer_repo_chat_question

        async with AsyncSessionLocal() as db:
            repo = await resolve_repo_for_slack_channel(db, command.get("channel_id"))
        if repo is None:
            await respond("This channel isn't linked to a repo yet — set it from the repo's Settings page.")
            return

        answer = await answer_repo_chat_question(repo.id, question, asked_by=command.get("user_name"))
        await respond(answer.answer)

    return app


async def post_digest(channel: str, text: str) -> None:
    """Post a daily/sprint digest message to a Slack channel."""
    app = get_bolt_app()
    await app.client.chat_postMessage(channel=channel, text=text)
