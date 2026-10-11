"""
Operator Console auth (app/routers/admin_auth.py) — a login/refresh/logout/me
surface deliberately separate from app/routers/auth.py's customer endpoints,
issuing `admin_access`/`admin_refresh` tokens against the AdminAccount table.
The key property under test: an admin token and a customer token are never
interchangeable, even though both are signed with the same JWT secret.
"""
import pytest
from fastapi import HTTPException, Request
from sqlalchemy import text

from app.auth.dependencies import get_current_admin, get_current_user
from app.auth.security import create_access_token, create_admin_access_token, decode_token, hash_password
from app.db.models import AdminAccount, User, UserRole
from app.routers.admin_auth import admin_login, admin_logout, admin_me, admin_refresh
from app.schemas import LoginRequest, RefreshRequest

from conftest import unique_int

PASSWORD = "correct horse battery staple"


def _fake_request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/admin/auth/login", "headers": [], "client": ("127.0.0.1", 12345)})


@pytest.fixture
async def admin_account(db):
    n = unique_int()
    a = AdminAccount(email=f"admin-auth-tester-{n}@example.com", password_hash=hash_password(PASSWORD))
    db.add(a)
    await db.commit()

    yield a

    await db.execute(text("DELETE FROM audit_log_entries WHERE actor = :actor"), {"actor": a.email})
    await db.execute(text("DELETE FROM admin_accounts WHERE email = :e"), {"e": a.email})
    await db.commit()


async def test_login_succeeds_with_correct_password(db, admin_account):
    pair = await admin_login(LoginRequest(email=admin_account.email, password=PASSWORD), _fake_request(), db)
    assert pair.admin.email == admin_account.email
    claims = decode_token(pair.access_token, expected_type="admin_access")
    assert claims["sub"] == str(admin_account.id)


async def test_login_rejects_wrong_password(db, admin_account):
    with pytest.raises(HTTPException) as exc_info:
        await admin_login(LoginRequest(email=admin_account.email, password="wrong"), _fake_request(), db)
    assert exc_info.value.status_code == 401


async def test_login_rejects_unknown_email(db):
    with pytest.raises(HTTPException) as exc_info:
        await admin_login(LoginRequest(email="nobody@example.com", password=PASSWORD), _fake_request(), db)
    assert exc_info.value.status_code == 401


async def test_refresh_issues_a_new_pair_and_logout_revokes_it(db, admin_account):
    pair = await admin_login(LoginRequest(email=admin_account.email, password=PASSWORD), _fake_request(), db)
    refreshed = await admin_refresh(RefreshRequest(refresh_token=pair.refresh_token), db)
    assert refreshed.admin.id == admin_account.id

    await admin_logout(admin=admin_account, db=db)
    with pytest.raises(HTTPException) as exc_info:
        await admin_refresh(RefreshRequest(refresh_token=pair.refresh_token), db)
    assert exc_info.value.status_code == 401


async def test_me_returns_the_authenticated_admin(admin_account, db):
    result = await admin_me(admin=admin_account)
    assert result.id == admin_account.id


async def test_get_current_admin_rejects_a_customer_access_token(db, workspace):
    """The core separation guarantee: a regular customer User's access token
    must never authenticate as an AdminAccount, even for a user who (pre
    full-separation) still carries a stale SUPER_ADMIN role in the DB."""
    user = User(github_id=unique_int(), github_login="stale-super-admin", role=UserRole.SUPER_ADMIN, workspace_id=None)
    db.add(user)
    await db.commit()

    customer_token = create_access_token(user_id=user.id, workspace_id=None, role=user.role.value, token_version=0)

    class _Creds:
        credentials = customer_token

    with pytest.raises(HTTPException) as exc_info:
        await get_current_admin(_Creds(), db)
    assert exc_info.value.status_code == 401

    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user.id})
    await db.commit()


async def test_get_current_user_rejects_an_admin_access_token(db, admin_account):
    """The reverse of the above: an admin's token must never authenticate
    as a customer User."""
    token = create_admin_access_token(admin_id=admin_account.id, token_version=admin_account.token_version)

    class _Creds:
        credentials = token

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(_Creds(), db)
    assert exc_info.value.status_code == 401
