"""
SSO (OIDC) login — an alternative to GitHub OAuth for Enterprise customers
with their own IdP. `?workspace=<account_login>` resolves a per-workspace IdP
(Phase 3 competitor-parity) via `WorkspaceSSOConfig`; omitted, it falls back
to the process-global OIDC_* env vars — the only option for a single-tenant/
self-hosted deployment. See app/integrations/sso_client.py.
"""
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.audit import record_audit
from app.auth.security import create_token_pair
from app.config import get_settings
from app.db.models import User
from app.db.session import AsyncSessionLocal
from app.integrations.sso_client import (
    OIDCNotConfigured,
    build_authorize_url,
    exchange_code_for_claims,
    generate_pkce_pair,
    resolve_oidc_config,
    sign_state,
    unsign_state,
)

router = APIRouter(prefix="/auth/sso", tags=["sso"])
settings = get_settings()

STATE_COOKIE = "verisprint_sso_state"


@router.get("/login")
async def sso_login(workspace: str | None = None) -> RedirectResponse:
    async with AsyncSessionLocal() as db:
        try:
            config = await resolve_oidc_config(db, workspace_account_login=workspace)
            state = secrets.token_urlsafe(24)
            code_verifier, code_challenge = generate_pkce_pair()
            authorize_url = build_authorize_url(config, state, code_challenge)
        except OIDCNotConfigured as exc:
            raise HTTPException(status_code=501, detail=str(exc)) from exc

    response = RedirectResponse(authorize_url)
    response.set_cookie(
        STATE_COOKIE,
        sign_state(state, code_verifier, workspace),
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

    async with AsyncSessionLocal() as db:
        try:
            config = await resolve_oidc_config(db, workspace_account_login=unpacked.get("workspace"))
            claims = exchange_code_for_claims(config, code, unpacked["code_verifier"])
        except OIDCNotConfigured as exc:
            raise HTTPException(status_code=501, detail=str(exc)) from exc

        subject = claims["sub"]
        email = claims.get("email")
        name = claims.get("name")

        result = await db.execute(select(User).where(User.sso_subject == subject))
        user = result.scalar_one_or_none()
        is_new = user is None
        if user is None:
            # `users.github_id` is nullable (see model docstring) — SSO users
            # simply don't have one, no placeholder needed.
            user = User(
                github_login=email or subject,
                name=name,
                email=email,
                sso_subject=subject,
                sso_provider=config.issuer,
                workspace_id=config.workspace_id,
            )
            db.add(user)
        else:
            user.name = name or user.name
            user.email = email or user.email
            if user.workspace_id is None and config.workspace_id is not None:
                user.workspace_id = config.workspace_id
        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()
        await record_audit(
            db, actor=email or subject, actor_user_id=user.id, workspace_id=user.workspace_id,
            action="user.signed_up" if is_new else "user.logged_in", entity_type="user", entity_id=str(user.id),
        )
        await db.commit()
        pair = create_token_pair(
            user_id=user.id, workspace_id=user.workspace_id, role=user.role.value, token_version=user.token_version
        )

    fragment = f"access_token={pair['access_token']}&refresh_token={pair['refresh_token']}&expires_in={pair['expires_in']}"
    response = RedirectResponse(f"{settings.web_base_url}{settings.frontend_auth_callback_path}#{fragment}")
    response.delete_cookie(STATE_COOKIE)
    return response
