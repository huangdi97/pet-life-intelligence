"""v0.2 finance / nutrition / content / ops models: diet profiles,
expenses, milestones, content versions, analytics counters, incidents."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow


class DietProfile(UUIDPk, CreatedAt, Base):
    """Diet profile (PLI-163)."""

    __tablename__ = "diet_profiles"
    __table_args__ = (UniqueConstraint("pet_id",),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    current_food: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    allergies: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    feeding_rules: Mapped[str] = mapped_column(Text, default="", nullable=False)
    vet_advised: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    updated_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class Expense(UUIDPk, CreatedAt, Base):
    """Household pet expense ledger (PLI-175). Amounts as strings."""

    __tablename__ = "expenses"
    __table_args__ = (Index("ix_expenses_pet_time", "pet_id", "incurred_at"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[str] = mapped_column(String(40), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="CNY", nullable=False)
    incurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class Milestone(UUIDPk, CreatedAt, Base):
    """Life milestones (PLI-187)."""

    __tablename__ = "milestones"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(40), default="OTHER", nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class ContentVersion(UUIDPk, CreatedAt, Base):
    """Versioned professional content (libraries) (PLI-223)."""

    __tablename__ = "content_versions"
    __table_args__ = (UniqueConstraint("content_key", "version"),)

    content_key: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    body: Mapped[dict] = mapped_column(JSONB, nullable=False)
    effective_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class AnalyticsCounter(UUIDPk, CreatedAt, Base):
    """Privacy-preserving aggregated counters only — no raw payloads
    (PLI-225)."""

    __tablename__ = "analytics_counters"
    __table_args__ = (UniqueConstraint("metric", "day"),)

    metric: Mapped[str] = mapped_column(String(80), nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Incident(UUIDPk, CreatedAt, Base):
    """Ops incident log (PLI-228)."""

    __tablename__ = "incidents"

    severity: Mapped[str] = mapped_column(String(20), nullable=False)  # INFO|WARN|CRITICAL
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
