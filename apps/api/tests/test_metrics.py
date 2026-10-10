"""Git Efficiency & Quality Metrics (Phase 3) — app/metrics.py."""
from datetime import datetime, timedelta, timezone

from app.db.models import Commit, Deployment, PullRequestReview
from app.metrics import compute_efficiency_metrics

from conftest import make_pr

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


async def test_empty_period_returns_all_none(db, repo):
    m = await compute_efficiency_metrics(db, [repo.id], BASE, BASE + timedelta(days=1))
    assert m.merged_pr_count == 0
    assert m.pr_size_lines is None
    assert m.change_failure_rate_pct is None


async def test_pr_size_and_timing(db, repo):
    pr = make_pr(repo.id, 1, "alice", additions=50, deletions=40, opened_at=BASE, merged_at=BASE + timedelta(hours=10))
    db.add(pr)
    await db.flush()

    db.add(Commit(
        repo_id=repo.id, pull_request_id=pr.id, sha="c1", author_github_login="alice", message="fix",
        committed_at=BASE - timedelta(hours=2), raw_diff_object_key="x", additions=50, deletions=40,
        touched_file_paths=["app/foo.py"],
    ))
    db.add(PullRequestReview(
        pull_request_id=pr.id, github_review_id=1, reviewer_github_login="bob", state="approved",
        submitted_at=BASE + timedelta(hours=3),
    ))
    await db.flush()

    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.merged_pr_count == 1
    assert m.pr_size_lines == 90.0
    assert m.pr_pickup_time_hours == 3.0  # opened BASE -> first review BASE+3h
    assert m.pr_review_time_hours == 7.0  # first review BASE+3h -> merged BASE+10h
    assert m.cycle_time_hours == 12.0  # first commit BASE-2h -> merged BASE+10h
    assert m.prs_merged_without_review_pct == 0.0
    assert m.review_depth_per_pr == 1.0


async def test_prs_merged_without_review(db, repo):
    db.add(make_pr(repo.id, 1, "alice", opened_at=BASE))  # no review ever requested/submitted
    await db.flush()
    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.merged_pr_count == 1
    assert m.prs_merged_without_review_pct == 100.0


async def test_deploy_time_matches_by_merge_commit_sha(db, repo):
    pr = make_pr(repo.id, 1, "alice", opened_at=BASE, merged_at=BASE + timedelta(hours=1))
    pr.merge_commit_sha = "deadbeef"
    db.add(pr)
    db.add(Deployment(
        repo_id=repo.id, github_deployment_id=1, environment="production", sha="deadbeef", state="success",
        created_at_gh=BASE + timedelta(hours=1), resolved_at_gh=BASE + timedelta(hours=3),
    ))
    await db.flush()
    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.deploy_time_hours == 2.0


async def test_change_failure_rate_and_mttr(db, repo):
    db.add(Deployment(
        repo_id=repo.id, github_deployment_id=1, environment="production", sha="bad", state="failure",
        created_at_gh=BASE, resolved_at_gh=BASE + timedelta(hours=1),
    ))
    db.add(Deployment(
        repo_id=repo.id, github_deployment_id=2, environment="production", sha="good", state="success",
        created_at_gh=BASE, resolved_at_gh=BASE + timedelta(hours=5),
    ))
    await db.flush()
    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.change_failure_rate_pct == 50.0
    assert m.mttr_hours == 4.0


async def test_cfr_mttr_and_rework_compute_without_any_merged_prs(db, repo):
    """Regression test: these used to short-circuit to null whenever a
    period had zero merged PRs, even though they're computed from
    Deployment/Commit rows independent of PRs (fixed during Phase 2)."""
    db.add(Deployment(
        repo_id=repo.id, github_deployment_id=1, environment="production", sha="x", state="success",
        created_at_gh=BASE, resolved_at_gh=BASE + timedelta(hours=1),
    ))
    db.add(Commit(
        repo_id=repo.id, sha="c1", author_github_login="alice", message="x", committed_at=BASE,
        raw_diff_object_key="x", additions=10, deletions=0, touched_file_paths=["app/foo.py"],
    ))
    await db.flush()
    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.merged_pr_count == 0
    assert m.change_failure_rate_pct == 0.0  # one success deployment, zero failures
    assert m.rework_rate_pct == 0.0  # no prior commit by alice touching app/foo.py -> not rework, but still a real 0, not null


async def test_rework_rate_detects_same_author_recency(db, repo):
    db.add(Commit(
        repo_id=repo.id, sha="prior", author_github_login="alice", message="first", committed_at=BASE - timedelta(days=5),
        raw_diff_object_key="x", additions=10, deletions=0, touched_file_paths=["app/foo.py"],
    ))
    db.add(Commit(
        repo_id=repo.id, sha="rework", author_github_login="alice", message="again", committed_at=BASE,
        raw_diff_object_key="x", additions=20, deletions=0, touched_file_paths=["app/foo.py"],
    ))
    await db.flush()
    m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert m.rework_rate_pct == 100.0  # the only period commit (20 lines) is rework


async def test_person_filter_scopes_to_one_author(db, repo):
    db.add(make_pr(repo.id, 1, "alice", additions=10, opened_at=BASE))
    db.add(make_pr(repo.id, 2, "bob", additions=500, opened_at=BASE))
    await db.flush()

    all_m = await compute_efficiency_metrics(db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1))
    alice_m = await compute_efficiency_metrics(
        db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1), author_logins=["alice"]
    )
    assert all_m.merged_pr_count == 2
    assert alice_m.merged_pr_count == 1
    assert alice_m.pr_size_lines == 10.0


async def test_author_logins_accepts_multiple_for_team_filtering(db, repo):
    db.add(make_pr(repo.id, 1, "alice", additions=10, opened_at=BASE))
    db.add(make_pr(repo.id, 2, "bob", additions=20, opened_at=BASE))
    db.add(make_pr(repo.id, 3, "carol", additions=999, opened_at=BASE))
    await db.flush()

    team_m = await compute_efficiency_metrics(
        db, [repo.id], BASE - timedelta(days=1), BASE + timedelta(days=1), author_logins=["alice", "bob"]
    )
    assert team_m.merged_pr_count == 2
    assert team_m.pr_size_lines == 15.0
