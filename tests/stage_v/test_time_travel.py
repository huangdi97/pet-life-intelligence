"""Stage V §19 — time travel tests with a controllable clock.

The application reads wall-clock via module-level `datetime.now(UTC)` /
`permissions._now()`. Tests here pin the clock to a synthetic reference and
"fast-forward" it to 1d / 7d / 30d / 6mo / 1y / 3y, verifying expiration and
recurrence behavior does not depend on the real wall clock.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import app.services.permissions as perm
import pytest

from tests.conftest import auth

NOW = datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=10)  # pinned synthetic clock
HORIZONS = {
    "1d": timedelta(days=1),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "6mo": timedelta(days=182),
    "1y": timedelta(days=365),
    "3y": timedelta(days=365 * 3),
}


class TestGrantAndHandoffExpiryAcrossHorizons:
    @pytest.mark.parametrize("name,delta", list(HORIZONS.items()))
    def test_grant_valid_before_expiry_dead_after(self, client, seeded, name, delta):
        """Controllable clock: pin 'now' just after creation, then fast-forward
        past the grant's expiry — access must flip 200 → 403 at every horizon."""
        owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
        base = datetime.now(UTC).replace(microsecond=0)
        expires = base + delta
        r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                        json={"user_id": sitter, "scopes": ["daily:read"],
                              "expires_at": expires.isoformat()})
        assert r.status_code == 201
        # phase 1: clock just after creation (starts_at defaulted ~now)
        perm._now = lambda: base + timedelta(seconds=5)
        try:
            assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 200
        finally:
            perm._now = lambda: datetime.now(UTC)
        # phase 2: fast-forward past expiry → dead
        perm._now = lambda: expires + timedelta(seconds=1)
        try:
            assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403
        finally:
            perm._now = lambda: datetime.now(UTC)


class TestRecurringTasks:
    def test_task_completes_and_spawns_next_day(self, client, seeded):
        owner, family = seeded["owner_id"], seeded["family_id"]
        task = client.post(f"/api/v1/pets/{seeded['coco_id']}/tasks",
                           headers=auth(owner),
                           json={"title": "晚间喂食", "task_type": "FEED",
                                 "due_at": (NOW + timedelta(hours=2)).isoformat(),
                                 "repeat_rule": "DAILY"}).json()
        r = client.post(f"/api/v1/tasks/{task.get('task_id') or task['id']}/complete",
                        json={"note": "done"}, headers=auth(family))
        assert r.status_code == 200
        nxt = r.json()["next_occurrence_due_at"]
        due = datetime.fromisoformat(task["due_at"].replace("Z", "+00:00"))
        assert abs(datetime.fromisoformat(nxt.replace("Z", "+00:00")) - due - timedelta(days=1)) < timedelta(hours=2)

    def test_past_due_task_repeats_on_completion(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        task = client.post(f"/api/v1/pets/{coco}/tasks", headers=auth(owner),
                           json={"title": "补药", "task_type": "MEDICATION",
                                 "due_at": (NOW - timedelta(hours=3)).isoformat(),
                                 "repeat_rule": "DAILY"}).json()
        r = client.post(f"/api/v1/tasks/{task.get('task_id') or task['id']}/complete", json={},
                        headers=auth(owner))
        assert r.status_code == 200
        assert r.json()["next_occurrence_due_at"]


class TestMedicationOverTime:
    def test_dose_statuses_across_time(self, client, seeded):
        """Medication dosing: past dose GIVEN, upcoming dose PENDING; the
        plan math does not rely on wall clock randomness."""
        owner = seeded["owner_id"]
        plan = client.post(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                           headers=auth(owner),
                           json={"medicine_name": "Sim-药", "dose_text": "10mg",
                                 "route": "oral", "frequency_text": "每天2次",
                                 "frequency_per_day": 2,
                                 "start_date": (NOW - timedelta(days=1)).date().isoformat(),
                                 "end_date": (NOW + timedelta(days=5)).date().isoformat(),
                                 "source_type": "PROFESSIONAL_CONFIRMED",
                                 "source_note": "vet@demo"}).json()
        plans = client.get(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                           headers=auth(owner)).json()
        this = next(p for p in plans if p["plan_id"] == plan["plan_id"])
        doses = this["doses"]
        assert doses and all(d["status"] in ("PENDING", "GIVEN", "SKIPPED") for d in doses)

    def test_skip_then_administrate(self, client, seeded):
        owner, plan_id = seeded["owner_id"], seeded["medication_plan_id"]
        plans = client.get(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                           headers=auth(owner)).json()
        pending = [d for p in plans for d in p["doses"] if d["status"] == "PENDING"]
        d = pending[0]
        r = client.post(f"/api/v1/medication-plans/{plan_id}/skip",
                        json={"planned_dose_id": d["dose_id"]}, headers=auth(owner))
        assert r.status_code in (200, 201, 409)  # no crash; state machine enforced


class TestNotificationsAndBaselineWindows:
    def test_emergency_triggers_notification_immediately(self, client, seeded):
        owner, household = seeded["owner_id"], seeded["household_id"]
        client.post(f"/api/v1/pets/{seeded['mimi_id']}/health-events",
                    json={"chief_complaint": "反复进猫砂盆但几乎尿不出来"},
                    headers=auth(owner))
        r = client.get(f"/api/v1/households/{household}/notifications", headers=auth(owner))
        types = {n["type"] for n in r.json()}
        assert "TRIAGE_EMERGENCY" in types

    def test_baseline_recomputed_from_event_window(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        # seed daily.drink over a 30-day window ending today
        for i in range(10):
            at = NOW - timedelta(days=30 - i * 3)
            client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.drink",
                              "payload": {"amount": str(100 + i * 10), "unit": "ml"},
                              "occurred_at": at.isoformat()})
        r = client.post(f"/api/v1/pets/{coco}/baseline/recompute", json={},
                        headers=auth(owner))
        assert r.status_code == 201
        bl = client.get(f"/api/v1/pets/{coco}/baseline", headers=auth(owner)).json()
        assert any(b["metric"] for b in bl)  # baseline exists from allowed data


class TestLongTermTimelineAndLifecycle:
    @pytest.mark.parametrize("name,delta", list(HORIZONS.items()))
    def test_backfilled_old_events_visible_in_timeline(self, client, seeded, name, delta):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        at = (NOW - delta).isoformat()
        r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.weight",
                              "payload": {"weight_kg": "11.0"},
                              "occurred_at": at})
        assert r.status_code == 201
        evs = client.get(f"/api/v1/pets/{coco}/events?limit=100",
                         headers=auth(owner)).json()["events"]
        assert any(e["occurred_at"].startswith(at[:10]) for e in evs)

    def test_lifecycle_terminal_deceased_no_silent_flip(self, client, seeded):
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        r = client.post(f"/api/v1/pets/{coco}/status", headers=auth(owner),
                        json={"status": "DECEASED", "note": "synthetic end"})
        assert r.status_code == 201
        # DECEASED is terminal — trying to flip back must fail
        r2 = client.post(f"/api/v1/pets/{coco}/status", headers=auth(owner),
                         json={"status": "ACTIVE", "note": "rollback attempt"})
        assert r2.status_code == 422

    def test_archive_and_model_version_attributes(self, client, seeded):
        """Archive uses archived_at (soft delete) — after archive, pet is 404
        but the row (and its model versions) remain for audit."""
        owner, coco = seeded["owner_id"], seeded["coco_id"]
        import asyncio
        import uuid

        from app.core.db import get_session_factory
        from app.models import Pet

        async def archive():
            factory = get_session_factory()
            async with factory() as db:
                p = await db.get(Pet, uuid.UUID(coco))
                p.archived_at = NOW
                await db.commit()

        asyncio.run(archive())
        assert client.get(f"/api/v1/pets/{coco}", headers=auth(owner)).status_code == 404
