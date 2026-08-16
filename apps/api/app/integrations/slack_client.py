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

from app.config import get_settings

settings = get_settings()


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

        from uuid import UUID

        from app.integrations.llm_client import answer_repo_chat_question

        default_repo_id = command.get("channel_id")  # TODO: map Slack channel -> repo_id
        try:
            repo_uuid = UUID(default_repo_id)
        except (ValueError, TypeError):
            await respond("This channel isn't linked to a repo yet.")
            return

        answer = await answer_repo_chat_question(repo_uuid, question, asked_by=command.get("user_name"))
        await respond(answer.answer)

    return app


async def post_digest(channel: str, text: str) -> None:
    """Post a daily/sprint digest message to a Slack channel."""
    app = get_bolt_app()
    await app.client.chat_postMessage(channel=channel, text=text)
