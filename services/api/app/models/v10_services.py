"""v1.0 services / agent / ops models: care-service requests, insurance
records, agent action policy logs, experiment buckets, capability
registry, household expense splits (Stage C, 88 P2)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


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
    # PLI-143 pre-service checklist: [{text, done, done_by, done_at}]
    checklist: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
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


class CapabilityRegistry(UUIDPk, CreatedAt, Base):
    """Integration capability registry (Stage D Phase 7): one row per
    capability×provider; sandbox must never be presented as real."""

    __tablename__ = "capability_registry"
    __table_args__ = (UniqueConstraint("capability", "provider"),)

    capability: Mapped[str] = mapped_column(String(80), nullable=False)
    provider: Mapped[str] = mapped_column(String(60), nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False)  # SANDBOX | REAL
    environment: Mapped[str] = mapped_column(String(20), default="LOCAL", nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    # SANDBOX_READY | REAL_READY | EXTERNAL_BLOCKED | DISABLED | DEPRECATED
    feature_flag: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    contract_version: Mapped[str] = mapped_column(String(20), default="v1", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), default="LOW", nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str] = mapped_column(String(300), default="", nullable=False)


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
