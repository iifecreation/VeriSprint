"""Direction-aware goal progress & breach detection (Phase 3) — app/goals.py. Pure functions, no DB."""
from datetime import datetime, timezone

from app.goals import compute_progress_pct, is_goal_breaching

JAN_1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
JAN_31 = datetime(2026, 1, 31, tzinfo=timezone.utc)
HALFWAY = datetime(2026, 1, 16, tzinfo=timezone.utc)
EARLY = datetime(2026, 1, 4, tzinfo=timezone.utc)


def test_higher_is_better_progress():
    assert compute_progress_pct("merged_pr_count", 3.0, 10.0) == 30.0
    assert compute_progress_pct("merged_pr_count", 10.0, 10.0) == 100.0


def test_lower_is_better_progress_caps_at_100_when_goal_beaten():
    assert compute_progress_pct("cycle_time_hours", 10.0, 20.0) == 100.0  # beat the target
    assert compute_progress_pct("cycle_time_hours", 20.0, 20.0) == 100.0  # met exactly
    assert compute_progress_pct("cycle_time_hours", 50.0, 20.0) == 40.0  # 100 * 20/50
    assert compute_progress_pct("cycle_time_hours", 0.0, 20.0) == 100.0  # edge case: zero is "great"


def test_target_seeking_progress_penalizes_either_direction():
    on_target = compute_progress_pct("new_value_pct", 45.0, 45.0)
    under = compute_progress_pct("new_value_pct", 10.0, 45.0)
    over = compute_progress_pct("new_value_pct", 80.0, 45.0)
    assert on_target == 100.0
    assert under < 100.0 and over < 100.0


def test_progress_is_none_without_current_value_or_target():
    assert compute_progress_pct("cycle_time_hours", None, 20.0) is None
    assert compute_progress_pct("cycle_time_hours", 10.0, 0.0) is None


def test_unknown_metric_key_defaults_to_higher_is_better():
    assert compute_progress_pct("some_future_metric", 5.0, 10.0) == 50.0


def test_breach_requires_unmet_goal_and_at_least_halfway_through_period():
    # Met goal -> never breaches, regardless of timing.
    assert is_goal_breaching(100.0, JAN_1, JAN_31, HALFWAY) is False
    # Unmet, but still early in the period -> not yet called a breach.
    assert is_goal_breaching(30.0, JAN_1, JAN_31, EARLY) is False
    # Unmet, past the halfway mark -> breaching.
    assert is_goal_breaching(30.0, JAN_1, JAN_31, HALFWAY) is True


def test_breach_is_false_without_a_progress_value():
    assert is_goal_breaching(None, JAN_1, JAN_31, HALFWAY) is False


def test_breach_is_false_for_a_zero_or_negative_length_period():
    assert is_goal_breaching(30.0, JAN_31, JAN_1, HALFWAY) is False
