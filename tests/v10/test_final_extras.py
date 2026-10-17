"""v1.0 final-extras tests (PLI-030/034/048/081)."""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth


def test_emergency_grant_short_ttl_scoped(client, seeded):
    owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/emergency-grants",
                    json={"user_id": family, "hours": 2}, headers=auth(owner))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["scopes"] == ["medical:read", "card:read"]  # read-only, no manage
    # grants list shows it ACTIVE with expiry
    grants = client.get(f"/api/v1/pets/{coco}/grants", headers=auth(owner)).json()
    g = [x for x in grants if x["grant_id"] == body["grant_id"]][0]
    assert g["status"] == "ACTIVE" and g["expires_at"] is not None


def test_abnormal_day_hint_deterministic(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    # compute baseline first (seeded walk today exists)
    client.post(f"/api/v1/pets/{coco}/baseline/recompute?window_days=14",
                json={}, headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/abnormal-day-hint", headers=auth(owner))
    assert r.status_code == 200
    assert "非健康判断" in r.json()["rule"]


def test_abnormal_day_hint_keeps_missing_baseline_unknown(client, seeded):
    owner = seeded["owner_id"]
    created = client.post(
        "/api/v1/pets",
        json={"name": "No-Baseline Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    pet_id = created.json()["id"]
    response = client.get(
        f"/api/v1/pets/{pet_id}/abnormal-day-hint",
        headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["explanations"] == []
    assert body["status"] == "INSUFFICIENT"
    assert "不能判断" in body["hints"][0]


def test_abnormal_day_hint_uses_same_clock_duration_not_event_count(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    product_tz = timezone(timedelta(hours=8))
    now = datetime.now(product_tz)

    # Three previous comparable days at the same clock point establish a
    # deterministic duration baseline. Use "now - 5 min" so the test remains
    # valid even when CI happens to run just after local midnight.
    current = now - timedelta(minutes=5)
    for days_ago, minutes in ((1, 10), (2, 20), (3, 30)):
        occurred = current - timedelta(days=days_ago)
        created = client.post(
            f"/api/v1/pets/{coco}/events",
            json={
                "event_type": "daily.walk",
                "payload": {"duration_minutes": minutes},
                "occurred_at": occurred.isoformat(),
            },
            headers=auth(owner),
        )
        assert created.status_code == 201, created.text

    created = client.post(
        f"/api/v1/pets/{coco}/events",
        json={
            "event_type": "daily.walk",
            "payload": {"duration_minutes": 20},
            "occurred_at": current.isoformat(),
        },
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text

    recompute = client.post(
        f"/api/v1/pets/{coco}/baseline/recompute?window_days=14",
        json={},
        headers=auth(owner),
    )
    assert recompute.status_code == 201, recompute.text

    today = client.get(f"/api/v1/pets/{coco}/today", headers=auth(owner)).json()
    # /abnormal-day-hint compares like-for-like at the current local clock: a
    # 05:15 owner screen is never compared with a full-day total. A same-day walk
    # that is only scheduled later in the morning must therefore not enter the
    # expected value, and retracted rows are excluded because the endpoint
    # reports recorded facts. Summing everything in /today's local day made this
    # assertion fail whenever CI ran before the seeded morning walk (observed as
    # 20.0 != 50.0 at 2026-10-10T21:20Z, i.e. 05:20 local).
    clock = datetime.now(product_tz)
    expected_walk_minutes = sum(
        float((event.get("payload") or {}).get("duration_minutes") or 0)
        for event in today["events"]
        if event["event_type"] == "daily.walk"
        and not event.get("retracted_at")
        and datetime.fromisoformat(
            str(event["occurred_at"]).replace("Z", "+00:00")
        ).astimezone(product_tz) <= clock
    )
    # The walk posted at ``current`` above must be part of the compared value.
    assert expected_walk_minutes >= 20

    response = client.get(
        f"/api/v1/pets/{coco}/abnormal-day-hint",
        headers=auth(owner),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    walk = next(
        row for row in body["explanations"]
        if row["metric"] == "walk_minutes_per_day"
    )
    assert walk["unit"] == "分钟"
    assert walk["current_value"] == expected_walk_minutes
    assert walk["sample_count"] >= 3
    assert walk["same_time_baseline"] is not None
    assert walk["source_scope"] == "RECORDED_LIFE_EVENTS"
    assert isinstance(walk["deviation_percent"], int)
    assert "同一时间" in walk["comparison"]
    assert "不能据此判断疾病" in walk["uncertainty"]
    assert "同期对比" in body["rule"]


def test_care_feedback_7d(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.get(f"/api/v1/pets/{coco}/care-feedback", headers=auth(owner))
    assert r.status_code == 200
    assert isinstance(r.json()["feedback"], list)


def test_consultation_package_bundle(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    client.post(f"/api/v1/pets/{coco}/behavior-events",
                json={"occurred_at": "2026-09-13T08:00:00Z",
                      "antecedent": "门铃", "behavior": "吠叫"},
                headers=auth(owner))
    r = client.get(f"/api/v1/pets/{coco}/behavior-consultation-package",
                   headers=auth(owner))
    assert r.status_code == 200
    body = r.json()
    assert body["recent_behaviors"]
    assert "不构成诊断" in body["disclaimer"]


def test_missing_today_is_unknown_not_a_false_100_percent_decline(client, seeded):
    owner = seeded["owner_id"]
    made = client.post(
        "/api/v1/pets",
        json={"name": "Baseline Missingness Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert made.status_code == 201, made.text
    pet = made.json()["id"]
    clock = datetime.now(timezone(timedelta(hours=8)))
    early = clock - timedelta(minutes=5)
    # Three comparable past days, but NO current-day observation.
    for days_back in (1, 2, 3):
        occurred = early - timedelta(days=days_back)
        created = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk", "payload": {"duration_minutes": 30},
                  "occurred_at": occurred.isoformat()},
            headers=auth(owner),
        )
        assert created.status_code == 201, created.text
    rebaseline = client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14",
        json={}, headers=auth(owner),
    )
    assert rebaseline.status_code == 201, rebaseline.text
    result = client.get(
        f"/api/v1/pets/{pet}/abnormal-day-hint", headers=auth(owner),
    )
    assert result.status_code == 200, result.text
    body = result.json()
    metric = next(x for x in body["explanations"] if x["metric"] == "walk_minutes_per_day")
    assert metric["sample_count"] >= 3
    assert metric["current_recorded"] is False
    assert metric["current_event_ids"] == []
    assert metric["deviation_percent"] is None
    assert metric["direction"] == "INSUFFICIENT"
    assert metric["notable"] is False
    assert "未知" in metric["comparison"]
    assert "零" in metric["fact"]
    assert body["status"] == "INSUFFICIENT"


def test_personal_baseline_uses_life_replay_corrections_not_obsolete_events(client, seeded):
    """A corrected walk must not be counted twice or kept in the old baseline."""
    from app.core.db import get_session_factory
    from app.domain import enums
    from app.services.eventlog import create_life_event

    owner = seeded["owner_id"]
    created = client.post(
        "/api/v1/pets",
        json={"name": "Correction Truth Pet", "species": "dog"},
        headers=auth(owner),
    )
    assert created.status_code == 201, created.text
    pet = created.json()["id"]
    midnight = datetime.now(timezone(timedelta(hours=8))).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    for days_back in (1, 2, 3):
        response = client.post(
            f"/api/v1/pets/{pet}/events",
            json={"event_type": "daily.walk",
                  "payload": {"duration_minutes": 30},
                  "occurred_at": (midnight - timedelta(days=days_back)).isoformat()},
            headers=auth(owner),
        )
        assert response.status_code == 201, response.text
    initial = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk",
              "payload": {"duration_minutes": 90},
              "occurred_at": midnight.isoformat()},
        headers=auth(owner),
    )
    assert initial.status_code == 201, initial.text
    old_id = initial.json()["event_id"]
    recompute = client.post(
        f"/api/v1/pets/{pet}/baseline/recompute?window_days=14",
        json={}, headers=auth(owner),
    )
    assert recompute.status_code == 201, recompute.text

    async def correct_and_commit():
        async with get_session_factory()() as db:
            corrected, _ = await create_life_event(
                db,
                pet_id=uuid.UUID(pet),
                event_type="daily.walk",
                payload={"duration_minutes": 20},
                actor_id=uuid.UUID(owner),
                occurred_at=midnight,
                source_type=enums.SourceType.OWNER_REPORTED,
                supersedes_event_id=uuid.UUID(old_id),
            )
            await db.commit()
            return str(corrected.id)

    new_id = asyncio.run(correct_and_commit())
    today = client.get(f"/api/v1/pets/{pet}/today", headers=auth(owner))
    hint = client.get(f"/api/v1/pets/{pet}/abnormal-day-hint", headers=auth(owner))
    assert today.status_code == 200 and hint.status_code == 200
    current_walk_ids = [
        item["event_id"] for item in today.json()["events"]
        if item["event_type"] == "daily.walk"
    ]
    assert new_id in current_walk_ids and old_id not in current_walk_ids
    walk = next(
        row for row in hint.json()["explanations"]
        if row["metric"] == "walk_minutes_per_day"
    )
    assert walk["current_recorded"] is True
    assert walk["current_event_ids"] == [new_id]
    assert walk["current_value"] == 20
    assert walk["sample_count"] == 3
    assert walk["same_time_baseline"] == 30

    retracted = client.post(f"/api/v1/events/{new_id}/retract", headers=auth(owner))
    assert retracted.status_code == 200
    after = client.get(f"/api/v1/pets/{pet}/abnormal-day-hint", headers=auth(owner))
    assert after.status_code == 200
    corrected_walk = next(
        row for row in after.json()["explanations"]
        if row["metric"] == "walk_minutes_per_day"
    )
    assert corrected_walk["current_recorded"] is False
    assert corrected_walk["current_event_ids"] == []
    assert corrected_walk["deviation_percent"] is None
    assert corrected_walk["direction"] == "INSUFFICIENT"


def test_stored_baseline_and_care_feedback_obey_corrected_event_truth(client, seeded):
    """The persisted baseline and seven-day feedback cannot retain a replaced event."""
    from app.core.db import get_session_factory
    from app.domain import enums
    from app.services.eventlog import create_life_event

    owner = seeded["owner_id"]
    new_pet = client.post(
        "/api/v1/pets", json={"name": "One Correctable Walk", "species": "dog"},
        headers=auth(owner),
    )
    assert new_pet.status_code == 201, new_pet.text
    pet = new_pet.json()["id"]
    observed_at = datetime.now(timezone.utc) - timedelta(minutes=4)
    recorded = client.post(
        f"/api/v1/pets/{pet}/events",
        json={"event_type": "daily.walk", "payload": {"duration_minutes": 90},
              "occurred_at": observed_at.isoformat()},
        headers=auth(owner),
    )
    assert recorded.status_code == 201, recorded.text
    old_id = recorded.json()["event_id"]

    def recompute():
        return client.post(
            f"/api/v1/pets/{pet}/baseline/recompute?window_days=14",
            json={}, headers=auth(owner),
        )

    before = recompute()
    assert before.status_code == 201, before.text
    assert before.json()["baselines"]["walk_minutes_per_day"]["value"] == 90

    async def append_correction():
        async with get_session_factory()() as db:
            replacement, replayed = await create_life_event(
                db, pet_id=uuid.UUID(pet), actor_id=uuid.UUID(owner),
                event_type="daily.walk", payload={"duration_minutes": 20},
                occurred_at=observed_at,
                supersedes_event_id=uuid.UUID(old_id),
                source_type=enums.SourceType.OWNER_REPORTED,
            )
            assert not replayed
            await db.commit()
            return str(replacement.id)

    new_id = asyncio.run(append_correction())
    after = recompute()
    assert after.status_code == 201, after.text
    assert after.json()["baselines"]["walk_minutes_per_day"]["value"] == 20

    saved = client.get(f"/api/v1/pets/{pet}/baseline", headers=auth(owner))
    assert saved.status_code == 200
    assert next(r for r in saved.json() if r["metric"] == "walk_minutes_per_day")["value"] == "20.0"

    feedback = client.get(f"/api/v1/pets/{pet}/care-feedback", headers=auth(owner))
    assert feedback.status_code == 200
    walk = next(r for r in feedback.json()["feedback"] if r["event_type"] == "daily.walk")
    assert walk["count_7d"] == 1 and walk["source_event_ids"] == [new_id]

    retract = client.post(f"/api/v1/events/{new_id}/retract", headers=auth(owner))
    assert retract.status_code == 200
    no_facts = recompute()
    assert no_facts.status_code == 201, no_facts.text
    assert no_facts.json()["baselines"]["walk_minutes_per_day"] is None
    later_baseline = client.get(f"/api/v1/pets/{pet}/baseline", headers=auth(owner))
    assert all(r["metric"] != "walk_minutes_per_day" for r in later_baseline.json())
    later_feedback = client.get(f"/api/v1/pets/{pet}/care-feedback", headers=auth(owner))
    assert not any(r["event_type"] == "daily.walk" for r in later_feedback.json()["feedback"])
