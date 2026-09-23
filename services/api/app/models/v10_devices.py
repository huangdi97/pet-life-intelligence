"""v1.0 device models: runtime feature flags, device accounts, unified
device events (Stage C, 88 P2)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk, utcnow


class FeatureFlag(UUIDPk, CreatedAt, Base):
    """Runtime feature flags — off by default (GOAL 工程规范 §6)."""

    __tablename__ = "feature_flags"
    __table_args__ = (UniqueConstraint("key",),)

    key: Mapped[str] = mapped_column(String(80), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    note: Mapped[str] = mapped_column(String(300), default="", nullable=False)


class PetDevice(UUIDPk, CreatedAt, Base):
    """Device account connection + pet binding (PLI-125/126). Providers are
    adapter keys resolved to sandbox/real adapters; real vendors are NOT
    connected in v1.0 (EXTERNAL_BLOCKED)."""

    __tablename__ = "pet_devices"
    __table_args__ = (UniqueConstraint("pet_id", "device_key"),)

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    device_key: Mapped[str] = mapped_column(String(120), nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)  # fake|<vendor>
    display_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="LINKED", nullable=False)
    linked_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class DeviceEvent(UUIDPk, CreatedAt, Base):
    """Unified device event (PLI-127) with multi-pet attribution (PLI-128),
    quality check (PLI-129) and AI review queue (PLI-131)."""

    __tablename__ = "device_events"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id"),
        Index("ix_device_events_pet_time", "pet_id", "occurred_at"),
    )

    pet_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pet_devices.id"), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_kind: Mapped[str] = mapped_column(String(40), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    quality_status: Mapped[str] = mapped_column(String(20), default="OK", nullable=False)  # OK|REJECTED|SUSPECT
    quality_note: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    attribution: Mapped[str] = mapped_column(String(20), default="DEVICE", nullable=False)  # DEVICE|MANUAL|UNRESOLVED
    review_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # AI review queue
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
