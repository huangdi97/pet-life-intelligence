"""Pilot mode entities (Stage E Phase O).

Pilot is a real-user, limited-scope environment — invite-only, full audit.
Invite codes are created by admins, single-use, expiring. Feedback is a
lightweight channel that never auto-attaches sensitive content.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, CreatedAt, UUIDPk


class PilotInviteCode(UUIDPk, CreatedAt, Base):
    """Admin-created single-use invite code for pilot registration."""

    __tablename__ = "pilot_invite_codes"
    __table_args__ = (Index("ix_pilot_invite_codes_code", "code"),)

    code: Mapped[str] = mapped_column(String(64), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    purpose: Mapped[str] = mapped_column(String(40), default="pilot", nullable=False)
    max_uses: Mapped[int] = mapped_column(default=1, nullable=False)
    uses: Mapped[int] = mapped_column(default=0, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[str] = mapped_column(String(300), default="", nullable=False)


class PilotUserProfile(UUIDPk, CreatedAt, Base):
    """Per-user pilot profile: role + invite metadata."""

    __tablename__ = "pilot_user_profiles"
    __table_args__ = (Index("ix_pilot_user_profiles_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(40), default="owner", nullable=False)
    # owner | vet | trainer | caregiver | store
    invite_code_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pilot_invite_codes.id"), nullable=True
    )
    organization: Mapped[str] = mapped_column(String(120), default="", nullable=False)


class PilotOrg(UUIDPk, CreatedAt, Base):
    """Wave 0 pilot organization metadata (PLI-GW0).

    Lifecycle status (no hard delete — historical facts are immutable):
    LEAD -> ONBOARDING -> ACTIVE -> PAUSED -> COMPLETED
    abnormal: WITHDRAWN / TERMINATED_SAFETY / TERMINATED_PRIVACY /
              TERMINATED_OPERATIONAL
    """

    __tablename__ = "pilot_orgs"
    __table_args__ = (Index("ix_pilot_orgs_name", "name"),)

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    org_type: Mapped[str] = mapped_column(String(30), default="OWNER_COHORT", nullable=False)
    # VET | TRAINER | STORE | CARE_SERVICE | OWNER_COHORT | OTHER
    contact: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="LEAD", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    participant_limit: Mapped[int | None] = mapped_column(nullable=True)
    consent_version: Mapped[str] = mapped_column(String(30), default="", nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)


class PilotFeedback(UUIDPk, CreatedAt, Base):
    """Lightweight in-product feedback (bug/confusing/feature/health/other)."""

    __tablename__ = "pilot_feedback"
    __table_args__ = (Index("ix_pilot_feedback_user_time", "user_id", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    page_url: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    pet_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    client: Mapped[str] = mapped_column(String(20), default="web", nullable=False)
    app_version: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
