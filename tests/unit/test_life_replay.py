"""R7 Life Replay truth contract — deterministic, DB-free, no vision models."""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

from app.services.life_replay import project_life_replay

T0 = datetime(2026, 10, 1, tzinfo=UTC)


def event(pet, *, when=None, known=None, source="OWNER_REPORTED",
          supersedes=None, retracted=None, kind="daily.walk", event_id=None):
    return SimpleNamespace(
        id=event_id or uuid4(), pet_id=pet, event_type=kind,
        occurred_at=when or T0 + timedelta(hours=2),
        recorded_at=known or T0 + timedelta(hours=3),
        retracted_at=retracted, supersedes_event_id=supersedes,
        source_type=source,
    )


def replay(rows, pet, cutoff):
    return project_life_replay(
        rows, pet_id=pet, day_start=T0, day_end=T0 + timedelta(days=1),
        knowledge_cutoff=cutoff,
    )


def test_late_backfill_visible_now_but_not_known_then():
    pet = uuid4()
    late = event(pet, known=T0 + timedelta(days=3))
    then = replay([late], pet, T0 + timedelta(days=1))
    now = replay([late], pet, T0 + timedelta(days=4))
    assert then.events == []
    assert then.excluded_late_reported == 1
    assert [x.id for x in now.events] == [late.id]


def test_retracted_later_retains_historical_knowledge_not_current_truth():
    pet = uuid4()
    row = event(pet, retracted=T0 + timedelta(days=2))
    assert [e.id for e in replay([row], pet, T0 + timedelta(days=1)).events] == [row.id]
    today = replay([row], pet, T0 + timedelta(days=3))
    assert today.events == [] and today.excluded_retracted == 1


def test_cross_day_correction_suppresses_old_event_only_after_known():
    pet = uuid4()
    old = event(pet)
    fixed = event(pet, when=T0 + timedelta(days=2),
                  known=T0 + timedelta(days=2, hours=1), supersedes=old.id)
    assert [e.id for e in replay([old, fixed], pet, T0 + timedelta(days=1)).events] == [old.id]
    now = replay([old, fixed], pet, T0 + timedelta(days=3))
    assert now.events == [] and now.excluded_superseded == 1


def test_cross_pet_correction_cannot_suppress_owner_fact():
    pet, stranger = uuid4(), uuid4()
    first = event(pet)
    other = event(stranger, supersedes=first.id)
    assert [x.id for x in replay([first, other], pet, T0 + timedelta(days=2)).events] == [first.id]


def test_inferred_or_telemetry_cannot_become_recorded_daily_counts():
    pet = uuid4()
    owner = event(pet)
    derived = event(pet, source="AI_DERIVED")
    viewed = event(pet, source="SYSTEM_CALCULATED", kind="today.viewed")
    result = replay([owner, derived, viewed], pet, T0 + timedelta(days=2))
    assert result.event_counts == {"daily.walk": 1}
    assert result.provenance_counts == {"OWNER_REPORTED": 1, "AI_DERIVED": 1}
    assert all(e.event_type != "today.viewed" for e in result.events)


def test_same_day_order_is_real_occurred_at_not_database_insertion_order():
    pet = uuid4()
    a = event(pet, when=T0 + timedelta(hours=1))
    b = event(pet, when=T0 + timedelta(hours=5))
    assert [x.id for x in replay([a, b], pet, T0 + timedelta(days=1)).events] == [b.id, a.id]


def test_different_pet_or_future_event_never_leaks():
    pet = uuid4()
    stranger = event(uuid4())
    future = event(pet, when=T0 + timedelta(days=1, hours=2))
    assert replay([stranger, future], pet, T0 + timedelta(days=2)).events == []
