"""v0.2 training models: training goals and training sessions."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


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
