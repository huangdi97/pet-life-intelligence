"""Security event logging + login rate limiting for the auth service."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import LoginAttempt, SecurityEvent
from app.services.auth_tokens import _ip, _ua


async def _log_security(
    db: AsyncSession, user_id: uuid.UUID | None, event_type: str,
    request: Request, detail: dict | None = None,
) -> None:
    db.add(SecurityEvent(
        user_id=user_id, event_type=event_type,
        ip_address=_ip(request), user_agent=_ua(request),
        detail=detail or {},
    ))


async def _log_attempt(db: AsyncSession, email: str, ip: str,
                       success: bool, reason: str) -> None:
    db.add(LoginAttempt(
        email_normalized=email.lower().strip(),
        ip_address=ip, success=success, reason=reason,
    ))


async def _too_many_attempts(db: AsyncSession, email: str, ip: str) -> bool:
    # SECURITY:
    # Lockout counts failed attempts in the configured window per normalized
    # email, and separately per IP at 3x the email threshold. This must stay
    # strictly additive to the per-email count; a shared IP cannot be
    # permanently poisoned by a single email's failures.
    settings = get_settings()
    window_start = datetime.now(UTC) - timedelta(minutes=settings.auth_lockout_minutes)
    stmt = select(func.count()).select_from(LoginAttempt).where(
        LoginAttempt.attempted_at >= window_start,
        LoginAttempt.success.is_(False),
        LoginAttempt.email_normalized == email.lower().strip(),
    )
    count = (await db.execute(stmt)).scalar_one()
    if count >= settings.auth_max_login_attempts:
        return True
    ip_stmt = select(func.count()).select_from(LoginAttempt).where(
        LoginAttempt.attempted_at >= window_start,
        LoginAttempt.success.is_(False),
        LoginAttempt.ip_address == ip,
    )
    ip_count = (await db.execute(ip_stmt)).scalar_one()
    return ip_count >= settings.auth_max_login_attempts * 3
