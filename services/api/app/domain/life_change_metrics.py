"""Canonical metric registry for life-change and baseline surfaces.

# INVARIANT:
# One metric name maps to exactly one event type (and one owner-facing unit).
# This mapping used to be declared four separate times - `api/routes/life_changes.py`,
# `api/routes/v02_identity_daily_baseline.py`, `services/life_change_workflow.py`
# and a SQL `CASE` inside `services/life_change_history.py`. They agreed on the day
# they were written, so nothing failed; a later edit to one of them would have left
# change-case validation, the baseline API and the evidence-validity filter
# disagreeing silently, which is exactly the class of defect nobody catches in review.
"""

from __future__ import annotations

# Human-facing metric name -> canonical daily event type it is computed from.
METRIC_EVENT_TYPES: dict[str, str] = {
    "meal_count_per_day": "daily.meal",
    "walk_minutes_per_day": "daily.walk",
    "sleep_minutes_per_day": "daily.sleep",
}

# Owner-facing unit per metric. Kept beside the mapping so a new metric cannot be
# added with an event type but no displayable unit.
METRIC_UNITS: dict[str, str] = {
    "meal_count_per_day": "次",
    "walk_minutes_per_day": "分钟",
    "sleep_minutes_per_day": "分钟",
}


def metric_event_type_sql(column: str) -> str:
    """Render the metric->event_type mapping as a SQL CASE expression.

    `column` is a caller-supplied SQL identifier from our own query text, never
    user input; the metric and event-type values come from this registry, so the
    query cannot drift from the Python mapping it has to agree with.
    """
    arms = " ".join(
        f"WHEN '{metric}' THEN '{event_type}'"
        for metric, event_type in METRIC_EVENT_TYPES.items()
    )
    return f"CASE {column} {arms} ELSE NULL END"
