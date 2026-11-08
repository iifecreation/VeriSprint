"""
Auth service (spec Section 6): GitHub OAuth (primary), email/password
(fallback), invites, password reset, and the JWT session endpoints every
other router will depend on once task #23 retrofits RBAC onto them.

Two identity paths converge on the same `User` row and the same token
issuance (`app.auth.security.create_token_pair`):
  - GitHub OAuth (`/auth/github/*`) — the primary path; `_link_workspace`
    best-effort-attaches a first-time user to a workspace they installed the
    App for, or a GitHub org they belong to that already has one.
  - Email/password (`/auth/login`) — the fallback path (spec: "email/password
    as fallback"), reachable only via an invite (`/auth/invite`) issued by a
    workspace admin, or self-service password reset for an existing account.

Redirect-based flows (OAuth/SSO) hand the token pair to the SPA via a URL
*fragment* (`#access_token=...`) rather than a query string — fragments never
reach the server or access logs.
"""
import hmac
import logging
import secrets
import time
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit, record_audit_for_user
from app.auth.dependencies import ensure_workspace_access, get_current_user, require_role
from app.auth.rate_limit import _client as _redis, client_ip, enforce_rate_limit, limit_per_user
from app.auth.security import (
    TokenError,
    create_action_token,
    create_token_pair,
    decode_action_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.config import get_settings
from app.db.models import User, UserRole, Workspace
from app.db.session import get_db
from app.integrations.email_client import send_email
from app.schemas import (
    ChangeRoleRequest,
    InviteUserRequest,
    LoginRequest,
    RefreshRequest,
    RequestPasswordResetRequest,
    SetPasswordRequest,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
logger = logging.getLogger(__name__)

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_ORGS_URL = "https://api.github.com/user/orgs"
OAUTH_STATE_COOKIE = "verisprint_gh_oauth_state"
# Verifying against a real hash when the email doesn't exist keeps login
# timing identical either way, so response time can't reveal which emails
# have accounts.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))
# Two browser tabs can race to refresh with the same token; a second use
# within this window is refused but not treated as theft.
_REFRESH_REUSE_GRACE_SECONDS = 60


def _token_pair_for(user: User) -> dict:
    return create_token_pair(
        user_id=user.id, workspace_id=user.workspace_id, role=user.role.value, token_version=user.token_version
    )


def _redirect_with_tokens(pair: dict) -> RedirectResponse:
    fragment = f"access_token={pair['access_token']}&refresh_token={pair['refresh_token']}&expires_in={pair['expires_in']}"
    return RedirectResponse(f"{settings.web_base_url}{settings.frontend_auth_callback_path}#{fragment}")


async def _link_workspace_if_possible(db: AsyncSession, user: User, github_access_token: str) -> None:
    """Best-effort: attach a first-time GitHub-OAuth user to a workspace. Real
    lookups only — if nothing matches, `workspace_id` stays null and the user
    lands on a "waiting for a workspace" screen until a workspace admin
    invites them or they install the GitHub App themselves."""
    if user.workspace_id is not None:
        return

    result = await db.execute(select(Workspace).where(Workspace.account_login == user.github_login))
    workspace = result.scalar_one_or_none()
    if workspace is not None:
        user.workspace_id = workspace.id
        user.role = UserRole.WORKSPACE_ADMIN if workspace.installed_by_user_id in (None, user.id) else UserRole.MANAGER
        return

    try:
        async with httpx.AsyncClient() as client:
            orgs_resp = await client.get(
                GITHUB_ORGS_URL, headers={"Authorization": f"Bearer {github_access_token}"}, timeout=10
            )
            orgs_resp.raise_for_status()
            org_logins = [org["login"] for org in orgs_resp.json()]
    except httpx.HTTPError:
        return  # GitHub API hiccup — leave unassigned rather than guess

    if not org_logins:
        return
    result = await db.execute(select(Workspace).where(Workspace.account_login.in_(org_logins)))
    matches = result.scalars().all()
    if len(matches) == 1:
        user.workspace_id = matches[0].id
        user.role = UserRole.DEVELOPER  # least-privilege; a workspace admin can promote


@router.get("/github/login")
async def github_login() -> RedirectResponse:
    # `state` ties the callback to this browser (OAuth CSRF protection):
    # without it, an attacker could log a victim into the attacker's account.
    state = secrets.token_urlsafe(32)
    params = (
        f"client_id={settings.github_client_id}"
        f"&redirect_uri={settings.api_base_url}/auth/github/callback"
        f"&scope=read:user%20read:org"
        f"&state={state}"
    )
    response = RedirectResponse(f"{GITHUB_AUTHORIZE_URL}?{params}")
    response.set_cookie(
        OAUTH_STATE_COOKIE, state, httponly=True, secure=settings.is_production, samesite="lax",
        max_age=600, path="/auth/github",
    )
    return response


@router.get("/github/callback")
async def github_callback(request: Request, code: str, state: str | None = None, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    expected_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not state or not expected_state or not hmac.compare_digest(state, expected_state):
        return RedirectResponse(f"{settings.web_base_url}/login?error=oauth_state")
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
        github_access_token = token_resp.json().get("access_token") if token_resp.is_success else None
        if not github_access_token:
            return RedirectResponse(f"{settings.web_base_url}/login?error=oauth_failed")

        user_resp = await client.get(
            GITHUB_USER_URL, headers={"Authorization": f"Bearer {github_access_token}"}
        )
        user_resp.raise_for_status()
        gh_user = user_resp.json()

    result = await db.execute(select(User).where(User.github_id == gh_user["id"]))
    user = result.scalar_one_or_none()
    is_new = user is None
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
    else:
        user.github_login = gh_user["login"]
        user.name = gh_user.get("name") or user.name
        user.avatar_url = gh_user.get("avatar_url") or user.avatar_url

    await _link_workspace_if_possible(db, user, github_access_token)
    user.last_login_at = datetime.now(timezone.utc)
    await db.flush()
    await record_audit(
        db, actor=user.github_login or str(user.id), actor_user_id=user.id, workspace_id=user.workspace_id,
        action="user.signed_up" if is_new else "user.logged_in", entity_type="user", entity_id=str(user.id),
    )
    await db.commit()

    response = _redirect_with_tokens(_token_pair_for(user))
    response.delete_cookie(OAUTH_STATE_COOKIE, path="/auth/github")
    return response


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    # Two windows: by IP (catches one attacker spraying many emails) and by
    # email (catches distributed brute force against one account) — either
    # one tripping is enough to block this attempt.
    await enforce_rate_limit(key=f"ratelimit:login:ip:{client_ip(request)}", max_attempts=20, window_seconds=300)
    await enforce_rate_limit(key=f"ratelimit:login:email:{payload.email.lower()}", max_attempts=10, window_seconds=900)

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    password_ok = verify_password(payload.password, user.password_hash if user and user.password_hash else _DUMMY_PASSWORD_HASH)
    if user is None or user.password_hash is None or not password_ok:
        logger.info("Failed login for %s from %s", payload.email.lower(), client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.last_login_at = datetime.now(timezone.utc)
    await record_audit_for_user(db, user=user, action="user.logged_in", entity_type="user", entity_id=str(user.id))
    await db.commit()
    await db.refresh(user)
    return TokenPair(**_token_pair_for(user), user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    await enforce_rate_limit(key=f"ratelimit:refresh:ip:{client_ip(request)}", max_attempts=60, window_seconds=900)
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    user = await db.get(User, uuid.UUID(claims["sub"]))
    if user is None or claims.get("tv") != user.token_version:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    # Refresh tokens are single-use. A token presented twice means it was
    # copied: outside a short grace window (two tabs racing), revoke every
    # session for this user so a stolen token stops working immediately.
    jti = claims.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Invalid token")
    ttl = max(int(claims["exp"] - time.time()), 1)
    try:
        first_use = await _redis().set(f"refresh:used:{jti}", str(int(time.time())), nx=True, ex=ttl)
        used_at = None if first_use else await _redis().get(f"refresh:used:{jti}")
    except Exception as exc:
        if settings.is_production:
            raise HTTPException(status_code=503, detail="Temporarily unavailable — please try again shortly.") from exc
        first_use, used_at = True, None
    if not first_use:
        if used_at and time.time() - int(used_at) > _REFRESH_REUSE_GRACE_SECONDS:
            user.token_version += 1
            await record_audit_for_user(db, user=user, action="user.refresh_token_reuse_detected", entity_type="user", entity_id=str(user.id))
            await db.commit()
            logger.warning("Refresh token reuse detected for user %s — all sessions revoked", user.id)
        raise HTTPException(status_code=401, detail="Refresh token has already been used")

    return TokenPair(**_token_pair_for(user), user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    user.token_version += 1  # instantly revokes this and every other outstanding token
    await record_audit_for_user(db, user=user, action="user.logged_out", entity_type="user", entity_id=str(user.id))
    await db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/invite")
async def invite_user(
    payload: InviteUserRequest,
    request: Request,
    inviter: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Each invite sends a real email — cap it so a compromised admin
    # account can't be used to spam.
    await limit_per_user(request, scope="invite", user_id=inviter.id, max_attempts=30, window_seconds=3600)
    if inviter.workspace_id is None:
        raise HTTPException(status_code=400, detail="Your account isn't attached to a workspace")
    try:
        role = UserRole(payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown role: {payload.role}") from exc
    if role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin accounts can't be granted via workspace invites")

    result = await db.execute(select(User).where(User.email == payload.email))
    invitee = result.scalar_one_or_none()
    if invitee is not None:
        if invitee.workspace_id is not None and invitee.workspace_id != inviter.workspace_id:
            raise HTTPException(status_code=409, detail="This person already belongs to another workspace")
        invitee.workspace_id = inviter.workspace_id
        invitee.role = role
        invitee.name = payload.name or invitee.name
    else:
        invitee = User(email=payload.email, name=payload.name, role=role, workspace_id=inviter.workspace_id)
        db.add(invitee)
    await db.flush()

    action_token = create_action_token(user_id=invitee.id, purpose="invite", token_version=invitee.token_version)
    invite_url = f"{settings.web_base_url}/accept-invite?token={action_token}"
    try:
        send_email(
            to=payload.email,
            subject="You've been invited to VeriSprint",
            text=f"{inviter.name or inviter.github_login or inviter.email} invited you to their VeriSprint workspace.\n\nAccept: {invite_url}\n\nThis link expires in 7 days.",
        )
    except RuntimeError as exc:
        logger.error("Invite email failed to send: %s", exc)
        raise HTTPException(
            status_code=503, detail="Email sending isn't set up yet, so the invite couldn't be sent. Please contact support."
        ) from exc
    await record_audit_for_user(
        db, user=inviter, action="user.invited", entity_type="user", entity_id=str(invitee.id),
        after={"email": payload.email, "role": role.value},
    )
    await db.commit()
    return {"ok": True, "email": payload.email}


@router.get("/users", response_model=list[UserOut])
async def list_workspace_users(
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)), db: AsyncSession = Depends(get_db)
) -> list[User]:
    if admin.workspace_id is None:
        return []
    result = await db.execute(select(User).where(User.workspace_id == admin.workspace_id))
    return list(result.scalars().all())


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: uuid.UUID,
    payload: ChangeRoleRequest,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    target = await db.get(User, user_id)
    if target is None or target.workspace_id is None:
        raise HTTPException(status_code=404, detail="User not found")
    ensure_workspace_access(admin, target.workspace_id)

    try:
        new_role = UserRole(payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Unknown role: {payload.role}") from exc
    if new_role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin accounts can't be granted this way")
    if target.id == admin.id and new_role != admin.role:
        raise HTTPException(status_code=400, detail="You can't change your own role")

    before = {"role": target.role.value}
    target.role = new_role
    target.token_version += 1  # force re-login so the new role takes effect immediately, not after 15 min
    await record_audit_for_user(
        db, user=admin, action="user.role_changed", entity_type="user", entity_id=str(target.id),
        before=before, after={"role": new_role.value},
    )
    await db.commit()
    await db.refresh(target)
    return UserOut.model_validate(target)


@router.delete("/users/{user_id}")
async def remove_user_from_workspace(
    user_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.WORKSPACE_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    target = await db.get(User, user_id)
    if target is None or target.workspace_id is None:
        raise HTTPException(status_code=404, detail="User not found")
    ensure_workspace_access(admin, target.workspace_id)
    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="You can't remove yourself")

    before = {"workspace_id": str(target.workspace_id), "role": target.role.value}
    target.workspace_id = None
    target.token_version += 1  # instantly ends any of their active sessions
    await record_audit_for_user(
        db, user=admin, action="user.removed_from_workspace", entity_type="user", entity_id=str(target.id), before=before,
    )
    await db.commit()
    return {"ok": True}


@router.post("/accept-invite", response_model=TokenPair)
async def accept_invite(payload: SetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    await enforce_rate_limit(key=f"ratelimit:setpw:ip:{client_ip(request)}", max_attempts=20, window_seconds=3600)
    try:
        claims = decode_action_token(payload.token, expected_purpose="invite")
    except TokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = await db.get(User, uuid.UUID(claims["sub"]))
    if user is None or claims.get("tv") != user.token_version:
        raise HTTPException(status_code=400, detail="This invite link is no longer valid")

    user.password_hash = hash_password(payload.password)
    user.token_version += 1
    user.last_login_at = datetime.now(timezone.utc)
    await record_audit_for_user(db, user=user, action="user.accepted_invite", entity_type="user", entity_id=str(user.id))
    await db.commit()
    await db.refresh(user)
    return TokenPair(**_token_pair_for(user), user=UserOut.model_validate(user))


@router.post("/request-password-reset")
async def request_password_reset(payload: RequestPasswordResetRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    # Tighter than login — each attempt sends a real email if the account
    # exists, so this doubles as spam/cost control, not just brute-force
    # protection.
    await enforce_rate_limit(key=f"ratelimit:pwreset:ip:{client_ip(request)}", max_attempts=5, window_seconds=3600)
    await enforce_rate_limit(key=f"ratelimit:pwreset:email:{payload.email.lower()}", max_attempts=3, window_seconds=3600)

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is not None:
        action_token = create_action_token(user_id=user.id, purpose="password_reset", token_version=user.token_version)
        reset_url = f"{settings.web_base_url}/reset-password?token={action_token}"
        try:
            send_email(
                to=payload.email,
                subject="Reset your VeriSprint password",
                text=f"Reset your password: {reset_url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
            )
        except RuntimeError:
            # Don't reveal via a 503 that this email *did* match an account —
            # log server-side and keep the response uniform either way.
            logger.error("Password reset email failed to send (RESEND_API_KEY not configured?)")
    # Always the same response — don't reveal whether this email has an account.
    return {"ok": True, "message": "If that email has an account, a reset link was sent."}


@router.post("/reset-password", response_model=TokenPair)
async def reset_password(payload: SetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    await enforce_rate_limit(key=f"ratelimit:setpw:ip:{client_ip(request)}", max_attempts=20, window_seconds=3600)
    try:
        claims = decode_action_token(payload.token, expected_purpose="password_reset")
    except TokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = await db.get(User, uuid.UUID(claims["sub"]))
    if user is None or claims.get("tv") != user.token_version:
        raise HTTPException(status_code=400, detail="This reset link is no longer valid")

    user.password_hash = hash_password(payload.password)
    user.token_version += 1
    await record_audit_for_user(db, user=user, action="user.reset_password", entity_type="user", entity_id=str(user.id))
    await db.commit()
    await db.refresh(user)
    return TokenPair(**_token_pair_for(user), user=UserOut.model_validate(user))
