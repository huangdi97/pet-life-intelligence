"""Identity entities: User, Household, HouseholdMember, Invitation, Pet,
Relationship, Grant (PLI-001/002/008/010/011/035).

Enum-like columns are stored as String and validated at the application
layer (app.domain.enums) — avoids PostgreSQL native enum migration churn.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
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


class User(UUIDPk, CreatedAt, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # PLI-GW0 pilot isolation: demo/internal/test data must never appear in
    # real pilot metrics (exclude_demo=true / exclude_internal=true).
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Household(UUIDPk, CreatedAt, Base):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(String(160), nullable=False)


class HouseholdMember(UUIDPk, CreatedAt, Base):
    __tablename__ = "household_members"
    __table_args__ = (UniqueConstraint("household_id", "user_id"),)

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    invited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class Invitation(UUIDPk, CreatedAt, Base):
    __tablename__ = "invitations"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    invited_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class Pet(UUIDPk, CreatedAt, Base):
    __tablename__ = "pets"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[str] = mapped_column(String(20), nullable=False)  # dog|cat|other
    breed: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    sex: Mapped[str] = mapped_column(String(10), default="UNKNOWN", nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    neutered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    weight_note: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    timezone: Mapped[str] = mapped_column(String(60), default="Asia/Shanghai", nullable=False)
    avatar_artifact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    # PLI-013 pet lifecycle: ACTIVE | LOST | DECEASED | TRANSFERRED (transitions audited)
    lifecycle_status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    # PLI-012 field-level privacy: masked fields for non-manage viewers,
    # e.g. ["weight_note", "birth_date", "breed"] — enforced by serializers.
    field_privacy: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # PLI-GW0 pilot isolation: demo pets excluded from real pilot metrics.
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Relationship(UUIDPk, CreatedAt, Base):
    """Pet↔User ownership/care relationship (PLI-008)."""

    __tablename__ = "relationships"
    __table_args__ = (UniqueConstraint("pet_id", "user_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # OWNER|CO_OWNER|CARER
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Grant(UUIDPk, CreatedAt, Base):
    """Scoped, time-bounded capability grant (PLI-010/011)."""

    __tablename__ = "grants"
    __table_args__ = (Index("ix_grants_user_pet", "user_id", "pet_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    scopes: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    source: Mapped[str] = mapped_column(String(20), default="DIRECT", nullable=False)
    granted_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
