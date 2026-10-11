"""
Operator Console (apps/admin) auth — deliberately its own login/refresh/
logout/me, separate from app/routers/auth.py's customer-facing endpoints.
Issues `admin_access`/`admin_refresh` tokens (app/auth/security.py) against
the `AdminAccount` table, never the customer `users` table — see
AdminAccount's docstring in app/db/models.py for why.

No self-serve signup, no OAuth, no invite flow: an AdminAccount is
provisioned directly (e.g. a one-off script / future operator-of-operators
tooling), matching the "operator accounts are provisioned directly" copy
already on the Operator Console's own login page.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import record_audit
from app.auth.dependencies import get_current_admin
from app.auth.rate_limit import client_ip, enforce_rate_limit
from app.auth.security import TokenError, create_admin_token_pair, decode_token, verify_password
from app.db.models import AdminAccount
from app.db.session import get_db
from app.schemas import AdminAccountOut, AdminTokenPair, LoginRequest, RefreshRequest

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


def _token_pair_for(admin: AdminAccount) -> dict:
    return create_admin_token_pair(admin_id=admin.id, token_version=admin.token_version)


@router.post("/login", response_model=AdminTokenPair)
async def admin_login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> AdminTokenPair:
    # Same dual-window discipline as the customer login (app/routers/auth.py)
    # — operator accounts are at least as attractive a brute-force target.
    await enforce_rate_limit(key=f"ratelimit:admin_login:ip:{client_ip(request)}", max_attempts=20, window_seconds=300)
    await enforce_rate_limit(key=f"ratelimit:admin_login:email:{payload.email.lower()}", max_attempts=10, window_seconds=900)

    result = await db.execute(select(AdminAccount).where(AdminAccount.email == payload.email))
    admin = result.scalar_one_or_none()
    if admin is None or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    admin.last_login_at = datetime.now(timezone.utc)
    await record_audit(db, actor=admin.email, action="admin.logged_in", entity_type="admin_account", entity_id=str(admin.id))
    await db.commit()
    await db.refresh(admin)
    return AdminTokenPair(**_token_pair_for(admin), admin=AdminAccountOut.model_validate(admin))


@router.post("/refresh", response_model=AdminTokenPair)
async def admin_refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AdminTokenPair:
    try:
        claims = decode_token(payload.refresh_token, expected_type="admin_refresh")
    except TokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    admin = await db.get(AdminAccount, uuid.UUID(claims["sub"]))
    if admin is None or not admin.is_active or claims.get("tv") != admin.token_version:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")

    # Rotate on every use — mitigates replay of a stolen refresh token.
    return AdminTokenPair(**_token_pair_for(admin), admin=AdminAccountOut.model_validate(admin))


@router.post("/logout")
async def admin_logout(admin: AdminAccount = Depends(get_current_admin), db: AsyncSession = Depends(get_db)) -> dict:
    admin.token_version += 1  # instantly revokes this and every other outstanding admin token
    await record_audit(db, actor=admin.email, action="admin.logged_out", entity_type="admin_account", entity_id=str(admin.id))
    await db.commit()
    return {"ok": True}


@router.get("/me", response_model=AdminAccountOut)
async def admin_me(admin: AdminAccount = Depends(get_current_admin)) -> AdminAccount:
    return admin
