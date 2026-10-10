"""
Cross-tenant isolation regression tests for the Phase 7 Service/Repo
segmentation feature — app/routers/repos.py's update_repo, and
app/routers/services.py's _service_out/delete_service. Covers the security
review finding: a repo could be linked to another workspace's Service, and
that Service's own endpoints then leaked/mutated the foreign repo.
"""
import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import Repo, Service, User, UserRole
from app.db.session import AsyncSessionLocal
from app.routers.repos import update_repo
from app.routers.services import _service_out, delete_service
from app.schemas import RepoUpdate

from conftest import unique_int


@pytest.fixture
async def user(db, workspace):
    u = User(github_id=unique_int(), github_login="tester", role=UserRole.WORKSPACE_ADMIN, workspace_id=workspace.id)
    db.add(u)
    await db.flush()
    return u


async def test_update_repo_rejects_service_from_another_workspace(db, repo, user, other_workspace):
    foreign_service = Service(workspace_id=other_workspace.id, name="Foreign Service")
    db.add(foreign_service)
    await db.flush()

    with pytest.raises(HTTPException) as exc_info:
        await update_repo(RepoUpdate(service_id=foreign_service.id), repo=repo, user=user, db=db)
    assert exc_info.value.status_code == 404


async def test_update_repo_accepts_service_from_same_workspace(db, workspace, repo, user):
    service = Service(workspace_id=workspace.id, name="Checkout")
    db.add(service)
    await db.flush()

    updated = await update_repo(RepoUpdate(service_id=service.id), repo=repo, user=user, db=db)
    assert updated.service_id == service.id


async def test_service_out_does_not_leak_a_foreign_workspace_repo(db, workspace, repo, user, other_workspace):
    # Simulate a pre-existing cross-tenant link (bypassing update_repo's own
    # validation, e.g. from before the fix) to prove the read path itself is
    # also defended, not just the write path.
    service = Service(workspace_id=workspace.id, name="Checkout")
    db.add(service)
    await db.flush()

    foreign_repo = Repo(
        workspace_id=other_workspace.id, github_repo_id=unique_int(),
        full_name=f"test-org/foreign-{unique_int()}", service_id=service.id,
    )
    db.add(foreign_repo)
    repo.service_id = service.id
    await db.commit()

    out = await _service_out(db, service)
    assert out.repo_ids == [repo.id]
    assert foreign_repo.id not in out.repo_ids


async def test_delete_service_does_not_unset_a_foreign_workspace_repos_service_id(db, workspace, repo, user, other_workspace):
    # Simulates a pre-existing cross-tenant link (as if created before the
    # update_repo validation fix). delete_service must not silently write to
    # a repo outside the service's own workspace — it's fine (and safer)
    # for the DB's own FK constraint to then block the delete outright,
    # rather than succeed by unsetting a foreign tenant's data.
    service = Service(workspace_id=workspace.id, name="Checkout")
    db.add(service)
    await db.flush()

    foreign_repo = Repo(
        workspace_id=other_workspace.id, github_repo_id=unique_int(),
        full_name=f"test-org/foreign-{unique_int()}", service_id=service.id,
    )
    db.add(foreign_repo)
    repo.service_id = service.id
    await db.commit()

    # Run the doomed delete on its own session/transaction, not the shared
    # fixture `db` — a rollback on `db` would expire every object the
    # workspace/other_workspace fixtures still need for their own teardown
    # (same flakiness the project's conftest docstring already warns about).
    async with AsyncSessionLocal() as isolated_db:
        isolated_service = await isolated_db.get(Service, service.id)
        isolated_user = await isolated_db.get(User, user.id)
        with pytest.raises(IntegrityError):
            await delete_service(service=isolated_service, user=isolated_user, db=isolated_db)

    result = await db.execute(select(Repo.service_id).where(Repo.id == foreign_repo.id))
    assert result.scalar_one() == service.id
