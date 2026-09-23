"""v1.0 welfare models: behavior intervention plans, welfare profiles,
welfare observations (PLI-081/082/083/099/102/103/104/106)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


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
