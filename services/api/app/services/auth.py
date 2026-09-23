"""Production auth service (Stage E, PLI-217): register, login, refresh,
logout, password reset, verification, sessions, rate limiting.

Design:
- Password: Argon2id (argon2-cffi), never stored in plaintext.
- Tokens: opaque random; access short-lived, refresh rotating; both stored
  as SHA-256 hashes; refresh family reuse detection revokes the family.
- Every sensitive action writes a SecurityEvent + AuditEntry.
"""

from datetime import UTC, datetime, timedelta

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters import email as email_adapter
from app.core.errors import (
    ConflictError,
    PermissionDenied,
    Unauthenticated,
    ValidationFailed,
)
from app.models import (
    AuthSession,
    Credential,
    PasswordResetToken,
    User,
    VerificationToken,
)
from app.services.auth_security import _log_attempt, _log_security, _too_many_attempts
from app.services.auth_sessions import (
    _create_session as _create_session,
)
from app.services.auth_sessions import (
    list_sessions as list_sessions,
)
from app.services.auth_sessions import (
    logout as logout,
)
from app.services.auth_sessions import (
    refresh as refresh,
)
from app.services.auth_sessions import (
    revoke_session as revoke_session,
)
from app.services.auth_tokens import _hash_token, _ip, hash_password, new_token, verify_password


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
