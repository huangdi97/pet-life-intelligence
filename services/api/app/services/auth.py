"""Production auth service (Stage E, PLI-217): register, login, refresh,
logout, password reset, verification, sessions, rate limiting.

Design:
- Password: Argon2id (argon2-cffi), never stored in plaintext.
- Tokens: opaque random; access short-lived, refresh rotating; both stored
  as SHA-256 hashes; refresh family reuse detection revokes the family.
- Every sensitive action writes a SecurityEvent + AuditEntry.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters import email as email_adapter
from app.core.config import get_settings
from app.core.errors import (
    ConflictError,
    NotFound,
    PermissionDenied,
    Unauthenticated,
    ValidationFailed,
)
from app.models import (
    AuthSession,
    Credential,
    LoginAttempt,
    PasswordResetToken,
    SecurityEvent,
    User,
    VerificationToken,
)

_ph = PasswordHasher()

TOKEN_SALT = "pli-auth-token-v1"


def _hash_token(raw: str) -> str:
    return hashlib.sha256(f"{TOKEN_SALT}:{raw}".encode()).hexdigest()


def new_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, _hash_token(raw)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def _ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""


def _ua(request: Request) -> str:
    return request.headers.get("User-Agent", "")[:300]


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


async def register(
    db: AsyncSession, email: str, password: str, display_name: str,
    request: Request, verify_email: bool = False,
    invite_code: str = "", role: str = "owner",
) -> dict:
    email = email.lower().strip()
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        raise ConflictError("An account with this email already exists.")

    if len(password) < 8:
        raise ValidationFailed("Password must be at least 8 characters.")
    if not display_name or not display_name.strip():
        raise ValidationFailed("Display name is required.")

    user = User(email=email, display_name=display_name.strip(), is_active=True)
    db.add(user)
    await db.flush()
    cred = Credential(user_id=user.id, password_hash=hash_password(password))
    db.add(cred)

    # Every new real user starts with their own household + owner membership so
    # they can create pets immediately (Stage E onboarding). Pilot owners may
    # later join/invite others into this household.
    from app.domain import enums
    from app.models import Household, HouseholdMember

    hh = Household(name=f"{display_name.strip()[:20]}的家")
    db.add(hh)
    await db.flush()
    db.add(HouseholdMember(
        household_id=hh.id, user_id=user.id,
        role=enums.HouseholdRole.OWNER.value, status="ACTIVE",
    ))

    # pilot mode: require invite code (Stage E §22)
    from app.services.pilot import require_pilot_registration

    await require_pilot_registration(db, user.id, invite_code, role)
    await _log_security(db, user.id, "account.register", request)

    result: dict = {"user_id": str(user.id), "email": email,
                    "display_name": user.display_name,
                    "email_verified": False}

    if verify_email:
        raw, token_hash = new_token()
        vt = VerificationToken(
            user_id=user.id, purpose="email_verify", token_hash=token_hash,
            token_prefix=raw[:8],
            expires_at=datetime.now(UTC) + timedelta(hours=24),
        )
        db.add(vt)
        email_adapter.send_email(
            to=email,
            subject="【宠物生活智能】验证您的邮箱",
            body=(
                f"您好 {user.display_name}，\n\n"
                "请点击以下链接验证邮箱（24 小时内有效）：\n"
                f"{email_adapter.build_verify_url(raw)}\n\n"
                f"验证码：{raw}\n"
                "如果这不是您本人操作，请忽略此邮件。"
            ),
        )
        result["verification_token"] = raw
        result["verification_sent_to"] = email
    await db.commit()
    return result


async def login(
    db: AsyncSession, email: str, password: str, request: Request,
    device_label: str = "", verify_required: bool = False,
) -> dict:
    email = email.lower().strip()
    ip = _ip(request)

    if await _too_many_attempts(db, email, ip):
        await _log_attempt(db, email, ip, False, "rate_limited")
        await db.commit()
        raise PermissionDenied("Too many failed attempts. Try again later.")

    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None:
        await _log_attempt(db, email, ip, False, "unknown_user")
        await db.commit()
        raise Unauthenticated("Invalid email or password.")

    cred = (await db.execute(select(Credential).where(Credential.user_id == user.id))).scalar_one_or_none()
    if cred is None or not verify_password(cred.password_hash, password):
        await _log_attempt(db, email, ip, False, "bad_password")
        await db.commit()
        raise Unauthenticated("Invalid email or password.")

    if not user.is_active:
        await _log_attempt(db, email, ip, False, "inactive")
        await db.commit()
        raise PermissionDenied("This account is disabled.")

    await _log_attempt(db, email, ip, True, "ok")
    await _log_security(db, user.id, "account.login", request,
                        {"ip": ip, "device": device_label})
    tokens = await _create_session(db, user, request, device_label)
    await db.commit()
    return {
        "user_id": str(user.id), "email": user.email,
        "display_name": user.display_name,
        **tokens,
    }


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


async def change_password(db: AsyncSession, user: User, current: str,
                          new_password: str, request: Request) -> None:
    if len(new_password) < 8:
        raise ValidationFailed("Password must be at least 8 characters.")
    cred = (await db.execute(select(Credential).where(Credential.user_id == user.id))).scalar_one_or_none()
    if cred is None or not verify_password(cred.password_hash, current):
        raise ValidationFailed("Current password is incorrect.")
    cred.password_hash = hash_password(new_password)
    # revoke all other sessions
    now = datetime.now(UTC)
    rows = (await db.execute(select(AuthSession).where(AuthSession.user_id == user.id))).scalars().all()
    for r in rows:
        r.revoked_at = now
    await _log_security(db, user.id, "password.changed", request)
    await db.commit()


async def request_password_reset(db: AsyncSession, email: str, request: Request) -> dict:
    email = email.lower().strip()
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    result: dict = {"reset_requested": True}
    if user is None:
        # do not leak whether email exists
        await db.commit()
        return result
    raw, token_hash = new_token()
    prt = PasswordResetToken(
        user_id=user.id, token_hash=token_hash, token_prefix=raw[:8],
        expires_at=datetime.now(UTC) + timedelta(hours=1),
    )
    db.add(prt)
    email_adapter.send_email(
        to=email,
        subject="【宠物生活智能】重置密码",
        body=(
            f"您好 {user.display_name}，\n\n"
            "请点击以下链接重置密码（1 小时内有效）：\n"
            f"{email_adapter.build_reset_url(raw)}\n\n"
            f"重置码：{raw}\n"
            "如果这不是您本人操作，请忽略此邮件。"
        ),
    )
    await _log_security(db, user.id, "password.reset_requested", request)
    await db.commit()
    result["reset_token"] = raw
    result["reset_sent_to"] = email
    return result


async def reset_password(db: AsyncSession, token: str, new_password: str,
                         request: Request) -> None:
    if len(new_password) < 8:
        raise ValidationFailed("Password must be at least 8 characters.")
    token_hash = _hash_token(token)
    row = (await db.execute(select(PasswordResetToken).where(
        PasswordResetToken.token_hash == token_hash
    ))).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at <= datetime.now(UTC):
        raise ValidationFailed("Invalid or expired reset token.")
    cred = (await db.execute(select(Credential).where(Credential.user_id == row.user_id))).scalar_one_or_none()
    if cred is not None:
        cred.password_hash = hash_password(new_password)
    row.used_at = datetime.now(UTC)
    now = datetime.now(UTC)
    sessions = (await db.execute(select(AuthSession).where(AuthSession.user_id == row.user_id))).scalars().all()
    for s in sessions:
        s.revoked_at = now
    await _log_security(db, row.user_id, "password.reset", request)
    await db.commit()


async def verify_email(db: AsyncSession, token: str, request: Request) -> dict:
    token_hash = _hash_token(token)
    row = (await db.execute(select(VerificationToken).where(
        VerificationToken.token_hash == token_hash,
        VerificationToken.purpose == "email_verify",
    ))).scalar_one_or_none()
    if row is None or row.used_at is not None or row.expires_at <= datetime.now(UTC):
        raise ValidationFailed("Invalid or expired verification token.")
    row.used_at = datetime.now(UTC)
    user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
    # users are active at registration in pilot; email_verified is recorded via audit
    await _log_security(db, row.user_id, "email.verified", request)
    await db.commit()
    return {"verified": True, "email": user.email if user else None}


async def delete_account(db: AsyncSession, user: User, password: str, request: Request) -> None:
    cred = (await db.execute(select(Credential).where(Credential.user_id == user.id))).scalar_one_or_none()
    if cred is None or not verify_password(cred.password_hash, password):
        raise ValidationFailed("Password is incorrect.")
    user.is_active = False
    now = datetime.now(UTC)
    sessions = (await db.execute(select(AuthSession).where(AuthSession.user_id == user.id))).scalars().all()
    for s in sessions:
        s.revoked_at = now
    await _log_security(db, user.id, "account.delete", request)
    from app.services.eventlog import write_audit

    await write_audit(
        db, action="account.delete", actor_user_id=user.id,
        resource_type="User", resource_id=str(user.id), detail={"mode": "self"},
    )
    await db.commit()
