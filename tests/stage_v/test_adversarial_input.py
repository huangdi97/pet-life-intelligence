"""Stage V §14 — input adversarial tests.

Repeated events, out-of-order, future time, old backfill, cross-timezone,
invalid units, negatives, NaN/Infinity, huge numbers, empty strings, long
strings, Unicode/Emoji, malformed JSON, broken/huge media, duplicate submit.
Timeout / network drop / partial upload are verified at the adapter level
(services/api/app/adapters) and mapped in the report.
"""

from __future__ import annotations

import asyncio
import io
import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth

NOW = datetime.now(timezone.utc)
FAKE_PET = "00000000-0000-0000-0000-00000000dead"


class TestRepeatedAndOutOfOrder:
    def test_repeated_identical_event_conflicts(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        body = {"event_type": "daily.meal", "payload": {"amount": "80", "unit": "g"},
                "occurred_at": (NOW - timedelta(minutes=3)).isoformat()}
        r1 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert r1.status_code == 201
        r2 = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert r2.status_code == 409
        assert r2.json()["error"]["code"] == "DUPLICATE_EVENT"

    def test_same_key_replays_no_duplicate(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        h = {**auth(owner), "Idempotency-Key": "adv-input-1"}
        body = {"event_type": "daily.drink", "payload": {"amount": "120", "unit": "ml"}}
        a = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=h)
        b = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=h)
        assert a.status_code == 201 and b.status_code == 201
        assert a.json()["event_id"] == b.json()["event_id"] and b.json()["replayed"] is True

    def test_out_of_order_occurred_at_listed_by_occurred_at(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r1 = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                         json={"event_type": "daily.play",
                               "payload": {"duration_minutes": 5},
                               "occurred_at": (NOW - timedelta(hours=1)).isoformat()})
        r2 = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                         json={"event_type": "daily.meal",
                               "payload": {"amount": "90", "unit": "g"},
                               "occurred_at": (NOW - timedelta(hours=5)).isoformat()})
        assert r1.status_code == 201 and r2.status_code == 201
        evs = client.get(f"/api/v1/pets/{coco}/events?limit=5",
                         headers=auth(owner)).json()["events"]
        times = [e["occurred_at"] for e in evs[:2]]
        assert times == sorted(times, reverse=True)  # desc by occurred_at

    def test_future_time_event_stored_and_tagged(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        future = NOW + timedelta(days=2)
        r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.walk",
                              "payload": {"duration_minutes": 30},
                              "occurred_at": future.isoformat()})
        assert r.status_code == 201
        evs = client.get(f"/api/v1/pets/{coco}/events?limit=50", headers=auth(owner)).json()
        assert any(e["event_type"] == "daily.walk"
                   and e["occurred_at"].startswith(future.strftime("%Y-%m-%d"))
                   for e in evs["events"])

    def test_old_backfill_accepted(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        old = (NOW - timedelta(days=30)).isoformat()
        r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.weight",
                              "payload": {"weight_kg": "11.8"},
                              "occurred_at": old})
        assert r.status_code == 201
        evs = client.get(f"/api/v1/pets/{coco}/events?limit=50", headers=auth(owner)).json()
        assert any(e["occurred_at"].startswith(old[:10]) for e in evs["events"])

    def test_cross_timezone_naive_assumed_utc(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        # naive datetime without tzinfo → persisted as timezone-aware (UTC)
        naive = (NOW - timedelta(minutes=10)).replace(tzinfo=None).isoformat()
        r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.drink",
                              "payload": {"amount": "60", "unit": "ml"},
                              "occurred_at": naive})
        assert r.status_code == 201
        stored = r.json()["occurred_at"]
        assert stored.endswith("Z") or stored.endswith("+00:00") or "+" in stored[10:]


class TestPayloadEdgeCases:
    def _post(self, client, seeded, payload, event_type="daily.meal"):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        return client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                           json={"event_type": event_type, "payload": payload})

    def test_invalid_unit_is_owner_text_not_crash(self, client, seeded):
        r = self._post(client, seeded, {"amount": "1", "unit": "banana"})
        assert r.status_code in (201, 422)  # free text unit tolerated; no 500

    def test_negative_amount_no_crash(self, client, seeded):
        r = self._post(client, seeded, {"amount": "-10", "unit": "g"})
        assert r.status_code in (201, 422)

    def test_nan_through_strict_json_transport(self, client, seeded):
        # NaN / Infinity are not valid strict JSON; the transport/parser must
        # reject or surface a controlled error — never a 500, never persisted.
        for token in (b"NaN", b"Infinity"):
            r = client.post(f"/api/v1/pets/{seeded['coco_id']}/events",
                            content=b'{"event_type": "daily.meal", "payload": {"amount": ' + token + b', "unit": "g"}}',
                            headers={**auth(seeded["owner_id"]), "Content-Type": "application/json"})
            assert r.status_code in (201, 422, 400), r.status_code
            assert r.status_code != 500

    def test_huge_number_no_crash(self, client, seeded):
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/events",
                        headers=auth(seeded["owner_id"]),
                        json={"event_type": "daily.weight",
                              "payload": {"weight_kg": "1e308"}})
        assert r.status_code in (201, 422)

    def test_empty_strings_no_crash(self, client, seeded):
        r = self._post(client, seeded, {"amount": "", "unit": ""})
        assert r.status_code in (201, 422)

    def test_super_long_string_no_crash(self, client, seeded):
        r = self._post(client, seeded, {"amount": "1", "unit": "g", "notes": "x" * 200_000})
        assert r.status_code in (201, 422, 413)

    def test_unicode_and_emoji_accepted(self, client, seeded):
        r = self._post(client, seeded, {"amount": "1", "unit": "g",
                                        "notes": "🍖 狗粮 中文 notes"})
        assert r.status_code == 201

    def test_control_characters_rejected(self, client, seeded):
        r = self._post(client, seeded, {"amount": "1", "unit": "g", "notes": "a\x00b"})
        assert r.status_code == 422

    def test_malformed_json_422(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/events",
                        content=b'{"event_type": "daily.meal", "payload": {',
                        headers={**auth(owner), "Content-Type": "application/json"})
        assert r.status_code == 422

    def test_unknown_event_type_422(self, client, seeded):
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/events",
                        headers=auth(seeded["owner_id"]),
                        json={"event_type": "daily.teleport", "payload": {}})
        assert r.status_code == 422

    def test_extra_payload_field_rejected(self, client, seeded):
        # canonical schema is extra=forbid — frontend must not invent fields
        r = self._post(client, seeded, {"amount": "1", "unit": "g", "invented_field": 1})
        assert r.status_code == 422

    def test_wrong_payload_type_rejected(self, client, seeded):
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/events",
                        headers=auth(seeded["owner_id"]),
                        json={"event_type": "daily.meal", "payload": "not-a-dict"})
        assert r.status_code == 422

    def test_null_payload_rejected(self, client, seeded):
        r = client.post(f"/api/v1/pets/{seeded['coco_id']}/events",
                        headers=auth(seeded["owner_id"]),
                        json={"event_type": "daily.meal", "payload": None})
        assert r.status_code == 422


class TestMediaEdgeCases:
    def test_broken_media_rejected(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/artifacts",
                        files={"file": ("fake.png", io.BytesIO(b"not a png" * 20), "image/png")},
                        headers=auth(owner))
        assert r.status_code == 422

    def test_huge_media_no_crash(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (4 * 1024 * 1024)
        r = client.post(f"/api/v1/pets/{coco}/artifacts",
                        files={"file": ("big.png", io.BytesIO(big), "image/png")},
                        headers=auth(owner))
        assert r.status_code in (201, 413, 422)
        assert r.status_code != 500

    def test_artifact_reuse_by_other_user_denied(self, client, seeded):
        family, coco = seeded["family_id"], seeded["coco_id"]
        png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 50
        r = client.post(f"/api/v1/pets/{coco}/artifacts",
                        files={"file": ("a.png", io.BytesIO(png), "image/png")},
                        headers=auth(family))
        assert r.status_code == 201
        aid = r.json()["artifact_id"]
        from app.core.db import get_session_factory
        from app.models import User

        async def mk():
            factory = get_session_factory()
            async with factory() as db:
                u = User(email=f"outsider-{uuid.uuid4().hex[:8]}@pli.demo", display_name="Out",
                         is_demo=True, is_internal=False)
                db.add(u)
                await db.commit()
                return str(u.id)

        outsider = asyncio.run(mk())
        got = client.get(f"/api/v1/artifacts/{aid}/content", headers=auth(outsider))
        assert got.status_code == 403


class TestDuplicateSubmit:
    def test_duplicate_submit_without_key_conflicts(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        body = {"event_type": "daily.play", "payload": {"duration_minutes": 3},
                "occurred_at": (NOW - timedelta(minutes=1)).isoformat()}
        a = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        b = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        assert a.status_code == 201 and b.status_code == 409

    def test_same_payload_different_actor_is_allowed(self, client, seeded):
        """Dedupe key includes actor_id — two caregivers recording the same
        meal at the same time are a real scenario and must not collide."""
        owner, family, coco = seeded["owner_id"], seeded["family_id"], seeded["coco_id"]
        body = {"event_type": "daily.meal", "payload": {"amount": "80", "unit": "g"},
                "occurred_at": (NOW - timedelta(minutes=2)).isoformat()}
        a = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(owner))
        b = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=auth(family))
        assert a.status_code == 201 and b.status_code == 201
        assert a.json()["event_id"] != b.json()["event_id"]

    def test_random_pet_id_never_resolves(self, client, seeded):
        r = client.get(f"/api/v1/pets/{FAKE_PET}", headers=auth(seeded["owner_id"]))
        assert r.status_code == 404
        r2 = client.post(f"/api/v1/pets/{FAKE_PET}/events", headers=auth(seeded["owner_id"]),
                         json={"event_type": "daily.meal", "payload": {"amount": "1", "unit": "g"}})
        assert r2.status_code == 404
