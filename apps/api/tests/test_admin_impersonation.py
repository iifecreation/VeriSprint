"""
Operator Console "view as this workspace" (impersonation) —
app/routers/admin.py's impersonate_workspace. Picks a real target user
rather than a synthetic identity, so every existing authorization path
(ensure_workspace_access, user.workspace_id defaults) just works. The caller
is an AdminAccount (app/db/models.py) — a table deliberately separate from
the customer `users` table, not a User with a super_admin role.
"""
import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.auth.security import decode_token
from app.db.models import AdminAccount, User, UserRole
from app.routers.admin import get_workspace_repos, get_workspace_subscription, impersonate_workspace

from conftest import unique_int


@pytest.fixture
async def admin_account(db):
    n = unique_int()
    a = AdminAccount(email=f"admin-tester-{n}@example.com", password_hash="unused-in-tests")
    db.add(a)
    await db.flush()

    yield a

    await db.execute(text("DELETE FROM audit_log_entries WHERE actor = :actor"), {"actor": a.email})
    await db.execute(text("DELETE FROM admin_accounts WHERE id = :id"), {"id": a.id})
    await db.commit()


async def test_impersonate_picks_the_workspace_admin_over_other_roles(db, workspace, admin_account):
    developer = User(github_id=unique_int(), github_login="dev1", role=UserRole.DEVELOPER, workspace_id=workspace.id)
    ws_admin = User(github_id=unique_int(), github_login="admin1", role=UserRole.WORKSPACE_ADMIN, workspace_id=workspace.id)
    db.add(developer)
    db.add(ws_admin)
    await db.commit()

    result = await impersonate_workspace(workspace.id, admin=admin_account, db=db)

    assert result.target_user_id == ws_admin.id
    assert result.target_user_role == "workspace_admin"
    claims = decode_token(result.access_token, expected_type="access")
    assert claims["sub"] == str(ws_admin.id)
    assert claims["impersonated_by"] == str(admin_account.id)


async def test_impersonate_falls_back_to_a_non_client_user_without_a_workspace_admin(db, workspace, admin_account):
    client = User(github_id=unique_int(), github_login="client1", role=UserRole.CLIENT, workspace_id=workspace.id)
    manager = User(github_id=unique_int(), github_login="mgr1", role=UserRole.MANAGER, workspace_id=workspace.id)
    db.add(client)
    db.add(manager)
    await db.commit()

    result = await impersonate_workspace(workspace.id, admin=admin_account, db=db)
    assert result.target_user_id == manager.id


async def test_impersonate_404s_when_no_eligible_user_exists(db, workspace, admin_account):
    with pytest.raises(HTTPException) as exc_info:
        await impersonate_workspace(workspace.id, admin=admin_account, db=db)
    assert exc_info.value.status_code == 404


async def test_impersonate_404s_for_a_missing_workspace(db, admin_account):
    import uuid

    with pytest.raises(HTTPException) as exc_info:
        await impersonate_workspace(uuid.uuid4(), admin=admin_account, db=db)
    assert exc_info.value.status_code == 404


async def test_workspace_repos_scoped_to_that_workspace_only(db, workspace, repo, admin_account, other_workspace):
    from app.db.models import Repo

    foreign_repo = Repo(workspace_id=other_workspace.id, github_repo_id=unique_int(), full_name=f"foreign/{unique_int()}")
    db.add(foreign_repo)
    await db.commit()

    repos = await get_workspace_repos(workspace.id, admin=admin_account, db=db)
    assert [r.id for r in repos] == [repo.id]


async def test_workspace_subscription_is_none_when_unset(db, workspace, admin_account):
    assert await get_workspace_subscription(workspace.id, admin=admin_account, db=db) is None


async def test_impersonation_audit_entry_is_scoped_to_the_workspace(db, workspace, admin_account):
    """Regression: the audit entry must carry workspace_id, or the Operator
    Console's per-workspace "Recent activity" (GET /admin/audit?workspace_id=)
    never shows it — found by clicking through the actual page."""
    ws_admin = User(github_id=unique_int(), github_login="wsadmin-audit", role=UserRole.WORKSPACE_ADMIN, workspace_id=workspace.id)
    db.add(ws_admin)
    await db.commit()

    await impersonate_workspace(workspace.id, admin=admin_account, db=db)

    result = await db.execute(
        text("SELECT workspace_id FROM audit_log_entries WHERE action = 'admin.impersonation_started' AND actor = :actor"),
        {"actor": admin_account.email},
    )
    row = result.one()
    assert row.workspace_id == workspace.id
