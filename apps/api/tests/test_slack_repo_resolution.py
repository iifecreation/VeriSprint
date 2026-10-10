"""
Regression test: the `/verisprint` Slack slash command used to try
`UUID(command["channel_id"])` directly — a Slack channel id (e.g.
"C0123456789") is never a valid UUID, so every invocation fell through to
"not linked to a repo", regardless of configuration. The fix resolves the
channel id against `Repo.slack_channel_id` instead — see
app/integrations/slack_client.py's resolve_repo_for_slack_channel.
"""
from app.integrations.slack_client import resolve_repo_for_slack_channel


async def test_resolves_the_repo_whose_slack_channel_id_matches(db, repo):
    repo.slack_channel_id = "C0123456789"
    await db.commit()

    resolved = await resolve_repo_for_slack_channel(db, "C0123456789")
    assert resolved is not None
    assert resolved.id == repo.id


async def test_returns_none_for_an_unlinked_channel(db, repo):
    repo.slack_channel_id = "C0123456789"
    await db.commit()

    assert await resolve_repo_for_slack_channel(db, "C9999999999") is None


async def test_returns_none_for_a_missing_channel_id(db):
    assert await resolve_repo_for_slack_channel(db, None) is None
