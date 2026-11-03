"""R8AQ: correction is an append-only supersede, never an edit of history."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_supersede_endpoint_is_owner_audited_and_never_edits_the_original():
    events = read("services/api/app/api/routes/events.py")
    block = events.split('@router.post("/pets/{pet_id}/events/{event_id}/supersede"', 1)[1]
    block = block.split("# --- R7", 1)[0]

    assert "enums.Capability.MANAGE_PET" in block
    assert "LifeEvent.id == event_id, LifeEvent.pet_id == pet.id" in block
    assert "occurred_at=original.occurred_at" in block
    assert "supersedes_event_id=original.id" in block
    assert '"event.supersede"' in block
    # Idempotent replay must win before the "already corrected" conflict.
    assert block.index("body.idempotency_key") < block.index("original.retracted_at")
    # The original row is immutable here: no assignment to its payload/state.
    assert "original.payload =" not in block
    assert "original.retracted_at =" not in block


def test_sources_surface_the_successor_instead_of_hiding_the_chain():
    sources = read("services/api/app/api/routes/life_change_sources.py")
    assert "superseded_by_event_id" in sources
    assert "elif event.id in superseded_by:" in sources
    assert 'reason = "SUPERSEDED"' in sources
    assert 'payload["validity_reason"] = reason' in sources
    assert "_successor_by_event" in sources


def test_web_correction_is_owner_only_numeric_and_append_only():
    page = read("apps/web/app/pets/[id]/history/[caseId]/page.tsx")
    lib = read("apps/web/lib/caseCorrection.ts")
    spec = read("tests/e2e-browser/specs/r8-correction.spec.ts")

    assert "detail.owner_can_review && source.valid" in page
    assert "/events/${source.event_id}/supersede" in page
    assert "correctionIdempotencyKey(source.event_id, value)" in page
    assert "发生时间与原始记录保持不变" in page
    # Meal is deliberately unsupported rather than inventing one number.
    assert "meal_count_per_day:" not in lib
    assert "walk_minutes_per_day" in lib and "sleep_minutes_per_day" in lib
    assert "1440" in lib

    assert 'expect(body.state).toBe("INVALIDATED")' in spec
    assert "expect(originalBody.payload.duration_minutes).toBe(20)" in spec
    assert "expect(originalBody.retracted_at).toBeNull()" in spec
    assert "superseded_by_event_id" in spec
