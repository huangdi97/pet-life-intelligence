"""R8 reviewable life-change cases and append-only human decisions.

These are *record-based interpretations*, not medical diagnoses or claims that
a pet actually did or did not perform an unobserved action.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow


class LifeChangeCase(UUIDPk, CreatedAt, Base):
    __tablename__ = "life_change_cases"
    __table_args__ = (
        UniqueConstraint("pet_id", "fingerprint", name="uq_life_change_case_fingerprint"),
        Index("ix_life_change_case_pet_created", "pet_id", "created_at"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    metric: Mapped[str] = mapped_column(String(50), nullable=False)
    insight_kind: Mapped[str] = mapped_column(String(30), nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(40), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    knowledge_cutoff: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone_policy: Mapped[str] = mapped_column(String(40), nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_value: Mapped[float] = mapped_column(Float, nullable=False)
    sample_days: Mapped[int] = mapped_column(Integer, nullable=False)
    window_days: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_event_ids: Mapped[list] = mapped_column(JSONB, nullable=False)
    # R8AG: immutable Case creation-time source roles; NULL is a legacy Case.
    evidence_role_by_event_id: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_scope: Mapped[str] = mapped_column(String(40), nullable=False)
    uncertainty: Mapped[str] = mapped_column(Text, nullable=False)
    human_question: Mapped[str] = mapped_column(String(240), nullable=False)
    state: Mapped[str] = mapped_column(String(30), default="PROPOSED", nullable=False)


class LifeChangeReview(UUIDPk, Base):
    """Append-only: edits and corrections are additional reviews, not rewrites."""

    __tablename__ = "life_change_reviews"
    __table_args__ = (
        Index("ix_life_change_review_case_time", "case_id", "reviewed_at"),
        UniqueConstraint(
            "case_id", "actor_id", "idempotency_key",
            name="uq_life_change_review_idempotency",
        ),
    )

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("life_change_cases.id"), nullable=False
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    related_event_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    related_task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("care_tasks.id"), nullable=True
    )
    prior_review_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(96), nullable=True
    )


class LifeChangeOutcome(UUIDPk, Base):
    """Append-only owner assessment anchored to one real follow-up observation."""

    __tablename__ = "life_change_outcomes"
    __table_args__ = (
        Index("ix_life_change_outcome_case_time", "case_id", "recorded_at"),
        UniqueConstraint(
            "case_id", "actor_id", "idempotency_key",
            name="uq_life_change_outcome_idempotency",
        ),
    )

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("life_change_cases.id"), nullable=False
    )
    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    observation_review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("life_change_reviews.id"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    assessment: Mapped[str] = mapped_column(String(40), nullable=False)
    note: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    prior_outcome_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(96), nullable=False)
