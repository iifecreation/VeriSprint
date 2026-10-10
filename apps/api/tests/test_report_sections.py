"""Report Builder's Phase 6 sections — app/workers/reports.py. Each reuses the
exact computation its standalone dashboard panel uses, so these tests mainly
guard against that reuse silently breaking (e.g. a signature change)."""
from datetime import datetime, timedelta, timezone

from app.db.models import Commit, Sprint, TeamGoal, TicketStatusChange
from app.workers.reports import (
    REPORT_TEMPLATES,
    _section_delivery_risk,
    _section_engineering_health,
    _section_goals_progress,
    _section_investment_profile,
)

from conftest import make_pr, make_ticket

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


async def test_engineering_health_section_renders_real_numbers(db, repo):
    pr = make_pr(repo.id, 1, "alice", additions=50, deletions=10, opened_at=BASE)
    db.add(pr)
    await db.commit()

    text = await _section_engineering_health(db, repo.id, BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert "**Engineering Health**" in text
    assert "1 PR(s) merged" in text


async def test_engineering_health_section_handles_no_activity(db, repo):
    text = await _section_engineering_health(db, repo.id, BASE, BASE + timedelta(days=1))
    assert "0 PR(s) merged" in text


async def test_investment_profile_section_renders_categories(db, repo):
    ticket = make_ticket(repo.id, "NV-1", title="New feature: add support for X", status="done")
    db.add(ticket)
    await db.flush()
    db.add(Commit(
        repo_id=repo.id, sha="c1", author_github_login="alice", message="x", committed_at=BASE,
        raw_diff_object_key="x", additions=50, deletions=0, linked_ticket_key="NV-1", touched_file_paths=["app/foo.py"],
    ))
    await db.commit()

    text = await _section_investment_profile(db, repo.id, BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert "New Value: 100.0%" in text


async def test_investment_profile_section_handles_no_activity(db, repo):
    text = await _section_investment_profile(db, repo.id, BASE, BASE + timedelta(days=1))
    assert "No ticket-linked commit activity" in text


async def test_delivery_risk_section_renders_sprint_summary(db, repo):
    sprint = Sprint(repo_id=repo.id, name="Sprint A", start_date=BASE, end_date=BASE + timedelta(days=10), planned_ticket_keys=["NV-1"])
    db.add(sprint)
    ticket = make_ticket(repo.id, "NV-1", status="done")
    db.add(ticket)
    await db.flush()
    db.add(TicketStatusChange(ticket_id=ticket.id, from_status="in_progress", to_status="done", changed_at=BASE + timedelta(days=2)))
    await db.commit()

    text = await _section_delivery_risk(db, repo.id, BASE, BASE + timedelta(days=10))
    assert "Sprint A" in text
    assert "Planning Accuracy 100.0%" in text


async def test_delivery_risk_section_handles_no_overlapping_sprint(db, repo):
    text = await _section_delivery_risk(db, repo.id, BASE, BASE + timedelta(days=1))
    assert "No sprint overlaps" in text


async def test_goals_progress_section_renders_and_flags_off_track(db, workspace, repo):
    db.add(make_pr(repo.id, 1, "alice", additions=500, opened_at=BASE))
    goal = TeamGoal(
        workspace_id=workspace.id, repo_id=repo.id, name="Small PRs", metric_key="pr_size_lines",
        target_value=50.0, period_start=BASE - timedelta(days=20), period_end=BASE + timedelta(days=10),
    )
    db.add(goal)
    await db.commit()

    text = await _section_goals_progress(db, repo.id, BASE - timedelta(days=1), BASE + timedelta(days=1))
    assert "Small PRs" in text
    assert "OFF TRACK" in text  # 500 >> target 50, more than halfway through a 30-day period


async def test_goals_progress_section_handles_no_active_goals(db, repo):
    text = await _section_goals_progress(db, repo.id, BASE, BASE + timedelta(days=1))
    assert "No active goals" in text


def test_report_templates_only_reference_real_section_keys():
    from app.routers.reports import CUSTOM_REPORT_SECTIONS

    valid_keys = {s.key for s in CUSTOM_REPORT_SECTIONS}
    for template in REPORT_TEMPLATES.values():
        for section_key in template["sections"]:
            assert section_key in valid_keys, f"{section_key!r} in a template isn't a real Report Builder section"
