"""Investment Profile classification (Phase 2) — app/investment.py."""
from datetime import datetime, timedelta, timezone

from app.db.models import Commit
from app.investment import compute_investment_profile

from conftest import make_ticket

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _commit(repo_id, sha, ticket_key, additions, deletions=0):
    return Commit(
        repo_id=repo_id, sha=sha, author_github_login="alice", message=f"work on {ticket_key}",
        committed_at=BASE, raw_diff_object_key="x", additions=additions, deletions=deletions,
        linked_ticket_key=ticket_key, touched_file_paths=["app/foo.py"],
    )


async def test_categorizes_by_ticket_keyword_and_reports_uncategorized_separately(db, repo):
    tickets = [
        make_ticket(repo.id, "NV-1", title="New feature: add support for SSO"),
        make_ticket(repo.id, "DX-1", title="Refactor: pay down tech debt in auth module"),
        make_ticket(repo.id, "KT-1", title="Fix security vulnerability CVE-2026-1234"),
        make_ticket(repo.id, "FE-1", title="Improve performance of dashboard queries"),
        make_ticket(repo.id, "UNK-1", title="Random thing matching no keyword"),
    ]
    db.add_all(tickets)
    await db.flush()
    db.add_all([
        _commit(repo.id, "c1", "NV-1", 100),
        _commit(repo.id, "c2", "DX-1", 50, 50),
        _commit(repo.id, "c3", "KT-1", 20),
        _commit(repo.id, "c4", "FE-1", 30),
        _commit(repo.id, "c5", "UNK-1", 10),
        _commit(repo.id, "c6", None, 5),  # no linked ticket at all
    ])
    await db.commit()

    profile = await compute_investment_profile(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))

    assert profile.lines_by_category["new_value"] == 100
    assert profile.lines_by_category["developer_experience"] == 100
    assert profile.lines_by_category["keeping_the_lights_on"] == 20
    assert profile.lines_by_category["feature_enhancements"] == 30
    assert profile.uncategorized_lines == 15  # 10 (unmatched ticket) + 5 (no ticket)

    total = sum(profile.lines_by_category.values())
    assert total == 250
    assert profile.pct_of_categorized("new_value") == 40.0
    assert profile.pct_of_categorized("developer_experience") == 40.0


async def test_security_keywords_take_priority_over_generic_improve_wording(db, repo):
    """Order matters — see app/investment.py's CATEGORY_KEYWORDS comment."""
    ticket = make_ticket(repo.id, "SEC-1", title="Security patch that also improves reliability")
    db.add(ticket)
    await db.flush()
    db.add(_commit(repo.id, "c1", "SEC-1", 10))
    await db.commit()

    profile = await compute_investment_profile(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert profile.lines_by_category["keeping_the_lights_on"] == 10
    assert profile.lines_by_category["feature_enhancements"] == 0


async def test_empty_period_returns_zero_everything_not_none(db, repo):
    profile = await compute_investment_profile(db, [repo.id], BASE, BASE + timedelta(days=1))
    assert sum(profile.lines_by_category.values()) == 0
    assert profile.uncategorized_lines == 0
    assert profile.pct_of_categorized("new_value") is None  # no total to divide by


async def test_no_repo_ids_returns_empty_profile(db):
    profile = await compute_investment_profile(db, [], BASE, BASE + timedelta(days=1))
    assert sum(profile.lines_by_category.values()) == 0
