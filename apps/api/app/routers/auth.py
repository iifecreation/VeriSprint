"""
GitHub OAuth login (Step 1).

Separate from the GitHub App install flow in `github_app.py`: this router
authenticates a *user* (for dashboard/API access); the App install flow grants
*repo* access (read-only scopes for MVP).
"""
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import User
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


@router.get("/github/login")
async def github_login() -> RedirectResponse:
    params = (
        f"client_id={settings.github_client_id}"
        f"&redirect_uri={settings.api_base_url}/auth/github/callback"
        f"&scope=read:user"
    )
    return RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{params}")


@router.get("/github/callback")
async def github_callback(code: str, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth exchange failed")

        user_resp = await client.get(
            GITHUB_USER_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == gh_user["id"]))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=uuid.uuid4(),
            github_id=gh_user["id"],
            github_login=gh_user["login"],
            name=gh_user.get("name"),
            email=gh_user.get("email"),
            avatar_url=gh_user.get("avatar_url"),
        )
        db.add(user)
        await db.commit()

    # TODO: issue a session cookie / JWT here instead of a bare redirect.
    return RedirectResponse(f"{settings.web_base_url}/dashboard")
