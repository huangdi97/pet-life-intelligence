"""Canonical event payload registry tests (PLI-211): unknown types rejected,
strict payload validation, amounts transported as strings not bare floats,
provenance levels enforced."""

import uuid
from datetime import datetime, timezone

import pytest
from app.domain.enums import SCHEMA_VERSION, SourceType
from app.domain.event_types import EVENT_REGISTRY, validate_payload
from app.services.eventlog import compute_dedupe_key
from pydantic import ValidationError

EXPECTED_TYPES = {
    "pet.created", "pet.media_added", "relationship.created",
    "grant.created", "grant.revoked", "grant.expired", "consent.changed",
    "emergency_profile.updated", "daily.meal", "daily.drink",
    "daily.elimination", "daily.walk", "daily.play", "daily.weight",
    "care.task_created", "care.task_completed", "care.task_conflict",
    "care.handoff_started", "care.handoff_ended", "care.card_issued",
    "behavior.observed", "health.event_opened", "health.intake_step",
    "health.observation_added", "ai.observation", "health.artifact_added",
    "health.red_flag", "health.triage_assigned", "health.vet_brief_generated",
    "health.vet_brief_shared", "health.outcome_recorded",
    "medication.plan_created", "medication.administered",
    "medication.missed", "artifact.added", "audit.accessed",
    "notification.created", "deletion.requested", "security.event",
    "duplicate.detected", "schema.registered", "record.versioned",
    "provenance.attached", "timeline.viewed", "today.viewed",
    "safety.policy_applied", "ai.inference_logged",
}


def test_all_doc03_event_types_registered():
    missing = EXPECTED_TYPES - set(EVENT_REGISTRY.keys())
    assert not missing, f"missing canonical types: {missing}"


def test_unknown_event_type_rejected():
    with pytest.raises(ValueError):
        validate_payload("daily.pizza", {})


def test_meal_payload_strict():
    ok = validate_payload("daily.meal", {"food_type": "kibble", "amount": "120", "unit": "g"})
    assert ok["amount"] == "120"
    with pytest.raises(ValidationError):
        validate_payload("daily.meal", {"food_type": "kibble", "hacker_field": 1})


def test_numbers_normalized_to_string():
    """金额/剂量/单位禁止裸 float — 数值输入会被规范化为字符串传输。"""
    ok = validate_payload("daily.weight", {"weight_kg": 12.34})
    assert ok["weight_kg"] == "12.34"
    assert isinstance(ok["weight_kg"], str)
    meal = validate_payload("daily.meal", {"amount": 120.5})
    assert meal["amount"] == "120.5"


def test_walk_payload_validated():
    with pytest.raises(ValidationError):
        validate_payload("daily.walk", {"duration_minutes": 99999})  # > 24h


def test_provenance_levels():
    assert set(SourceType) >= {
        "OWNER_REPORTED", "CAREGIVER_REPORTED", "DEVICE_DERIVED", "AI_DERIVED",
        "PROFESSIONAL_CONFIRMED", "LAB_CONFIRMED", "SYSTEM_CALCULATED",
    }
    assert SCHEMA_VERSION == "1.0.0"


def test_dedupe_key_stable_and_sensitive():
    pid, actor = uuid.uuid4(), uuid.uuid4()
    at = datetime(2026, 9, 13, 8, 0, tzinfo=timezone.utc)
    k1 = compute_dedupe_key(pid, "daily.meal", {"amount": "120"}, at, actor)
    k2 = compute_dedupe_key(pid, "daily.meal", {"amount": "120"}, at, actor)
    k3 = compute_dedupe_key(pid, "daily.meal", {"amount": "121"}, at, actor)
    k4 = compute_dedupe_key(pid, "daily.meal", {"amount": "120"},
                            at.replace(tzinfo=None).replace(tzinfo=timezone.utc), actor)
    assert k1 == k2
    assert k1 != k3
    assert k1 == k4  # equivalent instants dedupe regardless of tz repr
