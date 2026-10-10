"""
Git Efficiency & Quality benchmark bands (Phase 3 competitor-parity): the
Elite / Good / Fair / Needs Focus tiering convention widely used in
engineering-metrics research (e.g. the DORA/Accelerate "four keys" bands, and
the equivalent PR-level bands independent industry guides publish for metrics
like PR Size, Cycle Time, and Rework Rate) — applied here to VeriSprint's own,
separately-computed numbers (see app/metrics.py). This module only classifies
a value into a band; it never fabricates the value itself.

Thresholds are a reasonable midpoint of publicly-published industry bands,
not a proprietary dataset of our own — treat the exact cutoffs as directional,
not authoritative, and feel free to retune them once real customer data shows
where VeriSprint's own users actually cluster.
"""
from typing import Literal, NamedTuple

Band = Literal["elite", "good", "fair", "needs_focus"]


class Threshold(NamedTuple):
    # A metric is "lower is better" (e.g. cycle time) unless higher_is_better.
    elite_bound: float
    good_bound: float
    fair_bound: float
    higher_is_better: bool = False
    unit: str = ""


# metric_key -> Threshold. Every bound is the edge nearest "elite" for that
# tier — e.g. for a lower-is-better metric, elite is "<= elite_bound", good is
# "<= good_bound", fair is "<= fair_bound", anything past that is needs_focus.
BENCHMARK_THRESHOLDS: dict[str, Threshold] = {
    "coding_time_hours": Threshold(0.5, 2.5, 6, unit="hours"),
    "pr_pickup_time_hours": Threshold(1, 3, 12, unit="hours"),
    "pr_review_time_hours": Threshold(0.5, 3, 12, unit="hours"),
    "deploy_time_hours": Threshold(3, 69, 150, unit="hours"),
    "cycle_time_hours": Threshold(19, 66, 150, unit="hours"),
    "merge_frequency_per_dev_per_week": Threshold(2, 1, 0.5, higher_is_better=True),
    "deployment_frequency_per_day": Threshold(0.2, 0.09, 0.03, higher_is_better=True),
    "change_failure_rate_pct": Threshold(1, 8, 20, unit="%"),
    "mttr_hours": Threshold(7, 9, 10, unit="hours"),
    "pr_size_lines": Threshold(98, 148, 218, unit="lines"),
    "rework_rate_pct": Threshold(2, 5, 7, unit="%"),
    "refactor_rate_pct": Threshold(9, 15, 21, unit="%"),
    "planning_accuracy_pct": Threshold(85, 60, 40, higher_is_better=True, unit="%"),
}


def classify(metric_key: str, value: float | None) -> Band | None:
    """Returns None when there's no threshold for this metric, or no value to classify — never guesses a band."""
    if value is None:
        return None
    threshold = BENCHMARK_THRESHOLDS.get(metric_key)
    if threshold is None:
        return None

    if threshold.higher_is_better:
        if value >= threshold.elite_bound:
            return "elite"
        if value >= threshold.good_bound:
            return "good"
        if value >= threshold.fair_bound:
            return "fair"
        return "needs_focus"

    if value <= threshold.elite_bound:
        return "elite"
    if value <= threshold.good_bound:
        return "good"
    if value <= threshold.fair_bound:
        return "fair"
    return "needs_focus"


# Investment Profile (Phase 3 competitor-parity): target share of
# *categorized* code-change volume for each resource-allocation category —
# a reasonable midpoint of publicly-published industry convention, not a
# claim about where any particular org should sit. These are targets to
# compare against, not Elite/Good/Fair bands (there's no single "better"
# direction for how investment should be split), so they live in their own
# dict rather than BENCHMARK_THRESHOLDS. See app/routers/allocation.py.
INVESTMENT_PROFILE_TARGETS: dict[str, float] = {
    "new_value": 45.0,
    "feature_enhancements": 20.0,
    "developer_experience": 20.0,
    "keeping_the_lights_on": 15.0,
}


def classify_capacity_accuracy(value: float | None) -> Band | None:
    """
    Capacity Accuracy is the one benchmark that isn't a simple directional
    scale — both over- and under-committing are worse than hitting the
    target range, so it gets its own two-sided classifier instead of an entry
    in BENCHMARK_THRESHOLDS.
    """
    if value is None:
        return None
    if 85 <= value <= 115:
        return "elite"
    if 70 <= value < 85 or 115 < value <= 130:
        return "good"
    if 130 < value <= 150:
        return "fair"
    return "needs_focus"


DeliveryRiskQuadrant = Literal["on_track", "capacity_mismatch", "scope_creep", "overcommitted"]


def classify_delivery_risk_quadrant(
    planning_accuracy_pct: float | None, capacity_accuracy_pct: float | None
) -> DeliveryRiskQuadrant | None:
    """
    LinearB's 2x2 Predictable Delivery risk framework: Planning Accuracy
    (did we deliver what we said) crossed with Capacity Accuracy (did we do
    about the right amount) — four named postures, not two independent
    bands. See app/delivery_risk.py for how each input is computed.

      - on_track: high planning accuracy AND capacity in the healthy range —
        delivering the right things in the right amount.
      - capacity_mismatch: planning is fine, but capacity is off — either
        under-committed (plan undersold what the team could do) or the team
        isn't adapting to real fluctuations in load.
      - scope_creep: capacity is in range (roughly the right total amount of
        work got done) but planning accuracy is low — unplanned work
        displaced planned work rather than genuinely exceeding capacity.
      - overcommitted: both are off — too much was taken on and too little
        of the actual plan shipped; the fix is to plan less, not work more.
    """
    if planning_accuracy_pct is None or capacity_accuracy_pct is None:
        return None
    high_planning = planning_accuracy_pct >= 75
    in_range_capacity = 85 <= capacity_accuracy_pct <= 115
    if high_planning and in_range_capacity:
        return "on_track"
    if high_planning and not in_range_capacity:
        return "capacity_mismatch"
    if not high_planning and in_range_capacity:
        return "scope_creep"
    return "overcommitted"
