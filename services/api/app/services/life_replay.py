"""Pure bitemporal life-event projection for one pet and one local day.

Occurred time answers WHEN a real-world activity was reported to happen.
Recorded time answers WHEN the system could know of it. A late entry,
subsequent retraction, or correction must never rewrite the "as known then"
perspective. No AI inference or medical diagnosis is performed here.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol


class ReplayEvent(Protocol):
    id: uuid.UUID
    pet_id: uuid.UUID
    event_type: str
    occurred_at: datetime
    recorded_at: datetime
    retracted_at: datetime | None
    supersedes_event_id: uuid.UUID | None
    source_type: str


@dataclass(frozen=True)
class ReplayProjection:
    events: list[ReplayEvent]
    event_counts: dict[str, int]
    provenance_counts: dict[str, int]
    excluded_retracted: int
    excluded_superseded: int
    excluded_late_reported: int


# System page-view telemetry is not the animal's life.
NON_LIFE_EVENTS = frozenset({"today.viewed", "audit.accessed"})
# AI derivations and system aggregates can be displayed with provenance, but
# must never become indistinguishable from recorded animal-care observations.
RECORD_FACT_SOURCES = frozenset({
    "OWNER_REPORTED", "CAREGIVER_REPORTED", "DEVICE_DERIVED",
    "PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED",
})


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def project_life_replay(
    events: list[ReplayEvent],
    *,
    pet_id: uuid.UUID,
    day_start: datetime,
    day_end: datetime,
    knowledge_cutoff: datetime,
) -> ReplayProjection:
    """Project what is known by cutoff about the requested day.

    The caller must provide both the day's events and any later events whose
    supersedes_event_id links to a day event (including downstream chains).
    Event IDs never cross pet boundaries. A later retraction and later
    correction do not retroactively disappear from a historical knowledge view.
    """
    cutoff = _aware(knowledge_cutoff)
    start, end = _aware(day_start), _aware(day_end)
    owned = [
        e for e in events
        if e.pet_id == pet_id and _aware(e.recorded_at) < cutoff
    ]
    superseded = {
        e.supersedes_event_id for e in owned
        if e.supersedes_event_id is not None
    }
    selected: list[ReplayEvent] = []
    excluded_retracted = 0
    excluded_superseded = 0
    excluded_late = 0
    for event in events:
        if event.pet_id != pet_id or event.event_type in NON_LIFE_EVENTS:
            continue
        happened = _aware(event.occurred_at)
        if not start <= happened < end or happened >= cutoff:
            continue
        if _aware(event.recorded_at) >= cutoff:
            excluded_late += 1
            continue
        if event.retracted_at is not None and _aware(event.retracted_at) < cutoff:
            excluded_retracted += 1
            continue
        if event.id in superseded:
            excluded_superseded += 1
            continue
        selected.append(event)

    selected.sort(key=lambda e: (_aware(e.occurred_at), _aware(e.recorded_at), str(e.id)), reverse=True)
    event_counts: dict[str, int] = {}
    provenance_counts: dict[str, int] = {}
    for event in selected:
        provenance_counts[event.source_type] = provenance_counts.get(event.source_type, 0) + 1
        if event.event_type.startswith("daily.") and event.source_type in RECORD_FACT_SOURCES:
            event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
    return ReplayProjection(
        events=selected,
        event_counts=event_counts,
        provenance_counts=provenance_counts,
        excluded_retracted=excluded_retracted,
        excluded_superseded=excluded_superseded,
        excluded_late_reported=excluded_late,
    )
