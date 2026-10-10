"""v1.0 final-extras tests (PLI-030/034/048/081)."""

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
    expected_walk_minutes = sum(
        float((event.get("payload") or {}).get("duration_minutes") or 0)
        for event in today["events"]
        if event["event_type"] == "daily.walk"
    )

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
