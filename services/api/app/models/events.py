"""Event & timeline fabric: LifeEvent (PLI-211..213, PLI-221) and Artifact
(PLI-003/032/051)."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class LifeEvent(UUIDPk, Base):
    """Canonical Pet Life Event — append-only; corrections supersede, never
    silently overwrite (PLI-213)."""

    __tablename__ = "life_events"
    __table_args__ = (
        Index("ix_life_events_pet_time", "pet_id", "occurred_at"),
        Index("ix_life_events_pet_type", "pet_id", "event_type"),
        UniqueConstraint("pet_id", "idempotency_key", name="uq_lifeevent_idem"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(40), nullable=False)
    source_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    provenance_level: Mapped[str] = mapped_column(String(40), nullable=False)
    schema_version: Mapped[str] = mapped_column(String(20), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    artifact_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    supersedes_event_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    retracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    idempotency_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    dedupe_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Artifact(UUIDPk, CreatedAt, Base):
    """Uploaded media/document with validated content + hash (PLI-032/051)."""

    __tablename__ = "artifacts"

    pet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pets.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # IMAGE|VIDEO|AUDIO|DOCUMENT
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(20), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(200), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
