"""Session lifecycle for the auth service: create, rotate, revoke, list."""

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import NotFound, Unauthenticated
from app.models import AuthSession, User
from app.services.auth_security import _log_security
from app.services.auth_tokens import _hash_token, _ip, _ua, new_token


async def _create_session(
    db: AsyncSession, user: User, request: Request, device_label: str,
) -> dict:
    settings = get_settings()
    access_raw, access_hash = new_token()
    refresh_raw, refresh_hash = new_token()
    family = secrets.token_urlsafe(16)
    session = AuthSession(
        user_id=user.id,
        access_token_hash=access_hash,
        refresh_token_hash=refresh_hash,
        refresh_token_family=family,
        device_label=device_label or "",
        ip_address=_ip(request),
        user_agent=_ua(request),
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.access_token_ttl_minutes),
    )
    db.add(session)
    await db.flush()
    return {
        "access_token": access_raw,
        "refresh_token": refresh_raw,
        "expires_in": settings.access_token_ttl_minutes * 60,
        "session_id": str(session.id),
    }


async def refresh(db: AsyncSession, refresh_token: str, request: Request) -> dict:
    token_hash = _hash_token(refresh_token)
    row = (await db.execute(
        select(AuthSession).where(AuthSession.refresh_token_hash == token_hash)
    )).scalar_one_or_none()

    if row is None:
        raise Unauthenticated("Invalid refresh token.")

    now = datetime.now(UTC)
    if row.revoked_at is not None:
        # reuse of a rotated/revoked token → mark family compromised
        row.family_compromised = True
        await _revoke_family(db, row.refresh_token_family)
        await _log_security(db, row.user_id, "session.refresh_reuse_detected", request)
        await db.commit()
        raise Unauthenticated("Session revoked.")

    if row.family_compromised:
        await _log_security(db, row.user_id, "session.family_compromised", request)
        await db.commit()
        raise Unauthenticated("Session revoked.")

    settings = get_settings()
    if row.expires_at is not None and now > row.expires_at + timedelta(days=settings.refresh_token_ttl_days):
        row.revoked_at = now
        await _log_security(db, row.user_id, "session.expired", request)
        await db.commit()
        raise Unauthenticated("Session expired.")

    user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise Unauthenticated("Account unavailable.")

    # rotate: revoke old, create new
    row.revoked_at = now
    row.last_used_at = now
    tokens = await _create_session(db, user, request, row.device_label)
    await _log_security(db, user.id, "session.refresh", request,
                        {"session_id": str(row.id)})
    await db.commit()
    return {"user_id": str(user.id), **tokens}


async def _revoke_family(db: AsyncSession, family: str) -> None:
    rows = (await db.execute(
        select(AuthSession).where(AuthSession.refresh_token_family == family)
    )).scalars().all()
    for r in rows:
        r.revoked_at = datetime.now(UTC)


async def logout(db: AsyncSession, user: User, refresh_token: str, request: Request) -> None:
    token_hash = _hash_token(refresh_token)
    row = (await db.execute(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == token_hash,
            AuthSession.user_id == user.id,
        )
    )).scalar_one_or_none()
    if row is not None:
        row.revoked_at = datetime.now(UTC)
        await _log_security(db, user.id, "session.logout", request,
                            {"session_id": str(row.id)})
    await db.commit()


async def list_sessions(db: AsyncSession, user: User) -> list[dict]:
    rows = (await db.execute(
        select(AuthSession).where(AuthSession.user_id == user.id)
        .order_by(AuthSession.created_at.desc())
    )).scalars().all()
    return [
        {
            "session_id": str(s.id), "device_label": s.device_label,
            "ip_address": s.ip_address, "created_at": s.created_at.isoformat(),
            "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
            "expires_at": s.expires_at.isoformat(),
            "revoked": s.revoked_at is not None,
        }
        for s in rows
    ]


async def revoke_session(db: AsyncSession, user: User, session_id: uuid.UUID,
                         request: Request) -> None:
    row = (await db.execute(select(AuthSession).where(
        AuthSession.id == session_id, AuthSession.user_id == user.id,
    ))).scalar_one_or_none()
    if row is None:
        raise NotFound("Session not found.")
    row.revoked_at = datetime.now(UTC)
    await _log_security(db, user.id, "session.revoke", request,
                        {"session_id": str(session_id)})
    await db.commit()
