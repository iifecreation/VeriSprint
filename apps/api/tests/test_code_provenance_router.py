"""GET /code-provenance (app/routers/code_provenance.py) — aggregates real,
already-classified Commit rows for a repo/period into a report."""
from datetime import datetime, timedelta, timezone

from app.db.models import Commit
from app.routers.code_provenance import get_code_provenance_report

from conftest import unique_int

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _commit(repo_id, *, original=None, ai=None, dup=None, message="work", opened_at=BASE):
    return Commit(
        repo_id=repo_id, sha=f"sha-{unique_int()}", author_github_login="octocat", message=message,
        committed_at=opened_at, raw_diff_object_key="unused", status="ingested",
        original_engineering_lines=original, ai_disclosed_lines=ai, duplicate_or_boilerplate_lines=dup,
    )


async def test_aggregates_totals_and_percentages_across_analyzed_commits(db, repo):
    db.add(_commit(repo.id, original=8, ai=0, dup=2))
    db.add(_commit(repo.id, original=0, ai=5, dup=0))
    await db.commit()

    report = await get_code_provenance_report(
        BASE - timedelta(days=1), BASE + timedelta(days=1), repo=repo, db=db
    )

    assert report.total_original_engineering_lines == 8
    assert report.total_ai_disclosed_lines == 5
    assert report.total_duplicate_or_boilerplate_lines == 2
    assert report.original_engineering_pct == 53.3
    assert report.ai_disclosed_pct == 33.3
    assert report.duplicate_or_boilerplate_pct == 13.3
    assert report.analyzed_commit_count == 2
    assert report.pending_commit_count == 0
    assert len(report.commits) == 2


async def test_unanalyzed_commits_count_as_pending_not_zero(db, repo):
    db.add(_commit(repo.id, original=None, ai=None, dup=None))
    await db.commit()

    report = await get_code_provenance_report(
        BASE - timedelta(days=1), BASE + timedelta(days=1), repo=repo, db=db
    )

    assert report.pending_commit_count == 1
    assert report.analyzed_commit_count == 0
    assert report.commits[0].total_lines is None
    assert report.commits[0].original_engineering_lines is None


async def test_empty_period_returns_zero_totals_and_null_percentages(db, repo):
    report = await get_code_provenance_report(
        BASE - timedelta(days=1), BASE + timedelta(days=1), repo=repo, db=db
    )

    assert report.total_original_engineering_lines == 0
    assert report.original_engineering_pct is None
    assert report.commits == []


async def test_commits_outside_the_period_are_excluded(db, repo):
    db.add(_commit(repo.id, original=4, ai=0, dup=0, opened_at=BASE - timedelta(days=30)))
    await db.commit()

    report = await get_code_provenance_report(
        BASE - timedelta(days=1), BASE + timedelta(days=1), repo=repo, db=db
    )

    assert report.total_original_engineering_lines == 0
    assert report.commits == []
