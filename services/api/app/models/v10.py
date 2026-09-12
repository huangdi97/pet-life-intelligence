"""v1.0 models (Stage C, 88 P2). External-dependent capabilities are
implemented as adapter interfaces + sandbox providers + feature flags; no
pretended real integrations (GOAL Stage C 外部集成原则)."""

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


class FeatureFlag(UUIDPk, CreatedAt, Base):
    """Runtime feature flags — off by default (GOAL 工程规范 §6)."""

    __tablename__ = "feature_flags"
    __table_args__ = (UniqueConstraint("key",),)

    key: Mapped[str] = mapped_column(String(80), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[str] = mapped_column(String(300), default="", nullable=False)


class PetDevice(UUIDPk, CreatedAt, Base):
    """Device account connection + pet binding (PLI-125/126). Providers are
    adapter keys resolved to sandbox/real adapters; real vendors are NOT
    connected in v1.0 (EXTERNAL_BLOCKED)."""

    __tablename__ = "pet_devices"
    __table_args__ = (UniqueConstraint("pet_id", "device_key"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    device_key: Mapped[str] = mapped_column(String(120), nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)  # fake|<vendor>
    display_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="LINKED", nullable=False)
    linked_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class DeviceEvent(UUIDPk, CreatedAt, Base):
    """Unified device event (PLI-127) with multi-pet attribution (PLI-128),
    quality check (PLI-129) and AI review queue (PLI-131)."""

    __tablename__ = "device_events"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id"),
        Index("ix_device_events_pet_time", "pet_id", "occurred_at"),
    )

    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pet_devices.id"), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_kind: Mapped[str] = mapped_column(String(40), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    quality_status: Mapped[str] = mapped_column(String(20), default="OK", nullable=False)  # OK|REJECTED|SUSPECT
    quality_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    attribution: Mapped[str] = mapped_column(String(20), default="DEVICE", nullable=False)  # DEVICE|MANUAL|UNRESOLVED
    review_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # AI review queue
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class AutomationRule(UUIDPk, CreatedAt, Base):
    """Safety automation rules (PLI-134). High-risk actions always require
    confirmation and are never auto-executed (PLI-135)."""

    __tablename__ = "automation_rules"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    condition: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {event_kind, op, threshold}
    action: Mapped[str] = mapped_column(String(40), nullable=False)  # NOTIFY | <high-risk: never auto>
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class TransferRequest(UUIDPk, CreatedAt, Base):
    """Pet ownership transfer request — PENDING until explicit human
    confirmation (PLI-009, AGENTS.md §5)."""

    __tablename__ = "transfer_requests"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    to_user_email: Mapped[str] = mapped_column(String(320), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MergeRequest(UUIDPk, CreatedAt, Base):
    """Duplicate-pet identity merge request — review + manual confirm
    (PLI-006, PLI-222 normalization input)."""

    __tablename__ = "merge_requests"

    pet_id_a: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    pet_id_b: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class ProfessionalLink(UUIDPk, CreatedAt, Base):
    """Vet / trainer / groomer relationship with credentials (PLI-044/149)."""

    __tablename__ = "professional_links"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    profession: Mapped[str] = mapped_column(String(40), nullable=False)  # VET|TRAINER|GROOMER|NUTRITIONIST
    display_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    credential_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class BehaviorInterventionPlan(UUIDPk, CreatedAt, Base):
    """Behavior intervention plan + outcomes (PLI-082/083); reward-based
    only, plans are records not medical prescriptions (PLI-081 package)."""

    __tablename__ = "behavior_intervention_plans"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    behavior_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    approach: Mapped[str] = mapped_column(String(40), default="REWARD_BASED", nullable=False)
    steps: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    outcomes: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class WelfareProfile(UUIDPk, CreatedAt, Base):
    """Five-domain welfare profile + QoL questionnaire submissions
    (PLI-099/106). Observable records only — no pseudo-emotion truth."""

    __tablename__ = "welfare_profiles"
    __table_args__ = (UniqueConstraint("pet_id",),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    domains: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    updated_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class WelfareObservation(UUIDPk, CreatedAt, Base):
    """Choice/exit records, environment load, stress recovery (PLI-102/103/104)."""

    __tablename__ = "welfare_observations"
    __table_args__ = (Index("ix_welfare_obs_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(40), nullable=False)  # CHOICE|ENVIRONMENT_LOAD|STRESS_RECOVERY|QOL_QUESTIONNAIRE
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class ServiceRequest(UUIDPk, CreatedAt, Base):
    """Care-services record layer (PLI-139..148): needs profile → request →
    booking → updates → summary. Real marketplace matching & payments are
    EXTERNAL_BLOCKED; no money moves in v1.0."""

    __tablename__ = "service_requests"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    service_kind: Mapped[str] = mapped_column(String(40), nullable=False)  # WALKING|SITTING|GROOMING|TRAINING
    needs_profile: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    care_card_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    provider_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="REQUESTED", nullable=False)
    # REQUESTED → MATCHED(manual) → BOOKED → IN_PROGRESS → COMPLETED|CANCELLED
    updates: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # PLI-148 split review
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class InsurancePolicyRecord(UUIDPk, CreatedAt, Base):
    """Insurance record layer (PLI-179/180/181) — documents & status only,
    no carrier connection (EXTERNAL_BLOCKED)."""

    __tablename__ = "insurance_policy_records"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    policy_no: Mapped[str] = mapped_column(String(80), nullable=False)
    insurer_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    coverage_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    claims: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class AgentActionLog(UUIDPk, CreatedAt, Base):
    """Agent action policy log (PLI-201/202/209): every proposed action is
    logged; booking/purchase/medical classes are refused unless explicitly
    confirmed by a human — never auto-executed."""

    __tablename__ = "agent_action_logs"

    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    action_class: Mapped[str] = mapped_column(String(40), nullable=False)  # INFO|BOOKING|PURCHASE|MEDICAL
    proposal: Mapped[dict] = mapped_column(JSONB, nullable=False)
    policy_result: Mapped[str] = mapped_column(String(30), nullable=False)  # ALLOWED|NEEDS_CONFIRMATION|REFUSED
    executed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class ExperimentAssignment(UUIDPk, CreatedAt, Base):
    """Deterministic experiment buckets (PLI-224)."""

    __tablename__ = "experiment_assignments"
    __table_args__ = (UniqueConstraint("experiment_key", "user_id"),)

    experiment_key: Mapped[str] = mapped_column(String(80), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    bucket: Mapped[str] = mapped_column(String(20), nullable=False)


class HouseholdExpenseSplit(UUIDPk, CreatedAt, Base):
    """Household expense sharing (PLI-176)."""

    __tablename__ = "household_expense_splits"
    __table_args__ = (UniqueConstraint("expense_id", "user_id"),)

    expense_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    share: Mapped[str] = mapped_column(String(40), nullable=False)
