"""
Shared pytest fixtures: every test gets a real `AsyncSession` against the
same local Postgres instance app/db/session.py uses (DATABASE_URL from
.env) — genuine SQL, not a mock, not SQLite. Needs the real dev Postgres
running (`docker-compose up -d` from the repo root) and migrated (`alembic
upgrade head`) — same prerequisite as running the app itself, not a
separate test database.

Isolation is explicit cleanup, not a rolled-back transaction: an
AsyncSession-per-savepoint pattern was tried first and proved flaky with
this driver stack (asyncpg + greenlet), repeatedly throwing "another
operation is in progress" on teardown. Explicit cascade-delete is the same
pattern every manual verification pass during this project's development
already used successfully (see README's "What's genuinely verified"
section) — the `workspace` fixture deletes everything it created, in FK
order, whether or not the test itself called `db.commit()`.
"""
import itertools
import random
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PullRequest, Repo, Ticket, Workspace
from app.db.session import AsyncSessionLocal

_id_counter = itertools.count(random.randint(10_000_000, 99_000_000))


def unique_int() -> int:
    """A fresh int per call, unique within this test process — for columns
    like github_installation_id/github_repo_id that carry a unique index."""
    return next(_id_counter)


@pytest_asyncio.fixture
async def db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session


# Tables with their own direct `repo_id` column — child -> ... -> parent,
# FK-safe order for tearing down everything a test might have created off
# one repo. New Phase tables get appended here, not inserted into the
# per-test bodies — one place to keep current.
_CLEANUP_TABLES_BY_REPO = [
    "deployments", "audit_log_entries", "team_goals", "tickets", "commits", "pull_requests", "sprints",
]
_CLEANUP_TABLES_BY_WORKSPACE = ["team_goals", "teams", "services", "audit_log_entries", "users"]
# Tables one join away from repo_id — cleaned up before _CLEANUP_TABLES_BY_REPO
# deletes their parent row.
_CLEANUP_JOINED_DELETES = [
    "DELETE FROM pull_request_reviews WHERE pull_request_id IN ("
    "SELECT id FROM pull_requests WHERE repo_id IN (SELECT id FROM repos WHERE workspace_id = :w))",
    "DELETE FROM ticket_status_changes WHERE ticket_id IN ("
    "SELECT id FROM tickets WHERE repo_id IN (SELECT id FROM repos WHERE workspace_id = :w))",
]


@pytest_asyncio.fixture
async def workspace(db) -> AsyncIterator[Workspace]:
    ws = Workspace(name="test-workspace", github_installation_id=unique_int(), account_login=f"test-{unique_int()}")
    db.add(ws)
    await db.flush()
    await db.commit()

    yield ws

    for stmt in _CLEANUP_JOINED_DELETES:
        await db.execute(text(stmt), {"w": ws.id})
    for table in _CLEANUP_TABLES_BY_REPO:
        await db.execute(
            text(f"DELETE FROM {table} WHERE repo_id IN (SELECT id FROM repos WHERE workspace_id = :w)"),  # table name from a fixed internal list, never user input
            {"w": ws.id},
        )
    # Unset repos.service_id (Phase 7) before deleting `services` below — the
    # FK the other direction would otherwise block it.
    await db.execute(text("UPDATE repos SET service_id = NULL WHERE workspace_id = :w"), {"w": ws.id})
    for table in _CLEANUP_TABLES_BY_WORKSPACE:
        await db.execute(text(f"DELETE FROM {table} WHERE workspace_id = :w"), {"w": ws.id})
    await db.execute(text("DELETE FROM repos WHERE workspace_id = :w"), {"w": ws.id})
    await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws.id})
    await db.commit()


@pytest_asyncio.fixture
async def other_workspace(db) -> AsyncIterator[Workspace]:
    """A second, independent workspace — for cross-tenant isolation tests.
    Same teardown discipline as `workspace`, just not reused as broadly."""
    ws = Workspace(name="other-test-workspace", github_installation_id=unique_int(), account_login=f"test-{unique_int()}")
    db.add(ws)
    await db.flush()
    await db.commit()

    yield ws

    for stmt in _CLEANUP_JOINED_DELETES:
        await db.execute(text(stmt), {"w": ws.id})
    for table in _CLEANUP_TABLES_BY_REPO:
        await db.execute(
            text(f"DELETE FROM {table} WHERE repo_id IN (SELECT id FROM repos WHERE workspace_id = :w)"),  # table name from a fixed internal list, never user input
            {"w": ws.id},
        )
    await db.execute(text("UPDATE repos SET service_id = NULL WHERE workspace_id = :w"), {"w": ws.id})
    for table in _CLEANUP_TABLES_BY_WORKSPACE:
        await db.execute(text(f"DELETE FROM {table} WHERE workspace_id = :w"), {"w": ws.id})
    await db.execute(text("DELETE FROM repos WHERE workspace_id = :w"), {"w": ws.id})
    await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws.id})
    await db.commit()


@pytest_asyncio.fixture
async def repo(db, workspace) -> Repo:
    r = Repo(workspace_id=workspace.id, github_repo_id=unique_int(), full_name=f"test-org/repo-{unique_int()}")
    db.add(r)
    await db.flush()
    await db.commit()
    return r


def make_pr(repo_id, number, author, *, additions=10, deletions=0, changed_files=1, opened_at=None, merged_at=None, state="merged"):
    """A merged PR with sane timestamp defaults — most tests only care about
    the fields they explicitly pass."""
    now = datetime.now(timezone.utc)
    opened_at = opened_at or (now - timedelta(days=1))
    if state == "merged" and merged_at is None:
        merged_at = opened_at + timedelta(hours=2)
    return PullRequest(
        repo_id=repo_id, number=number, title=f"PR #{number}", author_github_login=author, state=state,
        opened_at=opened_at, merged_at=merged_at, additions=additions, deletions=deletions, changed_files=changed_files,
    )


def make_ticket(repo_id, key, *, title="Test ticket", status="in_progress"):
    return Ticket(repo_id=repo_id, key=key, title=title, status=status)
