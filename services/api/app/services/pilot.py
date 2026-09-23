"""Pilot mode service (Stage E Phase O).

- Invite-only: registration in pilot mode requires a valid admin-created code.
- Feedback: lightweight channel, no auto-attached sensitive content.
- Dashboard metrics and PilotOrg lifecycle live in app.services.pilot_dashboard
  and are re-exported here so `from app.services import pilot` keeps working.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ValidationFailed
from app.models import PilotFeedback, PilotInviteCode, PilotUserProfile
from app.services.pilot_dashboard import (
    create_pilot_org,
    list_pilot_orgs,
    pilot_dashboard,
    transition_pilot_org,
)

__all__ = [
    "create_invite_code",
    "create_pilot_org",
    "hash_invite_code",
    "list_pilot_orgs",
    "new_invite_code",
    "pilot_dashboard",
    "pilot_enabled",
    "require_pilot_registration",
    "submit_feedback",
    "transition_pilot_org",
    "validate_invite_code",
]

_INVITE_SALT = "pli-pilot-invite-v1"


def hash_invite_code(code: str) -> str:
    return hashlib.sha256(f"{_INVITE_SALT}:{code}".encode()).hexdigest()


def new_invite_code() -> tuple[str, str]:
    """Returns (raw_code, code_hash). Raw shown once to the admin."""
    raw = secrets.token_urlsafe(9).upper().replace("_", "A").replace("-", "B")
    return raw, hash_invite_code(raw)


async def create_invite_code(
    db: AsyncSession, created_by: uuid.UUID, *,
    purpose: str = "pilot", max_uses: int = 1,
    expires_hours: int = 168, note: str = "",
) -> dict:
    raw, code_hash = new_invite_code()
    row = PilotInviteCode(
        code=raw, code_hash=code_hash, purpose=purpose,
        max_uses=max_uses, created_by_user_id=created_by,
        expires_at=datetime.now(UTC) + timedelta(hours=expires_hours),
        note=note,
    )
    db.add(row)
    await db.flush()
    return {"invite_id": str(row.id), "code": raw, "expires_at": row.expires_at.isoformat()}


async def validate_invite_code(db: AsyncSession, raw_code: str,
                               user_id: uuid.UUID, role: str) -> None:
    """Redeem a pilot invite code: consumes one use, links a profile."""
    code = (raw_code or "").strip()
    row = (await db.execute(
        select(PilotInviteCode).where(PilotInviteCode.code == code)
    )).scalar_one_or_none()
    if row is None:
        raise ValidationFailed("邀请码无效。")
    now = datetime.now(UTC)
    if row.revoked_at is not None:
        raise ValidationFailed("邀请码已失效。")
    if row.expires_at is not None and row.expires_at <= now:
        raise ValidationFailed("邀请码已过期。")
    if row.uses >= row.max_uses:
        raise ValidationFailed("邀请码已被使用。")
    row.uses += 1
    profile = PilotUserProfile(user_id=user_id, role=role, invite_code_id=row.id)
    db.add(profile)
    await db.flush()


async def pilot_enabled() -> bool:
    return get_settings().pilot_mode


async def require_pilot_registration(db: AsyncSession, user_id: uuid.UUID,
                                     invite_code: str, role: str) -> None:
    """Call after user creation in pilot mode. Raises if code invalid."""
    if not await pilot_enabled():
        # non-pilot environments don't require codes (local/test/staging demo)
        return
    if not invite_code:
        raise ValidationFailed("当前为邀请制试点（pilot），注册需要邀请码。")
    await validate_invite_code(db, invite_code, user_id, role)


async def submit_feedback(db: AsyncSession, user_id: uuid.UUID, *,
                          category: str, message: str, page_url: str = "",
                          pet_id: uuid.UUID | None = None, client: str = "web",
                          app_version: str = "", extra: dict | None = None) -> dict:
    allowed = {
        "bug",
        "confusing",
        "slow",
        "missing",
        "unnecessary",
        "safety",
        "privacy",
        "feature_request",
        "health_concern",
        "other",
    }
    if category not in allowed:
        raise ValidationFailed(f"category must be one of {sorted(allowed)}")
    if not message or not message.strip():
        raise ValidationFailed("反馈内容不能为空。")
    if len(message) > 4000:
        raise ValidationFailed("反馈内容过长。")
    fb = PilotFeedback(
        user_id=user_id, category=category, message=message.strip(),
        page_url=page_url[:300], pet_id=pet_id, client=client,
        app_version=app_version or get_settings().app_version,
        extra_data=extra or {},
    )
    db.add(fb)
    await db.flush()
    return {"feedback_id": str(fb.id), "category": category}
