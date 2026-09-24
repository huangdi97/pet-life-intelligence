"""Stage V §18 — key invariants, tested as properties / exhaustive loops.

No new heavy dependency: we use plain pytest loops over generated values
(Hypothesis is intentionally not introduced; the ecosystem is pytest-based).
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.domain.enums import PROVENANCE_LEVELS, SCHEMA_VERSION
from app.domain.event_types import EVENT_REGISTRY, validate_payload
from pli_rules import get_engine
from pydantic import ValidationError

from tests.conftest import auth

_PAYLOAD_REJECTED = (ValueError, ValidationError)


def test_every_event_belongs_to_a_valid_pet(client, seeded):
    owner = seeded["owner_id"]
    pets = client.get("/api/v1/pets", headers=auth(owner)).json()
    pet_ids = {p["id"] for p in pets}
    assert pet_ids  # at least 豆豆 + 咪咪
    evs = client.get(f"/api/v1/pets/{seeded['coco_id']}/events?limit=100",
                     headers=auth(owner)).json()["events"]
    for e in evs:
        assert e["pet_id"] in pet_ids


def test_every_event_has_valid_occurred_at(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    evs = client.get(f"/api/v1/pets/{coco}/events?limit=100", headers=auth(owner)).json()["events"]
    for e in evs:
        dt = datetime.fromisoformat(e["occurred_at"].replace("Z", "+00:00"))
        assert dt.tzinfo is not None  # timezone-aware persisted


def test_all_registry_payloads_strict_against_unknown_keys():
    """Property: the canonical registry enforces strict payloads — every
    event type rejects invented keys, and a large majority accept a
    default/template payload (the rest are domain events with mandatory
    id-bearing fields constructed by the backend, covered by integration)."""
    strict_ok = 0
    template_ok = 0
    for t, spec in EVENT_REGISTRY.items():
        model = spec.payload_model
        fields = model.model_fields
        sample = {}
        for name, f in fields.items():
            if f.default is not None:
                sample[name] = f.default
                continue
            ann = getattr(f, "annotation", None)
            s = str(ann)
            if "uuid" in s:
                sample[name] = "00000000-0000-0000-0000-000000000000"
            elif "list" in s or "dict" in s:
                sample[name] = []
            elif "bool" in s:
                sample[name] = False
            elif "int" in s:
                sample[name] = 1
            elif "float" in s:
                sample[name] = 1.0
            elif "datetime" in s:
                sample[name] = "2026-01-01T00:00:00Z"
            elif "date" in s:
                sample[name] = "2026-01-01"
            else:
                sample[name] = "x"
        # invented keys must always be rejected (extra=forbid at the envelope)
        with pytest.raises(_PAYLOAD_REJECTED):
            validate_payload(t, {**sample, "__invented": 1})
        strict_ok += 1
        # default/template payload validates for the majority of types
        try:
            validate_payload(t, sample)
            template_ok += 1
        except Exception:
            pass  # id-bearing domain events validated via the API instead
    assert strict_ok == len(EVENT_REGISTRY)
    assert template_ok >= 10, template_ok  # strictness is the invariant (see docstring)


def test_inference_never_overwrites_fact(client, seeded):
    """Observations accumulate; AI observations never replace owner statements."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "拉肚子"}, headers=auth(owner)).json()["health_event_id"]
    client.post(f"/api/v1/health-events/{he}/observations",
                json={"texts": ["今天吐了三次"]}, headers=auth(owner))
    client.post(f"/api/v1/health-events/{he}/observations",
                json={"texts": ["精神很好"], "use_ai": True}, headers=auth(owner))
    detail = client.get(f"/api/v1/health-events/{he}", headers=auth(owner)).json()
    kinds = {o["kind"] for o in detail["observations"]}
    assert "OWNER_STATEMENT" in kinds
    texts = [o["text"] for o in detail["observations"]]
    assert any("吐了三次" in t for t in texts)  # original fact retained


def test_outcome_linked_to_target_event(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    # fresh health event (the seeded one already has an outcome)
    he = client.post(f"/api/v1/pets/{coco}/health-events",
                     json={"chief_complaint": "咳嗽两天"}, headers=auth(owner)).json()["health_event_id"]
    r = client.post(f"/api/v1/health-events/{he}/outcomes",
                    json={"outcome": "RECOVERED", "notes": "痊愈"}, headers=auth(owner))
    assert r.status_code == 201
    assert r.json()["health_event_status"] == "CLOSED"
    # the outcome must close THIS health event (no orphan outcomes)
    detail = client.get(f"/api/v1/health-events/{he}", headers=auth(owner)).json()
    assert detail["status"] == "CLOSED"


def test_revoked_grant_denies_access(client, seeded):
    owner, sitter, coco = seeded["owner_id"], seeded["sitter_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/grants", headers=auth(owner),
                    json={"user_id": sitter, "scopes": ["daily:read"],
                          "expires_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat()})
    gid = r.json()["grant_id"]
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 200
    client.delete(f"/api/v1/grants/{gid}", headers=auth(owner))
    assert client.get(f"/api/v1/pets/{coco}", headers=auth(sitter)).status_code == 403


def test_cross_household_never_accessible(client, seeded):
    from app.core.db import get_session_factory
    from app.models import Household, HouseholdMember, Pet, Relationship, User

    async def mk():
        factory = get_session_factory()
        async with factory() as db:
            u = User(email=f"prop-{uuid.uuid4().hex[:6]}@pli.demo", display_name="P",
                     is_demo=True, is_internal=True)
            h = Household(name="Prop HH")
            db.add_all([u, h])
            await db.flush()
            db.add(HouseholdMember(household_id=h.id, user_id=u.id, role="OWNER", status="ACTIVE"))
            p = Pet(household_id=h.id, name="PropPet", species="cat",
                    is_demo=True, is_internal=True, created_by_user_id=u.id)
            db.add(p)
            await db.flush()
            db.add(Relationship(pet_id=p.id, user_id=u.id, role="OWNER", created_by_user_id=u.id))
            await db.commit()
            return str(p.id)

    other = asyncio.run(mk())
    r = client.get(f"/api/v1/pets/{other}", headers=auth(seeded["owner_id"]))
    assert r.status_code == 403


def test_same_idempotency_key_no_duplicate_row(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    h = {**auth(owner), "Idempotency-Key": "prop-idem"}
    body = {"event_type": "daily.meal", "payload": {"amount": "88", "unit": "g"}}
    a = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=h).json()
    b = client.post(f"/api/v1/pets/{coco}/events", json=body, headers=h).json()
    assert a["event_id"] == b["event_id"]
    evs = client.get(f"/api/v1/pets/{coco}/events?limit=100", headers=auth(owner)).json()["events"]
    assert sum(1 for e in evs if e["event_id"] == a["event_id"]) == 1


def test_medication_no_double_confirmation(client, seeded):
    owner, plan = seeded["owner_id"], seeded["medication_plan_id"]
    plans = client.get(f"/api/v1/pets/{seeded['coco_id']}/medication-plans",
                       headers=auth(owner)).json()
    pending = [d for p in plans for d in p["doses"] if d["status"] == "PENDING"]
    dose_id = pending[0]["dose_id"]
    assert client.post(f"/api/v1/medication-plans/{plan}/administrations",
                       json={"planned_dose_id": dose_id},
                       headers=auth(owner)).status_code == 201
    assert client.post(f"/api/v1/medication-plans/{plan}/administrations",
                       json={"planned_dose_id": dose_id},
                       headers=auth(owner)).status_code == 409


def test_red_flag_not_downgradable_by_any_input():
    engine = get_engine()
    cases = [
        ("dog", "呼吸非常困难"),
        ("dog", "被车撞了"),
        ("dog", "吃了巧克力一整盒"),
        ("cat", "反复进猫砂盆但几乎尿不出来"),
    ]
    for species, text in cases:
        r = engine.evaluate(species, text)
        assert r.triage_level in ("EMERGENCY", "URGENT"), (species, text)
        assert r.triage_level != "MONITOR"


def test_pet_switch_uses_new_context(client, seeded):
    """After switching pet context, requests must target the new pet_id —
    verified by writing to the new pet and reading isolation."""
    owner, coco, mimi = seeded["owner_id"], seeded["coco_id"], seeded["mimi_id"]
    r = client.post(f"/api/v1/pets/{mimi}/events", headers=auth(owner),
                    json={"event_type": "daily.drink", "payload": {"amount": "90", "unit": "ml"}})
    assert r.status_code == 201
    coco_events = client.get(f"/api/v1/pets/{coco}/events?limit=200",
                             headers=auth(owner)).json()["events"]
    assert not any(e["pet_id"] == mimi for e in coco_events)


def test_timeline_matches_event_source(client, seeded):
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    created = []
    for i in range(3):
        r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                        json={"event_type": "daily.play",
                              "payload": {"duration_minutes": i + 1}})
        created.append(r.json()["event_id"])
    evs = client.get(f"/api/v1/pets/{coco}/events?limit=200", headers=auth(owner)).json()["events"]
    ids = {e["event_id"] for e in evs}
    assert all(c in ids for c in created)


def test_generated_3d_never_becomes_clinical_fact(client, seeded):
    """Pet visual render manifests are media/model artifacts, not medical
    facts — they must never surface in health/clinical endpoints."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    # health endpoints return only health data
    r = client.get(f"/api/v1/pets/{coco}/health-events", headers=auth(owner))
    assert r.status_code == 200
    body = r.text
    assert "render_manifest" not in body and "visual_model" not in body


def test_provenance_levels_are_canonical():
    assert set(PROVENANCE_LEVELS) == {
        "OWNER_REPORTED", "CAREGIVER_REPORTED", "DEVICE_DERIVED", "AI_DERIVED",
        "PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED", "SYSTEM_CALCULATED",
    }


def test_schema_version_constant():
    assert SCHEMA_VERSION == "1.0.0"


def test_event_payload_amounts_never_bare_float(client, seeded):
    """Contract: amounts/units are transported as strings, never bare floats."""
    owner, coco = seeded["owner_id"], seeded["coco_id"]
    r = client.post(f"/api/v1/pets/{coco}/events", headers=auth(owner),
                    json={"event_type": "daily.meal", "payload": {"amount": 80, "unit": "g"}})
    assert r.status_code == 201
    stored = r.json()["payload"]["amount"]
    assert isinstance(stored, str)
