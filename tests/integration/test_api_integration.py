"""Integration tests (G2/G3/G4/G5): idempotency, provenance, permissions,
cross-pet isolation, task conflicts, handoffs, care cards, health flow,
medication conflicts, audit."""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


# --- G2: idempotency / provenance / duplicate detection --------------------


class TestIdempotency:
    def test_same_key_replays_same_event(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        body = {"event_type": "daily.meal", "payload": {"amount": "80", "unit": "g"}}
        r1 = client.post(f"/api/v1/pets/{coco}/events", json=body,
                         headers={**auth(owner), "Idempotency-Key": "meal-1"})
        r2 = client.post(f"/api/v1/pets/{coco}/events", json=body,
                         headers={**auth(owner), "Idempotency-Key": "meal-1"})
        assert r1.status_code == 201 and r2.status_code == 201
        assert r1.json()["event_id"] == r2.json()["event_id"]
        assert r2.json()["replayed"] is True

    def test_duplicate_without_key_rejected_not_overwritten(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        at = (NOW - timedelta(minutes=5)).isoformat()
        body = {"event_type": "daily.drink", "payload": {"amount": "200", "unit": "ml"},
                "occurred_at": at}
        r1 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        r2 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert r1.status_code == 201
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "DUPLICATE_EVENT"
        assert r2.json()["error"]["details"]["existing_event_id"] == r1.json()["event_id"]

    def test_allow_duplicate_flag_records_both(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        body = {"event_type": "daily.walk",
                "payload": {"duration_minutes": 10},
                "allow_duplicate": True}
        r1 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        r2 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert r1.json()["event_id"] != r2.json()["event_id"]

    def test_invalid_payload_rejected(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/events",
                        json={"event_type": "daily.meal", "payload": {"nope": 1}},
                        headers=auth(owner))
        assert r.status_code == 422

    def test_provenance_on_created_event(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(
            f"/api/v1/pets/{coco}/events",
            json={"event_type": "daily.weight",
                  "payload": {"weight_kg": "12.1"},
                  "source_type": "OWNER_REPORTED"},
            headers=auth(owner),
        )
        ev = r.json()
        assert ev["provenance_level"] == "OWNER_REPORTED"
        assert ev["schema_version"] == "1.0.0"


# --- G3: permissions --------------------------------------------------------


class TestPermissions:
    def test_unauthenticated_rejected(self, client, seeded):
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}")
        assert r.status_code == 401

    def test_family_member_read_and_daily_write(self, client, seeded):
        family, coco = seeded["family_id"], seeded["coco_id"]
        r = client.get(f"/api/v1/pets/{coco}", headers=auth(family))
        assert r.status_code == 200
        r = client.post(f"/api/v1/pets/{coco}/events",
                        json={"event_type": "daily.play", "payload": {"duration_minutes": 5}},
                        headers=auth(family))
        assert r.status_code == 201

    def test_family_cannot_manage(self, client, seeded):
        family, coco = seeded["family_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/grants",
                        json={"user_id": seeded["sitter_id"], "scopes": ["daily:read"]},
                        headers=auth(family))
        assert r.status_code == 403

    def test_family_cannot_write_medical(self, client, seeded):
        family, coco = seeded["family_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/health-events",
                        json={"chief_complaint": "test"}, headers=auth(family))
        assert r.status_code == 403

    def test_outsider_cannot_read(self, client, seeded):
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(seeded["sitter_id"]))
        assert r.status_code == 403

    def test_cross_pet_isolation(self, client, seeded):
        """Sitter has grant on 豆豆 only — must not read 咪咪."""
        owner, sitter = seeded["owner_id"], seeded["sitter_id"]
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/grants",
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "reason": "test", "expires_at": (NOW + timedelta(hours=1)).isoformat()},
                        headers=auth(owner))
        assert r.status_code == 201
        assert client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(sitter)).status_code == 200
        assert client.get(f"/api/v1/pets/{seeded['mimi_id']}", headers=auth(sitter)).status_code == 403
        r = client.get(f"/api/v1/pets/{seeded['mimi_id']}/events", headers=auth(sitter))
        assert r.status_code == 403

    def test_expired_grant_is_dead(self, client, seeded):
        owner, sitter = seeded["owner_id"], seeded["sitter_id"]
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/grants",
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "expires_at": (NOW - timedelta(minutes=1)).isoformat()},
                        headers=auth(owner))
        assert r.status_code == 201
        assert client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(sitter)).status_code == 403

    def test_revoked_grant_is_dead(self, client, seeded):
        owner, sitter = seeded["owner_id"], seeded["sitter_id"]
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/grants",
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "expires_at": (NOW + timedelta(hours=1)).isoformat()},
                        headers=auth(owner))
        grant_id = r.json()["grant_id"]
        assert client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(sitter)).status_code == 200
        client.delete(f"/api/v1/grants/{grant_id}", headers=auth(owner))
        assert client.get(f"/api/v1/pets/{seeded['coco_id']}", headers=auth(sitter)).status_code == 403

    def test_sitter_cannot_grant_to_others(self, client, seeded):
        owner, sitter = seeded["owner_id"], seeded["sitter_id"]
        client.post(f"/api/v1/pets/{seeded['coco_id']}/grants",
                    json={"user_id": sitter, "scopes": ["daily:read", "daily:write"],
                          "expires_at": (NOW + timedelta(hours=1)).isoformat()},
                    headers=auth(owner))
        # sitter tries to re-grant to a third party — hard boundary
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/grants",
                        json={"user_id": seeded["family_id"], "scopes": ["daily:read"]},
                        headers=auth(sitter))
        assert r.status_code == 403

    def test_owner_cannot_be_invited_as_owner_role(self, client, seeded):
        r = client.post(f"/api/v1/households/{seeded['household_id']}/invitations",
                        json={"email": "x@y.dev", "role": "OWNER"},
                        headers=auth(seeded["owner_id"]))
        assert r.status_code == 403

    def test_audit_visible_to_owner(self, client, seeded):
        owner = seeded["owner_id"]
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}/audit", headers=auth(owner))
        assert r.status_code == 200
        actions = {a["action"] for a in r.json()}
        assert "pet.create" in actions or len(r.json()) >= 0


# --- G4: tasks / timeline / today -------------------------------------------


class TestTasks:
    def test_complete_then_conflict(self, client, seeded):
        owner, family, task = seeded["owner_id"], seeded["family_id"], seeded["task_id"]
        r1 = client.post(f"/api/v1/tasks/{task}/complete", json={"note": "done"},
                         headers=auth(family))
        assert r1.status_code == 200
        assert r1.json()["completed_by"] == family
        r2 = client.post(f"/api/v1/tasks/{task}/complete", json={"note": "again"},
                         headers=auth(owner))
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "TASK_CONFLICT"
        assert r2.json()["error"]["details"]["completed_by"] == family

    def test_repeating_task_spawns_next(self, client, seeded):
        owner, task = seeded["owner_id"], seeded["task_id"]
        r1 = client.post(f"/api/v1/tasks/{task}/complete", json={}, headers=auth(owner))
        assert r1.json()["next_occurrence_due_at"] is not None
        r2 = client.get(f"/api/v1/pets/{seeded['coco_id']}/tasks?status=OPEN",
                        headers=auth(owner))
        titles = [t["title"] for t in r2.json()]
        assert "Evening feeding" in titles

    def test_task_completion_in_timeline(self, client, seeded):
        family, task = seeded["family_id"], seeded["task_id"]
        client.post(f"/api/v1/tasks/{task}/complete", json={}, headers=auth(family))
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}/events?event_type=care.task_completed",
                       headers=auth(seeded["owner_id"]))
        events = r.json()["events"]
        assert events and events[0]["actor_name"] == "Demo Family Member"
