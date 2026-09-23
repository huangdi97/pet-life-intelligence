"""v1.0 automation / identity-governance models: safety automation rules,
ownership transfer, duplicate-pet merge, professional links."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


class AutomationRule(UUIDPk, CreatedAt, Base):
    """Safety automation rules (PLI-134). High-risk actions always require
    confirmation and are never auto-executed (PLI-135)."""

    __tablename__ = "automation_rules"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    condition: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {event_kind, op, threshold}
    action: Mapped[str] = mapped_column(String(40), nullable=False)  # NOTIFY | <high-risk: never auto>
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class TransferRequest(UUIDPk, CreatedAt, Base):
    """Pet ownership transfer request — PENDING until explicit human
    confirmation (PLI-009, AGENTS.md §5)."""

    __tablename__ = "transfer_requests"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    to_user_email: Mapped[str] = mapped_column(String(320), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MergeRequest(UUIDPk, CreatedAt, Base):
    """Duplicate-pet identity merge request — review + manual confirm
    (PLI-006, PLI-222 normalization input)."""

    __tablename__ = "merge_requests"

    pet_id_a: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    pet_id_b: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    evidence: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class ProfessionalLink(UUIDPk, CreatedAt, Base):
    """Vet / trainer / groomer relationship with credentials (PLI-044/149)."""

    __tablename__ = "professional_links"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    profession: Mapped[str] = mapped_column(String(40), nullable=False)  # VET|TRAINER|GROOMER|NUTRITIONIST
    display_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    credential_note: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
