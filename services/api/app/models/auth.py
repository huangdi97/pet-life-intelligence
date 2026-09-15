"""Production identity & session entities (Stage E, PLI-217 real auth).

Sensitive fields are stored hashed (Argon2id for passwords, SHA-256+salt for
tokens). Refresh tokens are rotating and revocable; every sensitive action
is audited.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
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


class Credential(UUIDPk, CreatedAt, Base):
    """Login credential per user (Argon2id hash). One active row per user."""

    __tablename__ = "credentials"
    __table_args__ = (UniqueConstraint("user_id", name="uq_credentials_user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class AuthSession(UUIDPk, CreatedAt, Base):
    """A login session. Access token short-lived; refresh rotating.

    Tokens are stored as SHA-256 hashes; raw values returned once at issue.
    """

    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_user_id", "user_id"),
        Index("ix_auth_sessions_access_hash", "access_token_hash"),
        Index("ix_auth_sessions_refresh_hash", "refresh_token_hash"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    access_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    refresh_token_family: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    device_label: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    ip_address: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    user_agent: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # reuse detection: a rotated (old) refresh token presented again marks
    # the whole family as compromised
    family_compromised: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )


class VerificationToken(UUIDPk, CreatedAt, Base):
    """Email verification / account verification token (hashed)."""

    __tablename__ = "verification_tokens"
    __table_args__ = (Index("ix_verification_tokens_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(40), nullable=False)  # email_verify
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordResetToken(UUIDPk, CreatedAt, Base):
    """One-time password reset token (hashed)."""

    __tablename__ = "password_reset_tokens"
    __table_args__ = (Index("ix_password_reset_tokens_user_id", "user_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(8), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LoginAttempt(Base):
    """Login attempt log for rate limiting / abuse mitigation."""

    __tablename__ = "login_attempts"
    __table_args__ = (
        Index("ix_login_attempts_email_time", "email_normalized", "attempted_at"),
        Index("ix_login_attempts_ip_time", "ip_address", "attempted_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email_normalized: Mapped[str] = mapped_column(String(320), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reason: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class SecurityEvent(Base):
    """Security-relevant events (login, password change, reset, delete…)."""

    __tablename__ = "security_events"
    __table_args__ = (Index("ix_security_events_user_time", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    user_agent: Mapped[str] = mapped_column(String(300), default="", nullable=False)
    detail: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


def token_expiry(minutes: int) -> datetime:
    from datetime import timedelta

    return datetime.now(UTC) + timedelta(minutes=minutes)
