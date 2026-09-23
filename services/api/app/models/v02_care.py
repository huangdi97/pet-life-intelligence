"""v0.2 care models: health records, recovery plans, care reminders,
pet preferences."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
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


class HealthRecord(UUIDPk, CreatedAt, Base):
    """Imported vet records / prescriptions / labs with provenance
    (PLI-057/058). Import never auto-generates diagnoses."""

    __tablename__ = "health_records"
    __table_args__ = (Index("ix_health_records_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # PRESCRIPTION|LAB|EXAM|VACCINATION
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # PLI-045 signature provenance: SIGNED | UNSIGNED | NOT_REQUIRED
    signature_status: Mapped[str] = mapped_column(String(20), default="NOT_REQUIRED", nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    artifact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class RecoveryPlan(UUIDPk, CreatedAt, Base):
    """Recovery plan items linked to a health event (PLI-061)."""

    __tablename__ = "recovery_plans"

    health_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("health_events.id"), nullable=False
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    items: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class CareReminder(UUIDPk, CreatedAt, Base):
    """Vaccine / deworming / checkup reminders (PLI-064)."""

    __tablename__ = "care_reminders"
    __table_args__ = (Index("ix_care_reminders_due", "pet_id", "due_date"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # VACCINE|DEWORMING|CHECKUP
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    last_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class PetPreference(UUIDPk, CreatedAt, Base):
    """Preferences / aversions / rewards (PLI-079, PLI-091)."""

    __tablename__ = "pet_preferences"
    __table_args__ = (UniqueConstraint("pet_id", "kind", "subject"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # LIKE|DISLIKE|ALLERGY_CAUTION|REWARD
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
