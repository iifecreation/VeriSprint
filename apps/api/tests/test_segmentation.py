"""Team & Service segmentation (Phase 7) — auth/dependencies.get_repo_ids_for_scope, metrics.py author_logins."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.auth.dependencies import get_repo_ids_for_scope
from app.db.models import Repo, Service, Team, User, UserRole
from app.metrics import compute_efficiency_metrics

from conftest import make_pr, unique_int

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


@pytest.fixture
async def user(db, workspace):
    u = User(github_id=unique_int(), github_login="tester", role=UserRole.WORKSPACE_ADMIN, workspace_id=workspace.id)
    db.add(u)
    await db.flush()
    return u


async def test_service_scope_resolves_to_member_repos_only(db, workspace, repo, user):
    other_repo = Repo(workspace_id=workspace.id, github_repo_id=unique_int(), full_name=f"test-org/other-{unique_int()}")
    db.add(other_repo)
    await db.flush()

    service = Service(workspace_id=workspace.id, name="Checkout")
    db.add(service)
    await db.flush()
    repo.service_id = service.id
    await db.commit()

    repo_ids = await get_repo_ids_for_scope(repo_id=None, service_id=service.id, user=user, db=db)
    assert set(repo_ids) == {repo.id}
    assert other_repo.id not in repo_ids


async def test_repo_id_path_unchanged(db, repo, user):
    repo_ids = await get_repo_ids_for_scope(repo_id=repo.id, service_id=None, user=user, db=db)
    assert repo_ids == [repo.id]


async def test_exactly_one_of_repo_id_or_service_id_required(db, user):
    with pytest.raises(HTTPException) as exc_info:
        await get_repo_ids_for_scope(repo_id=None, service_id=None, user=user, db=db)
    assert exc_info.value.status_code == 400


async def test_service_scoped_metrics_aggregate_across_member_repos(db, workspace, repo, user):
    repo_b = Repo(workspace_id=workspace.id, github_repo_id=unique_int(), full_name=f"test-org/repo-b-{unique_int()}")
    db.add(repo_b)
    await db.flush()
    service = Service(workspace_id=workspace.id, name="Checkout")
    db.add(service)
    await db.flush()
    repo.service_id = service.id
    repo_b.service_id = service.id
    db.add(make_pr(repo.id, 1, "alice", additions=10, opened_at=BASE))
    db.add(make_pr(repo_b.id, 1, "bob", additions=20, opened_at=BASE))
    await db.commit()

    repo_ids = await get_repo_ids_for_scope(repo_id=None, service_id=service.id, user=user, db=db)
    m = await compute_efficiency_metrics(db, repo_ids, BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.merged_pr_count == 2
    assert m.pr_size_lines == 15.0


async def test_team_filter_scopes_to_member_logins_across_repos(db, workspace, repo, user):
    team = Team(workspace_id=workspace.id, name="Platform", member_github_logins=["alice", "carol"])
    db.add(team)
    db.add(make_pr(repo.id, 1, "alice", additions=10, opened_at=BASE))
    db.add(make_pr(repo.id, 2, "bob", additions=500, opened_at=BASE))
    db.add(make_pr(repo.id, 3, "carol", additions=30, opened_at=BASE))
    await db.commit()

    m = await compute_efficiency_metrics(
        db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1), author_logins=team.member_github_logins
    )
    assert m.merged_pr_count == 2  # alice + carol, bob excluded
    assert m.pr_size_lines == 20.0
