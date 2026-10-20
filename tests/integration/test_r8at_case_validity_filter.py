"""R8AT: history validity filter uses the SAME derived source validity as detail."""
from datetime import datetime, timedelta, timezone

from tests.conftest import auth, create_user

TZ = timezone(timedelta(hours=8))


def _case(client, owner, name: str, *, current_minutes: int = 20):
    pet = client.post(
        "/api/v1/pets", json={"name": name, "species": "dog"}, headers=auth(owner),
    ).json()["id"]
    at = datetime.now(TZ) - timedelta(minutes=2)
    for days in (1, 2, 3):
        response = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert response.status_code == 201, response.text
    current = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": current_minutes},
              "occurred_at": at.isoformat()},
        headers=auth(owner),
    )
    assert current.status_code == 201, current.text
    current_id = current.json()["event_id"]
    assert client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    ).status_code == 201
    case = client.post(
        f"/api/v1/pets/{pet}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert case.status_code == 201, case.text
    return pet, case.json()["case_id"], current_id


def _ids(client, owner, pet, validity=None):
    params = {} if validity is None else {"validity": validity}
    response = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params=params, headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    return {row["case_id"] for row in body["cases"]}, body


def test_filtered_history_paginates_without_overlap(client, seeded):
    """A filtered keyset must page through the SAME invalid set, no repeats."""
    owner = seeded["owner_id"]
    pet = client.post(
        "/api/v1/pets", json={"name": "R8AT Paginated", "species": "dog"},
        headers=auth(owner),
    ).json()["id"]
    at = datetime.now(TZ) - timedelta(minutes=20)
    for days in (1, 2, 3):
        response = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
                  "occurred_at": (at - timedelta(days=days)).isoformat()},
            headers=auth(owner),
        )
        assert response.status_code == 201

    case_ids = []
    for index in range(4):
        current = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 20 + index},
                  "occurred_at": (at + timedelta(minutes=index)).isoformat()},
            headers=auth(owner),
        )
        assert current.status_code == 201, current.text
        assert client.post(
            f"/api/v1/pets/{pet}/baseline/recompute?window_days=14", json={},
            headers=auth(owner),
        ).status_code == 201
        case = client.post(
            f"/api/v1/pets/{pet}/life-change-cases",
            json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
        )
        assert case.status_code == 201, case.text
        case_ids.append(case.json()["case_id"])
        assert client.post(
            f"/api/v1/events/{current.json()['event_id']}/retract",
            headers=auth(owner),
        ).status_code == 200

    first = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"validity": "INVALID", "limit": 2}, headers=auth(owner),
    )
    assert first.status_code == 200, first.text
    first_body = first.json()
    assert first_body["total"] == 4
    assert first_body["has_more"] is True
    assert len(first_body["cases"]) == 2
    assert first_body["next_cursor"]

    second = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={
            "validity": "INVALID", "limit": 2, "cursor": first_body["next_cursor"],
        },
        headers=auth(owner),
    )
    assert second.status_code == 200, second.text
    second_body = second.json()
    assert second_body["total"] == 4
    assert second_body["has_more"] is False
    assert second_body["next_cursor"] is None

    page_ids = [row["case_id"] for row in first_body["cases"] + second_body["cases"]]
    assert len(page_ids) == len(set(page_ids)) == 4
    assert set(page_ids) == set(case_ids)

    # No page of the filtered view may leak the valid complement.
    valid = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"validity": "VALID"}, headers=auth(owner),
    )
    assert valid.status_code == 200
    assert valid.json()["total"] == 0


def test_validity_filter_is_household_scoped_and_composes(client, seeded):
    owner = seeded["owner_id"]
    pet, case_id, current_event = _case(client, owner, "R8AT Composed")
    assert client.post(
        f"/api/v1/events/{current_event}/retract", headers=auth(owner),
    ).status_code == 200

    # Cross-household: a stranger learns nothing, not even that the pet exists.
    stranger = create_user()
    denied = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params={"validity": "INVALID"},
        headers=auth(stranger),
    )
    assert denied.status_code in (403, 404), denied.text
    assert case_id not in denied.text

    # Same household may read (or be capability-limited); either way it must
    # never receive the Case payload without DAILY_READ.
    family = client.get(
        f"/api/v1/pets/{pet}/life-change-cases", params={"validity": "INVALID"},
        headers=auth(seeded["family_id"]),
    )
    assert family.status_code in (200, 403), family.text
    if family.status_code == 200:
        assert {row["case_id"] for row in family.json()["cases"]} == {case_id}
    else:
        assert case_id not in family.text

    # Filters compose: metric text search + validity.
    walk = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"validity": "INVALID", "q": "散步"}, headers=auth(owner),
    )
    assert walk.status_code == 200
    assert {row["case_id"] for row in walk.json()["cases"]} == {case_id}
    sleep = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"validity": "INVALID", "q": "睡眠"}, headers=auth(owner),
    )
    assert sleep.status_code == 200
    assert sleep.json()["cases"] == []

    # A window that starts after creation cannot include the Case.
    future = (datetime.now(TZ) + timedelta(days=1)).isoformat()
    empty = client.get(
        f"/api/v1/pets/{pet}/life-change-cases",
        params={"validity": "INVALID", "since": future}, headers=auth(owner),
    )
    assert empty.status_code == 200
    assert empty.json()["cases"] == []
    assert empty.json()["total"] == 0


def test_validity_filter_matches_retraction_and_supersede(client, seeded):
    owner = seeded["owner_id"]

    pet_retracted, retracted_case, retracted_event = _case(client, owner, "R8AT Retracted")
    assert client.post(
        f"/api/v1/events/{retracted_event}/retract", headers=auth(owner),
    ).status_code == 200

    pet_corrected, corrected_case, corrected_event = _case(client, owner, "R8AT Corrected")
    assert client.post(
        f"/api/v1/pets/{pet_corrected}/events/{corrected_event}/supersede",
        json={"payload": {"duration_minutes": 35}}, headers=auth(owner),
    ).status_code == 201

    pet_valid, valid_case, _ = _case(client, owner, "R8AT Valid")

    for pet, case_id, valid_expected in (
        (pet_retracted, retracted_case, False),
        (pet_corrected, corrected_case, False),
        (pet_valid, valid_case, True),
    ):
        valid_ids, valid_body = _ids(client, owner, pet, "VALID")
        invalid_ids, invalid_body = _ids(client, owner, pet, "INVALID")
        if valid_expected:
            assert valid_ids == {case_id}
            assert invalid_ids == set()
            assert valid_body["total"] == 1
            assert invalid_body["total"] == 0
        else:
            assert valid_ids == set()
            assert invalid_ids == {case_id}
            assert invalid_body["total"] == 1

    # Mixed pet: same evidence set, one invalidated Case and one newer valid one.
    extra = client.post(
        f"/api/v1/pets/{pet_retracted}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 40},
              "occurred_at": (datetime.now(TZ) - timedelta(minutes=1)).isoformat()},
        headers=auth(owner),
    )
    assert extra.status_code == 201
    assert client.post(
        f"/api/v1/pets/{pet_retracted}/baseline/recompute?window_days=14", json={},
        headers=auth(owner),
    ).status_code == 201
    fresh = client.post(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        json={"metric": "walk_minutes_per_day"}, headers=auth(owner),
    )
    assert fresh.status_code == 201, fresh.text
    fresh_id = fresh.json()["case_id"]

    valid_ids, valid_body = _ids(client, owner, pet_retracted, "VALID")
    invalid_ids, invalid_body = _ids(client, owner, pet_retracted, "INVALID")
    assert valid_ids == {fresh_id}
    assert invalid_ids == {retracted_case}
    assert valid_body["total"] == 1
    assert invalid_body["total"] == 1

    # Keyset stays valid with a filter; the filtered page carries its own count.
    response = client.get(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        params={"validity": "VALID", "limit": 1}, headers=auth(owner),
    )
    assert response.status_code == 200
    assert [row["case_id"] for row in response.json()["cases"]] == [fresh_id]
    assert response.json()["total"] == 1
    assert response.json()["next_cursor"] is None

    bad = client.get(
        f"/api/v1/pets/{pet_retracted}/life-change-cases",
        params={"validity": "MAYBE"}, headers=auth(owner),
    )
    assert bad.status_code == 422


def test_validity_filter_agrees_with_detail_for_missing_duplicate_and_wrong_metric_source(
    client, seeded,
):
    """History VALID must mean the same thing as detail source_valid."""
    import asyncio
    import uuid

    from app.core.db import get_session_factory
    from app.models import LifeChangeCase
    from sqlalchemy import select

    owner = seeded["owner_id"]
    pet, case_id, _ = _case(client, owner, "R8BC Detail/List Parity")
    case_path = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"

    detail = client.get(case_path, headers=auth(owner))
    assert detail.status_code == 200 and detail.json()["source_valid"] is True
    original_ids = detail.json()["evidence_event_ids"]
    assert len(original_ids) >= 2

    async def change_evidence(ids, *, metric=None):
        async with get_session_factory()() as db:
            row = (await db.execute(
                select(LifeChangeCase).where(LifeChangeCase.id == uuid.UUID(case_id))
            )).scalar_one()
            row.evidence_event_ids = ids
            if metric is not None:
                row.metric = metric
            await db.commit()

    def assert_validity(expected):
        returned = client.get(case_path, headers=auth(owner))
        assert returned.status_code == 200, returned.text
        assert returned.json()["source_valid"] is expected
        valid, _ = _ids(client, owner, pet, "VALID")
        invalid, _ = _ids(client, owner, pet, "INVALID")
        assert (case_id in valid) is expected
        assert (case_id in invalid) is (not expected)

    # A case can survive in the immutable ledger after a referenced source is
    # missing; it is history, not valid CURRENT evidence.
    asyncio.run(change_evidence([str(uuid.uuid4()), *original_ids[1:]]))
    assert_validity(False)

    # Case creation rejects duplicate evidence. A legacy/corrupt ledger row
    # must nevertheless be hidden from the "source valid" filter.
    asyncio.run(change_evidence([original_ids[0], original_ids[0]]))
    assert_validity(False)

    # All original events are walks; a Case whose frozen metric says "meal"
    # is invalid despite every event still existing on the same pet.
    asyncio.run(change_evidence(original_ids, metric="meal_count_per_day"))
    assert_validity(False)

    asyncio.run(change_evidence(original_ids, metric="walk_minutes_per_day"))
    assert_validity(True)



def test_validity_parity_for_corrupt_and_casefolded_legacy_source_ids(client, seeded):
    """R8BD: corrupted source JSON must not crash detail or bypass list filter."""
    import asyncio
    import uuid

    from app.core.db import get_session_factory
    from app.models import LifeChangeCase
    from sqlalchemy import select

    owner = seeded["owner_id"]
    pet, case_id, _ = _case(client, owner, "R8BD Casefold/Legacy Source")
    detail_path = f"/api/v1/pets/{pet}/life-change-cases/{case_id}"
    sources_path = f"{detail_path}/sources"
    original = client.get(detail_path, headers=auth(owner))
    assert original.status_code == 200
    original_ids = original.json()["evidence_event_ids"]
    assert len(original_ids) >= 2

    async def mutate(ids):
        async with get_session_factory()() as db:
            case = (await db.execute(
                select(LifeChangeCase).where(LifeChangeCase.id == uuid.UUID(case_id))
            )).scalar_one()
            case.evidence_event_ids = ids
            await db.commit()

    def check(expected, *, missing=None):
        detail = client.get(detail_path, headers=auth(owner))
        assert detail.status_code == 200, detail.text
        assert detail.json()["source_valid"] is expected
        valid, _ = _ids(client, owner, pet, "VALID")
        invalid, _ = _ids(client, owner, pet, "INVALID")
        assert (case_id in valid) is expected
        assert (case_id in invalid) is (not expected)
        src = client.get(sources_path, params={"limit": 20}, headers=auth(owner))
        assert src.status_code == 200, src.text
        if missing is not None:
            assert src.json()["missing_event_ids"] == missing
        return src.json()

    # Both hyphenated cases refer to the SAME UUID, not two distinct facts.
    duplicates = [original_ids[0], original_ids[0].upper()]
    asyncio.run(mutate(duplicates))
    check(False, missing=[])

    # A valid uppercase UUID is a real source and must not be misreported
    # missing merely because LifeEvent serialization uses lowercase.
    asyncio.run(mutate([original_ids[0].upper(), original_ids[1]]))
    upper = check(True, missing=[])
    assert len(upper["sources"]) == 2

    # Python uuid.UUID accepts unhyphenated UUID text, PostgreSQL list SQL
    # explicitly does not. Both must mark this as invalid, not diverge.
    compact = original_ids[0].replace("-", "")
    asyncio.run(mutate([compact, original_ids[1]]))
    check(False, missing=[compact])

    # A corrupt legacy source may be a plain string or null; detail and
    # owner sources stay available while VALID filter excludes the Case.
    asyncio.run(mutate(["not-a-uuid", original_ids[1]]))
    check(False, missing=["not-a-uuid"])
    asyncio.run(mutate([None, original_ids[1]]))
    check(False, missing=[None])

    asyncio.run(mutate(original_ids))
    check(True, missing=[])
