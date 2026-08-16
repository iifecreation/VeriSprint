"""SSO (OIDC) login — an alternative to GitHub OAuth for Enterprise customers with their own IdP."""
import hashlib
import secrets

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.config import get_settings
from app.db.models import User
from app.db.session import AsyncSessionLocal
from app.integrations.sso_client import (
    OIDCNotConfigured,
    build_authorize_url,
    exchange_code_for_claims,
    generate_pkce_pair,
    sign_state,
    unsign_state,
)

router = APIRouter(prefix="/auth/sso", tags=["sso"])
settings = get_settings()

STATE_COOKIE = "verisprint_sso_state"


@router.get("/login")
async def sso_login() -> RedirectResponse:
    try:
        state = secrets.token_urlsafe(24)
        code_verifier, code_challenge = generate_pkce_pair()
        authorize_url = build_authorize_url(state, code_challenge)
    except OIDCNotConfigured as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc

    response = RedirectResponse(authorize_url)
    response.set_cookie(
        STATE_COOKIE,
        sign_state(state, code_verifier),
        httponly=True,
        secure=settings.env != "development",
        samesite="lax",
        max_age=600,
    )
    return response


@router.get("/callback")
async def sso_callback(request: Request, code: str, state: str) -> RedirectResponse:
    cookie = request.cookies.get(STATE_COOKIE)
    if not cookie:
        raise HTTPException(status_code=400, detail="Missing SSO state cookie — restart the login flow")
    try:
        unpacked = unsign_state(cookie)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid or expired SSO state") from exc

    if unpacked["state"] != state:
        raise HTTPException(status_code=400, detail="SSO state mismatch — possible CSRF, restart the login flow")

    try:
        claims = exchange_code_for_claims(code, unpacked["code_verifier"])
    except OIDCNotConfigured as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc

    subject = claims["sub"]
    email = claims.get("email")
    name = claims.get("name")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.sso_subject == subject))
        user = result.scalar_one_or_none()
        if user is None:
            # SSO users have no GitHub identity. `users.github_id` is unique/non-null,
            # so derive a stable placeholder from the OIDC subject via a real hash
            # (never Python's built-in hash() — that's process-randomized by default
            # and would silently break lookups across restarts).
            placeholder_github_id = int.from_bytes(hashlib.sha256(subject.encode()).digest()[:4], "big") % (2**31)
            user = User(
                github_id=placeholder_github_id,
                github_login=email or subject,
                name=name,
                email=email,
                sso_subject=subject,
                sso_provider=settings.oidc_issuer,
            )
            db.add(user)
        else:
            user.name = name or user.name
            user.email = email or user.email
        await db.commit()

    response = RedirectResponse(f"{settings.web_base_url}/dashboard")
    response.delete_cookie(STATE_COOKIE)
    return response
