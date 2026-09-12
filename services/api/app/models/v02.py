"""v0.2 models: identity extensions, baselines, diary, summaries, care
deepening, health records/plans/reminders, preferences, training, social,
nutrition, finance, milestones, content versions, analytics, incidents.

Feature IDs annotated per model (GOAL_全量连续执行 Stage B)."""

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


class TrainingGoal(UUIDPk, CreatedAt, Base):
    """Reward-based training goals (PLI-085/086/088)."""

    __tablename__ = "training_goals"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_behavior: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
    mastery_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0..5
    steps: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class TrainingSession(UUIDPk, CreatedAt, Base):
    """Training session records (PLI-087)."""

    __tablename__ = "training_sessions"
    __table_args__ = (Index("ix_training_sessions_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("training_goals.id"), nullable=True
    )
    session_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    focus: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    pet_response: Mapped[str] = mapped_column(String(40), default="UNKNOWN", nullable=False)
    rewards_used: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class SocialProfile(UUIDPk, CreatedAt, Base):
    """Pet social preference profile (PLI-111)."""

    __tablename__ = "social_profiles"
    __table_args__ = (UniqueConstraint("pet_id",),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    good_with_dogs: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    good_with_cats: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    good_with_kids: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    good_with_strangers: Mapped[str] = mapped_column(String(20), default="UNKNOWN", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class PetFriend(UUIDPk, CreatedAt, Base):
    """Experiential pet-friend relation with double consent (PLI-112).
    No compatibility scoring — observations only."""

    __tablename__ = "pet_friends"
    __table_args__ = (UniqueConstraint("pet_id", "friend_pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    friend_pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING|ACTIVE|BLOCKED|DECLINED
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    accepted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class SocialInteraction(UUIDPk, CreatedAt, Base):
    """Interaction events between familiar pets (PLI-113)."""

    __tablename__ = "social_interactions"
    __table_args__ = (Index("ix_social_interactions_pet", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    friend_pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    quality: Mapped[str] = mapped_column(String(40), default="UNKNOWN", nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class SocialReport(UUIDPk, CreatedAt, Base):
    """Block / report governance (PLI-112 privacy, v0.2 Gate)."""

    __tablename__ = "social_reports"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    friend_pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # BLOCK|REPORT
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    reported_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


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
