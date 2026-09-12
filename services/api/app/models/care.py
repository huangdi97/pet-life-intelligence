"""Care network: Consent, EmergencyProfile, CareTask, CareHandoff, CareCard,
ShareToken, DeletionRequest (PLI-014/016/026/037/038/215/216)."""

import uuid
from datetime import datetime

from sqlalchemy import (
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


class Consent(UUIDPk, Base):
    __tablename__ = "consents"
    __table_args__ = (UniqueConstraint("pet_id", "purpose"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(60), nullable=False)
    granted: Mapped[bool] = mapped_column(default=False, nullable=False)
    updated_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class EmergencyProfile(UUIDPk, Base):
    """Emergency contact card — text fields only, no maps (PLI-014)."""

    __tablename__ = "emergency_profiles"
    __table_args__ = (UniqueConstraint("pet_id",),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    owner_contact: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    backup_contact: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    vet_clinic_name: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    vet_clinic_phone: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    vet_clinic_address_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    critical_care_notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class CareTask(UUIDPk, CreatedAt, Base):
    __tablename__ = "care_tasks"
    __table_args__ = (Index("ix_care_tasks_pet_due", "pet_id", "due_at"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    task_type: Mapped[str] = mapped_column(String(30), default="OTHER", nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    repeat_rule: Mapped[str] = mapped_column(String(10), default="NONE", nullable=False)
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="OPEN", nullable=False)
    completed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    conflict_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class CareHandoff(UUIDPk, CreatedAt, Base):
    __tablename__ = "care_handoffs"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    caregiver_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    scope: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    grant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("grants.id"), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )


class CareCard(UUIDPk, CreatedAt, Base):
    """Minimal-field care card snapshot (PLI-038). Content frozen at issue
    time; access via ShareToken with expiry + revocation + audit."""

    __tablename__ = "care_cards"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    issued_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ShareToken(UUIDPk, CreatedAt, Base):
    """Unified share token for Care Card / Vet Brief. Random, short-lived,
    revocable, scope-limited, audited (docs/08)."""

    __tablename__ = "share_tokens"
    __table_args__ = (Index("ix_share_tokens_resource", "resource_type", "resource_id"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    resource_type: Mapped[str] = mapped_column(String(30), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    token_prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class DeletionRequest(UUIDPk, CreatedAt, Base):
    """Records a user-visible deletion request (PLI-216). Actual data removal
    is a high-risk action and is executed only via explicit manual confirmation
    outside the automatic path (AGENTS.md §5)."""

    __tablename__ = "deletion_requests"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
