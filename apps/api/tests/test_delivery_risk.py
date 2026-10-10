"""Planning & Capacity Accuracy (Phase 5) — app/delivery_risk.py."""
from datetime import datetime, timedelta, timezone

from app.db.models import Sprint, TicketStatusChange
from app.benchmarks import classify_delivery_risk_quadrant
from app.delivery_risk import compute_delivery_accuracy

from conftest import make_ticket

BASE = datetime(2026, 1, 1, tzinfo=timezone.utc)


async def _sprint_with_tickets(db, repo_id, name, planned_keys, done_keys, start, end):
    sprint = Sprint(repo_id=repo_id, name=name, start_date=start, end_date=end, planned_ticket_keys=planned_keys)
    db.add(sprint)
    await db.flush()
    for key in set(planned_keys) | set(done_keys):
        ticket = make_ticket(repo_id, key, status="done" if key in done_keys else "in_progress")
        db.add(ticket)
        await db.flush()
        if key in done_keys:
            db.add(TicketStatusChange(ticket_id=ticket.id, from_status="in_progress", to_status="done", changed_at=start + timedelta(days=1)))
    await db.commit()
    return sprint


async def test_on_track_quadrant(db, repo):
    start, end = BASE, BASE + timedelta(days=10)
    sprint = await _sprint_with_tickets(db, repo.id, "s1", [f"P-{i}" for i in range(10)], [f"P-{i}" for i in range(9)], start, end)
    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct == 90.0
    assert acc.capacity_accuracy_pct == 90.0
    assert classify_delivery_risk_quadrant(acc.planning_accuracy_pct, acc.capacity_accuracy_pct) == "on_track"


async def test_scope_creep_quadrant(db, repo):
    start, end = BASE, BASE + timedelta(days=10)
    sprint = await _sprint_with_tickets(
        db, repo.id, "s2", [f"P-{i}" for i in range(10)],
        [f"P-{i}" for i in range(3)] + [f"ADD-{i}" for i in range(7)], start, end,
    )
    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct == 30.0
    assert acc.capacity_accuracy_pct == 100.0
    assert acc.added_completed_count == 7
    assert classify_delivery_risk_quadrant(acc.planning_accuracy_pct, acc.capacity_accuracy_pct) == "scope_creep"


async def test_overcommitted_quadrant(db, repo):
    start, end = BASE, BASE + timedelta(days=10)
    sprint = await _sprint_with_tickets(db, repo.id, "s3", [f"P-{i}" for i in range(10)], [f"P-{i}" for i in range(2)], start, end)
    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct == 20.0
    assert acc.capacity_accuracy_pct == 20.0
    assert classify_delivery_risk_quadrant(acc.planning_accuracy_pct, acc.capacity_accuracy_pct) == "overcommitted"


async def test_capacity_mismatch_undercommitted_quadrant(db, repo):
    start, end = BASE, BASE + timedelta(days=10)
    sprint = await _sprint_with_tickets(
        db, repo.id, "s4", [f"P-{i}" for i in range(10)],
        [f"P-{i}" for i in range(10)] + [f"ADD-{i}" for i in range(5)], start, end,
    )
    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct == 100.0
    assert acc.capacity_accuracy_pct == 150.0
    assert classify_delivery_risk_quadrant(acc.planning_accuracy_pct, acc.capacity_accuracy_pct) == "capacity_mismatch"


async def test_sprint_with_no_planned_tickets_has_null_accuracy(db, repo):
    sprint = Sprint(repo_id=repo.id, name="empty", start_date=BASE, end_date=BASE + timedelta(days=10), planned_ticket_keys=[])
    db.add(sprint)
    await db.commit()
    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct is None
    assert acc.capacity_accuracy_pct is None


async def test_untracked_but_currently_done_ticket_counts_toward_planning_not_capacity(db, repo):
    """A planned ticket with no TicketStatusChange history at all (predates
    that table) still counts toward Planning Accuracy if currently done —
    but never toward Capacity Accuracy, since there's no timestamp."""
    sprint = Sprint(repo_id=repo.id, name="untracked", start_date=BASE, end_date=BASE + timedelta(days=10), planned_ticket_keys=["OLD-1"])
    db.add(sprint)
    db.add(make_ticket(repo.id, "OLD-1", status="done"))  # no TicketStatusChange row at all
    await db.commit()

    acc = await compute_delivery_accuracy(db, sprint)
    assert acc.planning_accuracy_pct == 100.0
    assert acc.capacity_accuracy_pct == 0.0  # not counted toward total_completed_count
