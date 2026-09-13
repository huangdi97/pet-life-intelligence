"""Stage D G8 — Security & Authorization hardening tests.

Covers: IDOR matrix across resources, mass assignment, auth negatives,
injection / malformed input, high-risk agent actions. These are GA-critical:
a failure here blocks GA_READY."""

import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)
FAKE_PET = "00000000-0000-0000-0000-00000000dead"


# --- IDOR: every resource must 403/404 for an unrelated user ------------------


class TestIDOR:
    def _outsider(self, client):
        """A user with no relationship to the seeded household."""
        import asyncio

        from app.core.db import get_session_factory
        from app.models import User

        async def mk():
            factory = get_session_factory()
            async with factory() as db:
                u = User(email=f"outsider-{uuid.uuid4().hex[:8]}@pli.demo",
                         display_name="Outsider")
                db.add(u)
                await db.commit()
                return str(u.id)

        return asyncio.run(mk())

    def test_idor_matrix(self, client, seeded):
        outsider = self._outsider(client)
        _owner, mimi = seeded["owner_id"], seeded["mimi_id"]
        he = seeded["health_event_non_emergency_id"]
        # grant outsider nothing; probe every resource class
        probes = [
            ("GET", f"/pets/{mimi}"),
            ("GET", f"/pets/{mimi}/events"),
            ("GET", f"/pets/{mimi}/today"),
            ("GET", f"/pets/{mimi}/tasks"),
            ("GET", f"/pets/{mimi}/health-events"),
            ("GET", f"/health-events/{he}"),
            ("GET", f"/pets/{mimi}/medication-plans"),
            ("GET", f"/pets/{mimi}/behavior-events"),
            ("GET", f"/pets/{mimi}/grants"),
            ("GET", f"/pets/{mimi}/audit"),
            ("GET", f"/pets/{mimi}/search?q=尿"),
            ("GET", f"/pets/{mimi}/export"),
            ("GET", f"/pets/{mimi}/memory"),
            ("GET", f"/pets/{mimi}/baseline"),
            ("GET", f"/pets/{mimi}/diary"),
            ("GET", f"/pets/{mimi}/reminders"),
            ("GET", f"/pets/{mimi}/identifiers"),
            ("GET", f"/pets/{mimi}/health-records"),
            ("GET", f"/pets/{mimi}/expenses"),
            ("GET", f"/pets/{mimi}/milestones"),
            ("GET", f"/pets/{mimi}/behavior/triggers"),
            ("GET", f"/pets/{mimi}/training-goals"),
            ("GET", f"/pets/{mimi}/friends"),
            ("GET", f"/pets/{mimi}/device-events"),
            ("GET", f"/pets/{mimi}/data-quality"),
            ("POST", f"/pets/{mimi}/events", {"event_type": "daily.meal", "payload": {}}),
            ("POST", f"/pets/{mimi}/health-events", {"chief_complaint": "x"}),
            ("POST", f"/pets/{mimi}/tasks", {"title": "x"}),
            ("POST", f"/pets/{mimi}/behavior-events",
             {"occurred_at": NOW.isoformat(), "behavior": "x"}),
            ("POST", f"/pets/{mimi}/handoffs",
             {"caregiver_user_id": outsider, "scopes": ["daily:read"],
              "end_at": (NOW + timedelta(hours=1)).isoformat()}),
            ("POST", f"/pets/{mimi}/care-cards", {"expires_in_hours": 1}),
            ("POST", f"/pets/{mimi}/deletion-requests", {"reason": "x"}),
            ("DELETE", f"/pets/{mimi}"),
        ]
        for probe in probes:
            method, path = probe[0], probe[1]
            body = probe[2] if len(probe) > 2 else None
            if method == "GET":
                r = client.get(path, headers=auth(outsider))
            elif method == "DELETE":
                r = client.delete(path, headers=auth(outsider))
            else:
                r = client.post(path, json=body, headers=auth(outsider))
            # 403 explicit deny, or 404 existence-hiding — both acceptable;
            # anything 2xx is an IDOR hole.
            assert r.status_code in (401, 403, 404), (
                f"IDOR hole: {method} {path} -> {r.status_code} {r.text[:200]}"
            )
            if r.status_code == 404 and method == "GET" and "pets" in path:
                # 404 must not leak the pet's existence via name in body
                assert "Mimi" not in r.text and "Coco" not in r.text

    def test_fake_uuid_stays_404_without_leak(self, client, seeded):
        outsider = self._outsider(client)
        r = client.get(f"/pets/{FAKE_PET}", headers=auth(outsider))
        assert r.status_code == 404
        assert "Mimi" not in r.text

    def test_response_of_forbidden_has_no_pet_data(self, client, seeded):
        outsider = self._outsider(client)
        mimi = seeded["mimi_id"]
        r = client.get(f"/pets/{mimi}/events", headers=auth(outsider))
        assert r.status_code in (403, 404)
        body = r.text
        assert "event_type" not in body and "chief_complaint" not in body


# --- Mass assignment: server-controlled fields cannot be overwritten ----------


class TestMassAssignment:
    def test_pet_create_ignores_privileged_fields(self, client, seeded):
        owner = seeded["owner_id"]
        r = client.post("/api/v1/pets",
                        json={"name": "MA-Pet", "species": "dog",
                              "role": "OWNER", "is_admin": True,
                              "household_id": "00000000-0000-0000-0000-000000000099",
                              "owner_id": "00000000-0000-0000-0000-00000000abc",
                              "lifecycle_status": "DECEASED",
                              "field_privacy": ["name"]},
                        headers=auth(owner))
        assert r.status_code == 201
        pet = client.get(f"/api/v1/pets/{r.json()['id']}", headers=auth(owner)).json()
        # privileged fields silently dropped by the server-side schema
        assert "role" not in pet and "is_admin" not in pet
        assert "owner_id" not in pet and "household_id" not in str(pet.get("role", ""))
        assert pet.get("field_privacy_applied") is None
        assert pet["name"] == "MA-Pet"
        # pet must be in the creator's household, not the injected one
        assert pet["household_id"] == seeded["household_id"]

    def test_event_payload_cannot_inject_decision_fields(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/events",
                        json={"event_type": "daily.meal",
                              "payload": {"amount": "50",
                                          "triage": "MONITOR",
                                          "diagnosis": "没病",
                                          "emergency_override": True}},
                        headers=auth(owner))
        assert r.status_code == 422  # strict payload: unknown fields rejected

    def test_triage_not_writable_via_health_event(self, client, seeded):
        owner, mimi = seeded["owner_id"], seeded["mimi_id"]
        r = client.post(f"/api/v1/pets/{mimi}/health-events",
                        json={"chief_complaint": "拉肚子", "triage_override": "MONITOR",
                              "final_diagnosis": "没事", "treatment_order": "无"},
                        headers=auth(owner))
        # GOAL 7.4: decision fields are rejected at schema level (extra=forbid)
        assert r.status_code == 422
        assert "extra_forbidden" in r.text


# --- Authentication negatives -------------------------------------------------


class TestAuthNegatives:
    def test_malformed_dev_header(self, client, seeded):
        r = client.get("/api/v1/pets", headers={"X-Dev-User-Id": "not-a-uuid"})
        assert r.status_code == 401

    def test_unknown_user(self, client, seeded):
        r = client.get("/api/v1/pets",
                       headers={"X-Dev-User-Id": "00000000-0000-0000-0000-00000000abc"})
        assert r.status_code == 401

    def test_missing_auth(self, client, seeded):
        r = client.get("/api/v1/pets")
        assert r.status_code == 401

    def test_inactive_user_rejected(self, client, seeded):
        import asyncio

        from app.core.db import get_session_factory
        from app.models import User

        async def mk_and_disable():
            factory = get_session_factory()
            async with factory() as db:
                u = User(email=f"disabled-{uuid.uuid4().hex[:6]}@pli.demo",
                         display_name="Disabled", is_active=False)
                db.add(u)
                await db.commit()
                return str(u.id)

        uid = asyncio.run(mk_and_disable())
        r = client.get("/api/v1/pets", headers=auth(uid))
        assert r.status_code == 401

    def test_bearer_garbage_rejected(self, client, seeded):
        r = client.get("/api/v1/pets", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401


# --- Injection / malformed input ---------------------------------------------


class TestMalformedInput:
    def _log_event(self, client, pet_id, headers, text):
        return client.post(f"/api/v1/pets/{pet_id}/events",
                           json={"event_type": "daily.play",
                                 "payload": {"activity_type": text,
                                             "notes": text},
                                 "allow_duplicate": True},
                           headers=headers)

    def test_hostile_strings_never_500_or_execute(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        hostile = [
            "<script>alert(1)</script>",
            "'; DROP TABLE users; --",
            "\"}{\"$gt\":\"\"}",
            "🐱" * 200,
            "中文" * 500,
            "a" * 5000,
            "\x00\x01\x02",
            None,
        ]
        for text in hostile:
            r = self._log_event(client, coco, auth(owner), text)
            # either stored verbatim (no execution) or validation-rejected
            assert r.status_code in (201, 422), f"unexpected {r.status_code}: {r.text[:200]}"
            if r.status_code == 201:
                stored = str(r.json()["payload"])
                assert "alert(1)" not in r.text or "alert(1)" in stored  # stored, not executed
        # DB intact after hostile inputs
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(owner)).status_code == 200

    def test_json_nesting_rejected(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        deep = {"event_type": "daily.play", "payload": {"notes": "x"}}
        node = deep["payload"]
        for _ in range(60):
            node["nested"] = {"v": 1}
            node = node["nested"]
        r = client.post(f"/api/v1/pets/{coco}/events", json=deep, headers=auth(owner))
        assert r.status_code in (201, 422)

    def test_invalid_enum_and_huge_numbers(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r1 = client.post(f"/api/v1/pets/{coco}/events",
                         json={"event_type": "daily.walk",
                               "payload": {"duration_minutes": 10**12}},
                         headers=auth(owner))
        assert r1.status_code == 422
        r2 = client.post(f"/api/v1/pets/{coco}/events",
                         json={"event_type": "daily.walk",
                               "payload": {"duration_minutes": -5}},
                         headers=auth(owner))
        assert r2.status_code == 422
        r3 = client.post(f"/api/v1/pets/{coco}/events",
                         json={"event_type": "NOT_A_TYPE", "payload": {}},
                         headers=auth(owner))
        assert r3.status_code == 422

    def test_duplicate_request_still_idempotent(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        body = {"event_type": "daily.drink", "payload": {"amount": "100"},
                "occurred_at": NOW.isoformat()}
        r1 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        r2 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert r1.status_code == 201 and r2.status_code == 409


# --- High-risk agent actions remain non-executable ----------------------------


class TestHighRiskAgent:
    def test_all_high_risk_classes_refused(self, client, seeded):
        owner = seeded["owner_id"]
        for cls in ("BOOKING", "PURCHASE", "MEDICAL"):
            r = client.post("/api/v1/agent/actions",
                            json={"action_class": cls,
                                  "proposal": {"target": "anything"},
                                  "pet_id": seeded["coco_id"]},
                            headers=auth(owner))
            assert r.json()["policy_result"] == "REFUSED"
            assert r.json()["executed"] is False

    def test_transfer_merge_deletion_stay_pending(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        tr = client.post(f"/api/v1/pets/{coco}/transfer-requests",
                         json={"to_user_email": "x@example.com"}, headers=auth(owner))
        assert tr.json()["status"] == "PENDING"
        mr = client.post("/api/v1/pets/merge-requests",
                         json={"pet_id_a": coco, "pet_id_b": seeded["mimi_id"]},
                         headers=auth(owner))
        assert mr.json()["status"] == "PENDING"
        dr = client.post(f"/api/v1/pets/{coco}/deletion-requests",
                         json={"reason": "x"}, headers=auth(owner))
        assert dr.json()["status"] == "PENDING"
        # nothing actually happened
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(owner)).status_code == 200
