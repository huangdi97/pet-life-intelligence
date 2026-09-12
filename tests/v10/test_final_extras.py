"""v1.0 final-extras tests (PLI-030/034/048/081)."""

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
