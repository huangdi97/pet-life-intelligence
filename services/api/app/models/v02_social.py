"""v0.2 social models: social profiles, pet friends, interactions,
block/report governance."""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


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
