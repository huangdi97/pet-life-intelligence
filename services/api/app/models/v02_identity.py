"""v0.2 identity-extension models: pet identifiers, baselines, diary,
daily summaries."""

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow


class PetIdentifier(UUIDPk, CreatedAt, Base):
    """Chip / passport / tattoo identifiers (PLI-004)."""

    __tablename__ = "pet_identifiers"
    __table_args__ = (UniqueConstraint("pet_id", "identifier_type", "value"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    identifier_type: Mapped[str] = mapped_column(String(30), nullable=False)  # CHIP|PASSPORT|TATTOO
    value: Mapped[str] = mapped_column(String(120), nullable=False)
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class Baseline(UUIDPk, CreatedAt, Base):
    """Deterministic per-pet daily baseline (PLI-029)."""

    __tablename__ = "baselines"
    __table_args__ = (UniqueConstraint("pet_id", "metric"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    metric: Mapped[str] = mapped_column(String(40), nullable=False)
    value: Mapped[str] = mapped_column(String(40), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False)
    window_days: Mapped[int] = mapped_column(Integer, nullable=False)
    algorithm: Mapped[str] = mapped_column(String(60), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class DiaryEntry(UUIDPk, CreatedAt, Base):
    """Free-text / voice diary (PLI-031)."""

    __tablename__ = "diary_entries"
    __table_args__ = (Index("ix_diary_pet_time", "pet_id", "entry_at"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    entry_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    audio_artifact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class DailySummary(UUIDPk, CreatedAt, Base):
    """AI daily summary with provenance (PLI-033)."""

    __tablename__ = "daily_summaries"
    __table_args__ = (UniqueConstraint("pet_id", "summary_date"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    summary_date: Mapped[date] = mapped_column(Date, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    fact_count: Mapped[int] = mapped_column(Integer, nullable=False)
    ai_inference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), nullable=False)
