"""R8AK owner history: stable pagination, bounded search, re-authorized sources.

Case rows for pure pagination/search tests are seeded directly because the
Case *creation* invariants are already covered by R8A/R8AG integration tests;
these tests target read-side keyset stability and authorization.
"""
import asyncio
import uuid
from datetime import UTC, datetime, timedelta, timezone

from tests.conftest import auth, create_user

PRODUCT_TZ_OFFSET = timezone(timedelta(hours=8))


def _pet(client, owner, name="R8AK History Pet"):
    response = client.post(
        "/api/v1/pets", json={"name": name, "species": "dog"}, headers=auth(owner),
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _seed_cases(pet_id: str, owner_id: str, specs: list[tuple[str, datetime]]) -> list[str]:
    from app.core.db import get_session_factory
    from app.models import LifeChangeCase

    async def run() -> list[str]:
        factory = get_session_factory()
        created: list[str] = []
        async with factory() as db:
            for metric, created_at in specs:
                case = LifeChangeCase(
                    pet_id=uuid.UUID(pet_id), created_by_user_id=uuid.UUID(owner_id),
                    metric=metric, insight_kind="RECORDED_CHANGE",
                    algorithm_version="R8A_SAME_CLOCK_RECORDED_CHANGE_V1",
                    fingerprint=uuid.uuid4().hex,
                    computed_at=created_at, knowledge_cutoff=created_at,
                    timezone_policy="CST_UTC_PLUS_08_FALLBACK",
                    current_value=20.0, baseline_value=90.0,
                    sample_days=3, window_days=14,
                    evidence_event_ids=[str(uuid.uuid4())],
                    evidence_role_by_event_id=None,
                    source_scope="DAILY_RECORDED_EVENTS_ONLY",
                    uncertainty="样本有限，仅描述有记录的变化。",
                    human_question="这些已记录的变化是否值得继续观察？",
                    state="PROPOSED",
                )
                case.created_at = created_at
                db.add(case)
                await db.flush()
                created.append(str(case.id))
            await db.commit()
        return created

    return asyncio.run(run())


def _real_case(client, owner):
    """Create real walk evidence, a real Case and return (pet, case)."""
    pet = _pet(client, owner, "R8AK Source Pet")
    now = datetime.now(PRODUCT_TZ_OFFSET)
    at = now - timedelta(minutes=2)
    for days in (1, 2, 3):
        sent = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert sent.status_code == 201, sent.text
    current = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 20},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert current.status_code == 201, current.text
    recompute = client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={}, headers=auth(owner),
    )
    assert recompute.status_code == 201, recompute.text
    case = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert case.status_code == 201, case.text
    return pet, case.json()


def test_history_keyset_pagination_is_stable_and_never_duplicates(client, seeded):
    owner = seeded["owner_id"]
    pet = _pet(client, owner)
    now = datetime.now(UTC).replace(microsecond=0)
    expected = _seed_cases(pet, owner, [
        ("walk_minutes_per_day", now - timedelta(hours=hour)) for hour in (1, 2, 3, 4, 5)
    ])
    seen: list[str] = []
    cursor = None
    for _ in range(5):
        params = {"limit": 2}
        if cursor:
            params["cursor"] = cursor
        page = client.get(
            f"/api/v1/pets/{pet}/life-change-cases", params=params, headers=auth(owner),
        )
        assert page.status_code == 200, page.text
        body = page.json()
        assert body["total"] == 5
        seen.extend(item["case_id"] for item in body["cases"])
        if not body["has_more"]:
            assert body["next_cursor"] is None
            break
        assert body["next_cursor"]
        cursor = body["next_cursor"]
    assert seen == expected
    assert len(set(seen)) == 5


def test_history_search_filters_metrics_and_time_window(client, seeded):
    owner = seeded["owner_id"]
    pet = _pet(client, owner)
    now = datetime.now(UTC).replace(microsecond=0)
    walk_id, meal_id, sleep_id = _seed_cases(pet, owner, [
        ("walk_minutes_per_day", now - timedelta(hours=1)),
        ("meal_count_per_day", now - timedelta(hours=2)),
        ("sleep_minutes_per_day", now - timedelta(hours=3)),
    ])
    walked = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert walked.status_code == 200, walked.text
    assert [item["case_id"] for item in walked.json()["cases"]] == [walk_id]
    assert walked.json()["total"] == 1
    searched = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params={"q": "散步"}, headers=auth(owner),
    )
    assert searched.status_code == 200, searched.text
    assert [item["case_id"] for item in searched.json()["cases"]] == [walk_id]
    window = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={
            "since": (now - timedelta(minutes=130)).isoformat(),
            "until": (now - timedelta(minutes=70)).isoformat(),
        },
        headers=auth(owner),
    )
    assert window.status_code == 200, window.text
    assert [item["case_id"] for item in window.json()["cases"]] == [meal_id]
    assert sleep_id not in {item["case_id"] for item in window.json()["cases"]}


def test_history_rejects_tampered_cursor_and_ambiguous_clock(client, seeded):
    owner = seeded["owner_id"]
    pet = _pet(client, owner)
    bad_cursor = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params={"cursor": "not-a-cursor"},
        headers=auth(owner),
    )
    assert bad_cursor.status_code == 422, bad_cursor.text
    naive = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"since": "2026-10-01T00:00:00"}, headers=auth(owner),
    )
    assert naive.status_code == 422, naive.text
    inverted = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"since": "2026-10-02T00:00:00+08:00", "until": "2026-10-01T00:00:00+08:00"},
        headers=auth(owner),
    )
    assert inverted.status_code == 422, inverted.text


def test_case_sources_are_authorized_real_events_with_frozen_roles(client, seeded):
    owner = seeded["owner_id"]
    pet, case = _real_case(client, owner)
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/sources"
    first = client.get(path, params={"limit": 2}, headers=auth(owner))
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["scope"] == "CASE_EVIDENCE"
    assert body["total"] == len(case["evidence_event_ids"])
    assert len(body["sources"]) == 2
    assert body["has_more"] is True and body["next_offset"] == 2
    ids = {item["event_id"] for item in body["sources"]}
    second = client.get(path, params={"limit": 20, "offset": 2}, headers=auth(owner))
    assert second.status_code == 200, second.text
    ids.update(item["event_id"] for item in second.json()["sources"])
    assert ids == set(case["evidence_event_ids"])
    all_sources = client.get(path, params={"limit": 20}, headers=auth(owner)).json()["sources"]
    assert all(item["valid"] is True for item in all_sources)
    assert all(item["payload"]["duration_minutes"] > 0 for item in all_sources)
    assert {item["event_id"]: item["role"] for item in all_sources} == (
        case["evidence_role_by_event_id"]
    )
    assert all(item["role_source"] == "FROZEN_AT_CREATION" for item in all_sources)
    assert body["missing_event_ids"] == []


def test_case_sources_are_pet_scoped_and_reject_foreign_review(client, seeded):
    owner = seeded["owner_id"]
    pet_a, case_a = _real_case(client, owner)
    pet_b = _pet(client, owner, "R8AK Other Pet")
    cross = client.get(
        f"/api/v1/pets/{pet_b}/life-change-cases/{case_a['case_id']}/sources",
        headers=auth(owner),
    )
    assert cross.status_code == 404, cross.text
    foreign_review = client.get(
        f"/api/v1/pets/{pet_a}/life-change-cases/{case_a['case_id']}/sources",
        params={"review_id": str(uuid.uuid4())}, headers=auth(owner),
    )
    assert foreign_review.status_code == 404, foreign_review.text
    stranger = create_user()
    denied = client.get(
        f"/api/v1/pets/{pet_a}/life-change-cases/{case_a['case_id']}/sources",
        headers=auth(stranger),
    )
    assert denied.status_code in (403, 404), denied.text


def test_old_case_detail_exposes_continue_review_token(client, seeded):
    owner = seeded["owner_id"]
    pet, case = _real_case(client, owner)
    path = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}"
    first = client.post(
        f"{path}/reviews", json={"decision": "FOLLOW_UP_LATER"}, headers=auth(owner),
    )
    assert first.status_code == 201, first.text
    detail = client.get(path, headers=auth(owner))
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["owner_can_review"] is True
    assert body["latest_review_id"] == first.json()["review_id"]
    assert set(body["review_decisions"]) == {
        "RECORD_OBSERVATION", "FOLLOW_UP_LATER", "NOT_RELEVANT", "CORRECT_SOURCE",
    }
    # Continuing the SAME old Case appends a second immutable Review instead of
    # opening a new Case or silently overwriting the earlier human decision.
    continued = client.post(
        f"{path}/reviews",
        json={"decision": "CORRECT_SOURCE", "expected_latest_review_id": body["latest_review_id"]},
        headers=auth(owner),
    )
    assert continued.status_code == 201, continued.text
    final = client.get(path, headers=auth(owner)).json()
    assert [item["decision"] for item in final["reviews"]] == [
        "FOLLOW_UP_LATER", "CORRECT_SOURCE",
    ]
    assert final["state"] == "OWNER_ACKNOWLEDGED"


def test_followup_source_integrity_detects_malformed_review_jsonb_not_case(client, seeded):
    """A healthy parent Case cannot certify an invalid Review source container."""
    from app.core.db import get_session_factory
    from app.models import LifeChangeCase, LifeChangeReview
    from sqlalchemy import update

    owner = seeded["owner_id"]
    pet, case = _real_case(client, owner)
    actual = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 12}},
        headers=auth(owner),
    )
    assert actual.status_code == 201, actual.text
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/reviews",
        json={"decision": "RECORD_OBSERVATION",
              "related_event_ids": [actual.json()["event_id"]]},
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    review_id = review.json()["review_id"]
    url = f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}/sources"
    params = {"review_id": review_id}
    healthy = client.get(url, params=params, headers=auth(owner))
    assert healthy.status_code == 200, healthy.text
    assert healthy.json()["scope"] == "FOLLOW_UP_REVIEW"
    assert healthy.json()["evidence_shape_valid"] is True
    detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert detail.status_code == 200
    item = next(
        row for row in detail.json()["reviews"] if row["review_id"] == review_id
    )
    assert item["related_evidence_shape_valid"] is True
    assert item["related_event_ids"] == [actual.json()["event_id"]]
    assert healthy.json()["evidence_role_shape_valid"] is None
    assert [item["event_id"] for item in healthy.json()["sources"]] == [
        actual.json()["event_id"]
    ]
    # This is the REVIEW's observation, never an original Case CURRENT or
    # HISTORICAL reference, even when original role partition is healthy.
    assert all(item["role"] is None for item in healthy.json()["sources"])
    assert all(
        item["role_source"] == "FOLLOW_UP_OBSERVATION"
        for item in healthy.json()["sources"]
    )

    async def overwrite_case_roles(raw_value):
        async with get_session_factory()() as db:
            await db.execute(
                update(LifeChangeCase)
                .where(LifeChangeCase.id == uuid.UUID(case["case_id"]))
                .values(evidence_role_by_event_id=raw_value)
            )
            await db.commit()

    # Corrupting the parent Case MUST NOT turn a healthy follow-up observation
    # into a falsely "invalid frozen role map" review. The original Case
    # retains its own explicit integrity warning.
    asyncio.run(overwrite_case_roles({str(uuid.uuid4()): "CURRENT"}))
    corrupt_parent = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert corrupt_parent.status_code == 200
    assert corrupt_parent.json()["evidence_role_shape_valid"] is False
    unaffected = client.get(url, params=params, headers=auth(owner))
    assert unaffected.status_code == 200, unaffected.text
    assert unaffected.json()["evidence_shape_valid"] is True
    assert unaffected.json()["evidence_role_shape_valid"] is None
    assert [row["role"] for row in unaffected.json()["sources"]] == [None]
    assert all(
        row["role_source"] == "FOLLOW_UP_OBSERVATION"
        for row in unaffected.json()["sources"]
    )
    asyncio.run(overwrite_case_roles(case["evidence_role_by_event_id"]))

    async def overwrite_review_evidence(raw_value):
        factory = get_session_factory()
        async with factory() as db:
            await db.execute(
                update(LifeChangeReview)
                .where(LifeChangeReview.id == uuid.UUID(review_id))
                .values(related_event_ids=raw_value)
            )
            await db.commit()

    # These represent historical import corruption, not permitted API writes.
    for malformed in ("not-an-array", {"ids": [actual.json()["event_id"]]}, 42, None):
        asyncio.run(overwrite_review_evidence(malformed))
        response = client.get(url, params=params, headers=auth(owner))
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["scope"] == "FOLLOW_UP_REVIEW"
        assert body["evidence_shape_valid"] is False
        detail = client.get(
            f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
            headers=auth(owner),
        )
        assert detail.status_code == 200
        item = next(
            row for row in detail.json()["reviews"] if row["review_id"] == review_id
        )
        assert item["related_evidence_shape_valid"] is False
        assert item["related_event_ids"] == []
        assert body["sources"] == []
        assert body["total"] == 0
        assert body["case_id"] == case["case_id"]
        original = client.get(
            url, headers=auth(owner)
        )
        assert original.status_code == 200
        assert original.json()["evidence_shape_valid"] is True

    asyncio.run(overwrite_review_evidence([actual.json()["event_id"]]))
    restored = client.get(url, params=params, headers=auth(owner))
    assert restored.status_code == 200
    assert restored.json()["evidence_shape_valid"] is True
    assert [row["event_id"] for row in restored.json()["sources"]] == [
        actual.json()["event_id"]
    ]
    restored_detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert restored_detail.status_code == 200
    restored_review = next(
        row for row in restored_detail.json()["reviews"]
        if row["review_id"] == review_id
    )
    assert restored_review["related_evidence_shape_valid"] is True

    # Legacy arrays with duplicate casefold identities or non-string members
    # cannot be shown as complete, yet genuine surviving IDs remain readable.
    asyncio.run(overwrite_review_evidence([
        actual.json()["event_id"], actual.json()["event_id"].upper(),
        {"invalid": "not-a-uuid"},
    ]))
    mixed = client.get(url, params=params, headers=auth(owner))
    detail = client.get(
        f"/api/v1/pets/{pet}/life-change-cases/{case['case_id']}",
        headers=auth(owner),
    )
    assert mixed.status_code == 200 and detail.status_code == 200
    assert mixed.json()["evidence_shape_valid"] is False
    assert [row["event_id"] for row in mixed.json()["sources"]] == [
        actual.json()["event_id"]
    ]
    mixed_review = next(
        row for row in detail.json()["reviews"] if row["review_id"] == review_id
    )
    assert mixed_review["related_evidence_shape_valid"] is False
    assert mixed_review["related_event_ids"] == [actual.json()["event_id"]]



def test_r8bh_malformed_frozen_role_map_never_forges_owner_source_membership(client, seeded):
    """Shape-valid JSON objects may still lie about event membership."""
    from app.core.db import get_session_factory
    from app.models import LifeChangeCase
    from sqlalchemy import update

    owner = seeded["owner_id"]
    pet, created = _real_case(client, owner)
    case_id = created["case_id"]
    original = created["evidence_role_by_event_id"]
    assert set(original.values()) == {"CURRENT", "HISTORICAL"}
    keys = list(original)
    assert len(keys) >= 4
    detail_path = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"
    source_path = f"{detail_path}/sources"

    async def set_frozen_roles(raw):
        async with get_session_factory()() as db:
            await db.execute(
                update(LifeChangeCase)
                .where(LifeChangeCase.id == uuid.UUID(case_id))
                .values(evidence_role_by_event_id=raw)
            )
            await db.commit()

    malformed = [
        {k: v for k, v in original.items() if k != keys[0]},  # missing
        {**original, str(uuid.uuid4()): "HISTORICAL"},  # extra
        {**original, keys[0]: "VERIFIED"},  # forged role
        {**original, keys[0].upper(): "HISTORICAL"},  # same UUID, two keys
        {"source_ids": list(original)},  # object, not a role partition
        "corrupt-roles", ["CURRENT"], 27,
    ]
    for raw in malformed:
        asyncio.run(set_frozen_roles(raw))
        detail = client.get(detail_path, headers=auth(owner))
        source = client.get(source_path, headers=auth(owner))
        assert detail.status_code == 200, (raw, detail.text)
        assert source.status_code == 200, (raw, source.text)
        d, s = detail.json(), source.json()
        assert d["evidence_role_shape_valid"] is False
        assert d["evidence_role_by_event_id"] == {}
        assert d["evidence_role_source"] == "FROZEN_AT_CREATION"
        assert s["evidence_role_shape_valid"] is False
        assert all(item["role"] is None for item in s["sources"])
        assert all(item["role_source"] == "FROZEN_AT_CREATION" for item in s["sources"])
        assert d["case_id"] == case_id and s["case_id"] == case_id

    # Casefold-only spelling differences, without duplicates, are admissible
    # for legacy imports but always normalize to canonical event identities.
    casefold_only = {key.upper(): value for key, value in original.items()}
    asyncio.run(set_frozen_roles(casefold_only))
    normal = client.get(detail_path, headers=auth(owner)).json()
    assert normal["evidence_role_shape_valid"] is True
    assert normal["evidence_role_by_event_id"] == original

    # A genuine pre-freeze legacy Case is not treated as corruption, but may
    # only offer explicitly labelled compatibility date inference.
    asyncio.run(set_frozen_roles(None))
    legacy = client.get(detail_path, headers=auth(owner)).json()
    assert legacy["evidence_role_shape_valid"] is True
    assert legacy["evidence_role_by_event_id"] is None
    assert legacy["evidence_role_source"] == "LEGACY_DATE_DERIVED"


def test_r8bk_review_source_details_match_owner_followup_temporal_eligibility(client, seeded):
    """A valid raw walk is not necessarily a *new* follow-up to this Case."""
    from app.core.db import get_session_factory
    from app.models import LifeChangeReview
    from sqlalchemy import update

    owner = seeded["owner_id"]
    pet, case = _real_case(client, owner)
    case_id = case["case_id"]
    followup = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 17}},
        headers=auth(owner),
    )
    assert followup.status_code == 201, followup.text
    current_id = followup.json()["event_id"]
    review = client.post(
        f"/api/v1/pets/{pet}/life-change-cases/{case_id}/reviews",
        json={"decision": "RECORD_OBSERVATION", "related_event_ids": [current_id]},
        headers=auth(owner),
    )
    assert review.status_code == 201, review.text
    review_id = review.json()["review_id"]
    source_url = f"/api/v1/pets/{pet}/life-change-cases/{case_id}/sources"
    detail_url = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"

    def read_source():
        response = client.get(
            source_url, params={"review_id": review_id}, headers=auth(owner),
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["scope"] == "FOLLOW_UP_REVIEW"
        assert len(body["sources"]) == 1
        return body["sources"][0]

    def read_review_validity():
        response = client.get(detail_url, headers=auth(owner))
        assert response.status_code == 200, response.text
        return next(
            item["related_sources_valid"] for item in response.json()["reviews"]
            if item["review_id"] == review_id
        )

    async def rewrite_review_sources(ids):
        async with get_session_factory()() as db:
            await db.execute(
                update(LifeChangeReview)
                .where(LifeChangeReview.id == uuid.UUID(review_id))
                .values(related_event_ids=ids)
            )
            await db.commit()

    original = read_source()
    assert original["valid"] is True
    assert original["validity_reason"] == "VALID"
    assert read_review_validity() is True

    # A legacy import can incorrectly reuse an original comparison record.
    old_id = case["evidence_event_ids"][0]
    asyncio.run(rewrite_review_sources([old_id]))
    recycled = read_source()
    assert recycled["event_id"] == old_id
    assert recycled["valid"] is False
    assert recycled["validity_reason"] == "REUSED_CASE_EVIDENCE"
    assert read_review_validity() is False

    # An event entered after Case creation but *occurred before* creation is
    # historical backfill, not a new owner follow-up.
    backfill = client.post(
        f"/api/v1/pets/{pet}/events",
        json={
            "event_type": "daily.walk",
            "payload": {"duration_minutes": 19},
            "occurred_at": (datetime.now(UTC) - timedelta(hours=6)).isoformat(),
        },
        headers=auth(owner),
    )
    assert backfill.status_code == 201, backfill.text
    backfill_id = backfill.json()["event_id"]
    asyncio.run(rewrite_review_sources([backfill_id]))
    historical = read_source()
    assert historical["event_id"] == backfill_id
    assert historical["valid"] is False
    assert historical["validity_reason"] == "NOT_AFTER_CASE"
    assert historical["payload"]["duration_minutes"] == 19
    assert read_review_validity() is False

    asyncio.run(rewrite_review_sources([current_id]))
    restored = read_source()
    assert restored["valid"] is True
    assert restored["validity_reason"] == "VALID"
    assert read_review_validity() is True
