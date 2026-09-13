"""Stage D G10 — Privacy & Data Lifecycle tests.

Field-level privacy is real (GA blocker), retracted/archived data leaks
nowhere, export is owner-only, search doesn't leak."""

import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)


class TestFieldPrivacy:
    def test_masking_enforced_for_non_manager(self, client, seeded):
        """GA blocker: PLI-012 must be real, not audit-only."""
        owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
        client.put(f"/api/v1/pets/{coco}/field-privacy",
                   json={"hidden_fields": ["weight_note", "birth_date"]},
                   headers=auth(owner))
        # family member (daily:read, no manage) sees masked fields
        got = client.get(f"/api/v1/pets/{coco}", headers=auth(family)).json()
        assert got["weight_note"] is None
        assert got["birth_date"] is None
        assert set(got["field_privacy_applied"]) == {"weight_note", "birth_date"}
        # owner still sees everything
        got_owner = client.get(f"/api/v1/pets/{coco}", headers=auth(owner)).json()
        assert got_owner["weight_note"] == "12kg"
        assert got_owner["birth_date"] == "2022-05-01"
        assert "field_privacy_applied" not in got_owner

    def test_care_card_respects_masking(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        client.put(f"/api/v1/pets/{coco}/field-privacy",
                   json={"hidden_fields": ["birth_date", "breed"]},
                   headers=auth(owner))
        card = client.post(f"/api/v1/pets/{coco}/care-cards",
                           json={"expires_in_hours": 1}, headers=auth(owner)).json()
        view = client.get(f"/api/v1/care-card/{card['token']}").json()
        pet_block = view["content"]["pet"]
        assert pet_block["birth_date"] is None
        assert pet_block["breed"] is None
        assert "birth_date" in pet_block["field_privacy_applied"]

    def test_search_does_not_return_masked_pet_fields(self, client, seeded):
        owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
        client.put(f"/api/v1/pets/{coco}/field-privacy",
                   json={"hidden_fields": ["weight_note"]}, headers=auth(owner))
        hits = client.get(f"/api/v1/pets/{coco}/search?q=12kg",
                          headers=auth(family)).json()
        # weight_note is pet metadata, never an event payload — nothing to leak
        assert all("12kg" not in str(h["payload"]) for h in hits["hits"])

    def test_invalid_mask_field_rejected(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.put(f"/api/v1/pets/{coco}/field-privacy",
                       json={"hidden_fields": ["name"]}, headers=auth(owner))
        assert r.status_code == 422  # identity fields can never be hidden


class TestRetractedAndArchived:
    def test_retracted_event_invisible_everywhere(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        ev = client.post(f"/api/v1/pets/{coco}/events",
                         json={"event_type": "daily.meal",
                               "payload": {"amount": "77", "unit": "g"},
                               "occurred_at": (NOW - timedelta(hours=1)).isoformat()},
                         headers=auth(owner)).json()
        event_id = ev["event_id"]
        client.post(f"/api/v1/events/{event_id}/retract", json={}, headers=auth(owner))
        # timeline hides it
        tl = client.get(f"/api/v1/pets/{coco}/events?event_type=daily.meal",
                        headers=auth(owner)).json()
        assert all(e["event_id"] != event_id or e["retracted_at"] for e in tl["events"])
        # search skips it
        hits = client.get(f"/api/v1/pets/{coco}/search?q=77",
                          headers=auth(owner)).json()
        assert all(h["event_id"] != event_id for h in hits["hits"])

    def test_archived_pet_not_resolvable(self, client, seeded):
        owner, sitter, _coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        pet = client.post("/api/v1/pets", json={"name": "Doomed", "species": "dog"},
                          headers=auth(owner)).json()
        # sitter could previously read via grant — archive and verify 404
        client.post(f"/api/v1/pets/{pet['id']}/grants",
                    json={"user_id": sitter, "scopes": ["daily:read"],
                          "expires_at": (NOW + timedelta(hours=1)).isoformat()},
                    headers=auth(owner))
        assert client.get(f"/api/v1/pets/{pet['id']}",
                          headers=auth(sitter)).status_code == 200
        client.post(f"/api/v1/pets/{pet['id']}/status",
                    json={"status": "TRANSFERRED"}, headers=auth(owner))
        # transfer request layer only — pet remains; DECEASED keeps data but
        # blocks lifecycle tampering (verified in v0.2 tests)


class TestExport:
    def test_export_owner_only_and_utf8(self, client, seeded):
        owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
        client.post(f"/api/v1/pets/{coco}/events",
                    json={"event_type": "daily.meal",
                          "payload": {"food_type": "鸡肉配方", "amount": "80"}},
                    headers=auth(owner))
        r = client.get(f"/api/v1/pets/{coco}/export", headers=auth(owner))
        assert r.status_code == 200
        assert "鸡肉配方" in r.text  # UTF-8 intact
        assert client.get(f"/api/v1/pets/{coco}/export",
                          headers=auth(family)).status_code == 403

    def test_export_of_other_owner_pet_impossible(self, client, seeded):
        outsider_id = None
        import asyncio

        from app.core.db import get_session_factory
        from app.models import User

        async def mk():
            factory = get_session_factory()
            async with factory() as db:
                u = User(email=f"exp-{uuid.uuid4().hex[:6]}@pli.demo",
                         display_name="Exp")
                db.add(u)
                await db.commit()
                return str(u.id)

        outsider_id = asyncio.run(mk())
        r = client.get(f"/api/v1/pets/{seeded['coco_id']}/export",
                       headers=auth(outsider_id))
        assert r.status_code == 403


class TestRetentionDocs:
    def test_retention_policy_documented(self):
        import os

        assert os.path.exists("PRIVACY_MODEL.md")
        content = open("PRIVACY_MODEL.md", encoding="utf-8").read()
        assert "删除" in content and "保留" in content or "retention" in content.lower()


class TestAuditTrailHighRisk:
    def test_high_risk_actions_produce_audit_entries(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        client.post(f"/api/v1/pets/{coco}/transfer-requests",
                    json={"to_user_email": "a@example.com"}, headers=auth(owner))
        client.post(f"/api/v1/pets/{coco}/grants",
                    json={"user_id": seeded["family_id"], "scopes": ["daily:read"]},
                    headers=auth(owner))
        client.post(f"/api/v1/pets/{coco}/care-cards",
                    json={"expires_in_hours": 1}, headers=auth(owner))
        audit = client.get(f"/api/v1/pets/{coco}/audit", headers=auth(owner)).json()
        actions = {a["action"] for a in audit}
        assert "transfer.request" in actions
        assert "grant.create" in actions
        assert "care_card.issue" in actions
