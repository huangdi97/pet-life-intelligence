"""Health & behavior: HealthEvent, intake, observations, triage, vet brief,
medication, outcome, behavior event (PLI-049..063, PLI-069)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow


class HealthEvent(UUIDPk, CreatedAt, Base):
    __tablename__ = "health_events"
    __table_args__ = (Index("ix_health_events_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
    chief_complaint: Mapped[str] = mapped_column(Text, nullable=False)
    onset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_text: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    eating: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    drinking: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    elimination: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    activity: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    current_meds_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    relevant_history_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    opened_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    latest_triage_level: Mapped[str | None] = mapped_column(String(20), nullable=True)


class ClinicalIntakeStep(UUIDPk, CreatedAt, Base):
    """Dynamic intake Q&A step (PLI-050). asked_by: RULE | AI."""

    __tablename__ = "clinical_intake_steps"
    __table_args__ = (Index("ix_intake_steps_event", "health_event_id"),)

    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    question_id: Mapped[str] = mapped_column(String(80), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    asked_by: Mapped[str] = mapped_column(String(10), default="RULE", nullable=False)
    ai_inference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    answered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class Observation(UUIDPk, CreatedAt, Base):
    """Observable finding — strict provenance kinds (docs/05 §AI 不是事实源)."""

    __tablename__ = "observations"
    __table_args__ = (Index("ix_observations_event", "health_event_id"),)

    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_ref: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    ai_inference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class TriageAssessment(UUIDPk, CreatedAt, Base):
    __tablename__ = "triage_assessments"
    __table_args__ = (Index("ix_triage_event", "health_event_id"),)

    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    engine: Mapped[str] = mapped_column(String(30), nullable=False)  # RULE_ENGINE | MANUAL_PROFESSIONAL
    matched_rules: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    rule_engine_version: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class VetBrief(UUIDPk, CreatedAt, Base):
    """Information summary for the vet visit — NOT a diagnosis (docs/05)."""

    __tablename__ = "vet_briefs"

    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    generated_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    ai_inference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    engine_versions: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    retracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MedicationPlan(UUIDPk, CreatedAt, Base):
    __tablename__ = "medication_plans"
    __table_args__ = (Index("ix_med_plans_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    health_event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=True
    )
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dose_text: Mapped[str] = mapped_column(String(200), nullable=False)
    route: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    frequency_text: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    frequency_per_day: Mapped[int] = mapped_column(default=1, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    instructions: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class MedicationDose(UUIDPk, CreatedAt, Base):
    """Scheduled dose for missed-dose detection and duplicate administration
    protection (PLI-060, E2E-06)."""

    __tablename__ = "medication_doses"
    __table_args__ = (
        Index("ix_med_doses_plan", "plan_id"),
        Index("ix_med_doses_due", "planned_at", "status"),
        UniqueConstraint("plan_id", "planned_at"),
    )

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medication_plans.id"), nullable=False
    )
    planned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    given_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    given_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Outcome(UUIDPk, CreatedAt, Base):
    """Closes a prior HealthEvent episode (PLI-063, E2E-06)."""

    __tablename__ = "outcomes"
    __table_args__ = (Index("ix_outcomes_event", "health_event_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class BehaviorEvent(UUIDPk, CreatedAt, Base):
    """ABC behavior record — observable facts only, never auto-diagnosed
    (PLI-069, GOAL Phase 6)."""

    __tablename__ = "behavior_events"
    __table_args__ = (Index("ix_behavior_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    antecedent: Mapped[str] = mapped_column(Text, default="", nullable=False)
    behavior: Mapped[str] = mapped_column(Text, nullable=False)
    consequence: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration_seconds: Mapped[int | None] = mapped_column(nullable=True)
    intensity: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    intensity_source: Mapped[str] = mapped_column(String(40), default="OWNER_REPORTED", nullable=False)
    people_involved: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    animals_involved: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    environment: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class AIInferenceLog(UUIDPk, CreatedAt, Base):
    """AI provenance: model/prompt/schema version per inference (PLI-214)."""

    __tablename__ = "ai_inference_logs"

    capability: Mapped[str] = mapped_column(String(60), nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False)
    latency_ms: Mapped[int] = mapped_column(default=0, nullable=False)
    token_usage: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    safety_flags: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    input_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    output_summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class AuditEntry(UUIDPk, Base):
    """Who read / created / changed / revoked what (PLI-046)."""

    __tablename__ = "audit_entries"
    __table_args__ = (
        Index("ix_audit_pet_time", "pet_id", "occurred_at"),
        Index("ix_audit_household_time", "household_id", "occurred_at"),
    )

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    household_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    request_id: Mapped[str] = mapped_column(String(64), default="", nullable=False)


class Notification(UUIDPk, CreatedAt, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_household", "household_id", "created_at"),
        UniqueConstraint("dedupe_key"),
    )

    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    household_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    recipient_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    type: Mapped[str] = mapped_column(String(60), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dedupe_key: Mapped[str | None] = mapped_column(String(160), nullable=True)
    # PLI-047 optional role targeting: OWNER | CO_OWNER | FAMILY | ALL
    target_role: Mapped[str | None] = mapped_column(String(40), nullable=True)
