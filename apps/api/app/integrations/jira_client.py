"""
Optional Jira ticket sync (Step 5). Not required for the MVP demo — tickets can
be entered manually via POST /tickets instead. Wire this up once JIRA_API_TOKEN
and JIRA_BASE_URL are configured.
"""
import httpx

from app.config import get_settings

settings = get_settings()


async def fetch_jira_issues(project_key: str) -> list[dict]:
    if not settings.jira_api_token or not settings.jira_base_url:
        raise RuntimeError("Jira sync is not configured (JIRA_API_TOKEN / JIRA_BASE_URL unset)")

    async with httpx.AsyncClient(base_url=settings.jira_base_url) as client:
        resp = await client.get(
            "/rest/api/3/search",
            params={"jql": f"project = {project_key} ORDER BY updated DESC"},
            headers={"Authorization": f"Bearer {settings.jira_api_token}"},
        )
        resp.raise_for_status()
        data = resp.json()

    return [
        {
            "key": issue["key"],
            "title": issue["fields"]["summary"],
            "status": issue["fields"]["status"]["name"],
            "assignee_github_login": None,  # requires a Jira<->GitHub identity mapping
        }
        for issue in data.get("issues", [])
    ]
