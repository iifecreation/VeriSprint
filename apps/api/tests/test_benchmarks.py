"""Benchmark band classification (Phase 3/5) — app/benchmarks.py. Pure functions, no DB."""
from app.benchmarks import classify, classify_capacity_accuracy, classify_delivery_risk_quadrant


def test_classify_lower_is_better():
    assert classify("cycle_time_hours", 5) == "elite"
    assert classify("cycle_time_hours", 50) == "good"
    assert classify("cycle_time_hours", 1000) == "needs_focus"


def test_classify_higher_is_better():
    assert classify("deployment_frequency_per_day", 1.0) == "elite"
    assert classify("deployment_frequency_per_day", 0.0001) == "needs_focus"


def test_classify_returns_none_for_unknown_metric_or_null_value():
    assert classify("not_a_real_metric", 5) is None
    assert classify("cycle_time_hours", None) is None


def test_classify_capacity_accuracy_two_sided():
    assert classify_capacity_accuracy(100) == "elite"  # in the healthy 85-115 range
    assert classify_capacity_accuracy(72) == "good"  # under-committed side
    assert classify_capacity_accuracy(120) == "good"  # over-committed side
    assert classify_capacity_accuracy(200) == "needs_focus"
    assert classify_capacity_accuracy(None) is None


def test_classify_delivery_risk_quadrant_all_four_postures():
    assert classify_delivery_risk_quadrant(90, 100) == "on_track"
    assert classify_delivery_risk_quadrant(90, 150) == "capacity_mismatch"
    assert classify_delivery_risk_quadrant(30, 100) == "scope_creep"
    assert classify_delivery_risk_quadrant(20, 20) == "overcommitted"
    assert classify_delivery_risk_quadrant(None, 100) is None
