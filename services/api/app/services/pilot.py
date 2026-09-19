"""Pilot mode service (Stage E Phase O).

- Invite-only: registration in pilot mode requires a valid admin-created code.
- Feedback: lightweight channel, no auto-attached sensitive content.
- Metrics: active-pet continuity counts for the pilot dashboard.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import ValidationFailed
from app.models import PilotFeedback, PilotInviteCode, PilotUserProfile

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


async def pilot_dashboard(db: AsyncSession) -> dict:
    """Pilot metrics (Stage E §26) — isolation-aware (PLI-GW0).

    Demo / internal pets and users are excluded from real pilot metrics
    (exclude_demo=true / exclude_internal=true). Synthetic reserved domains
    (@pli.demo seed, @pli.test tests/remote scripts, @pli.pilot demo seed)
    are excluded at query time as a safety net, covering legacy rows and
    future synthetic registrations alike.
    """
    from sqlalchemy import func, or_

    from app.models import LifeEvent, Pet, User

    synthetic_suffixes = ("%@pli.demo", "%@pli.test", "%@pli.pilot")

    def real_email_cond():
        return or_(*[User.email.notlike(s) for s in synthetic_suffixes])

    now = datetime.now(UTC)
    d3 = now - timedelta(days=3)
    d7 = now - timedelta(days=7)

    # 1) total real pets (exclude demo/internal + synthetic-domain creators)
    pets_total = (await db.execute(
        select(func.count()).select_from(Pet)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            Pet.is_demo.is_(False),
            Pet.is_internal.is_(False),
            real_email_cond(),
        )
    )).scalar_one()

    # 2) active pets (distinct pet with event in window, real pet only)
    async def active_count(since: datetime) -> int:
        return (await db.execute(
            select(func.count(func.distinct(LifeEvent.pet_id)))
            .join(Pet, Pet.id == LifeEvent.pet_id)
            .join(User, User.id == Pet.created_by_user_id)
            .where(
                LifeEvent.recorded_at >= since,
                Pet.is_demo.is_(False),
                Pet.is_internal.is_(False),
                real_email_cond(),
            )
        )).scalar_one()

    active_3d = await active_count(d3)
    active_7d = await active_count(d7)

    # 3) feedback from real users only
    feedback_count = (await db.execute(
        select(func.count()).select_from(PilotFeedback)
        .join(User, User.id == PilotFeedback.user_id)
        .where(User.is_demo.is_(False), User.is_internal.is_(False), real_email_cond())
    )).scalar_one()

    # 4) invite/registration funnel counts (real users only)
    from app.models import PilotInviteCode, PilotUserProfile

    invited = (await db.execute(
        select(func.count()).select_from(PilotInviteCode)
    )).scalar_one()
    registered = (await db.execute(
        select(func.count()).select_from(PilotUserProfile)
        .join(User, User.id == PilotUserProfile.user_id)
        .where(User.is_demo.is_(False), User.is_internal.is_(False), real_email_cond())
    )).scalar_one()

    # 5) activated owners — proxy per PILOT_ONBOARDING §4: real pets with
    # ≥3 valid events since pet creation (Pet + 24h ≥3 Events)
    activated_owners = (await db.execute(
        text(
            "SELECT count(*) FROM pets p "
            "JOIN users u ON u.id = p.created_by_user_id "
            "WHERE p.is_demo = false AND p.is_internal = false "
            "AND u.email NOT LIKE '%@pli.demo' "
            "AND u.email NOT LIKE '%@pli.test' "
            "AND u.email NOT LIKE '%@pli.pilot' "
            "AND (SELECT count(*) FROM life_events e "
            "     WHERE e.pet_id = p.id AND e.recorded_at >= p.created_at) >= 3"
        )
    )).scalar_one()
    return {
        "pilot_mode": await pilot_enabled(),
        "pets_total": pets_total,
        "active_pets_3d": active_3d,
        "active_pets_7d": active_7d,
        "feedback_count": feedback_count,
        "invited": invited,
        "registered": registered,
        "activated_owners": activated_owners,
        "north_star": "Active Pets with Continuous Evidence Chain",
        "excludes": ["demo", "internal", "synthetic_domain"],
    }


# ---- PilotOrg metadata (PLI-GW0) ----

_ORG_STATUSES = {
    "LEAD", "ONBOARDING", "ACTIVE", "PAUSED", "COMPLETED",
    "WITHDRAWN", "TERMINATED_SAFETY", "TERMINATED_PRIVACY",
    "TERMINATED_OPERATIONAL",
}


async def create_pilot_org(
    db: AsyncSession,
    *,
    name: str,
    org_type: str = "OWNER_COHORT",
    contact: str = "",
    status: str = "LEAD",
    started_at: datetime | None = None,
    expected_end_at: datetime | None = None,
    participant_limit: int | None = None,
    consent_version: str = "",
    notes: str = "",
) -> dict:
    from app.models import PilotOrg

    if not name or not name.strip():
        raise ValidationFailed("机构名称不能为空。")
    if org_type not in {"VET", "TRAINER", "STORE", "CARE_SERVICE",
                        "OWNER_COHORT", "OTHER"}:
        raise ValidationFailed("org_type 必须是 VET/TRAINER/STORE/CARE_SERVICE/OWNER_COHORT/OTHER。")
    if status not in _ORG_STATUSES:
        raise ValidationFailed(f"status 必须是 {sorted(_ORG_STATUSES)} 之一。")
    row = PilotOrg(
        name=name.strip(),
        org_type=org_type,
        contact=contact.strip(),
        status=status,
        started_at=started_at,
        expected_end_at=expected_end_at,
        participant_limit=participant_limit,
        consent_version=consent_version,
        notes=notes,
    )
    db.add(row)
    await db.flush()
    return _org_to_dict(row)


async def list_pilot_orgs(db: AsyncSession) -> list[dict]:
    from app.models import PilotOrg

    rows = (await db.execute(
        select(PilotOrg).order_by(PilotOrg.created_at)
    )).scalars().all()
    return [_org_to_dict(r) for r in rows]


async def transition_pilot_org(
    db: AsyncSession, org_id: uuid.UUID, status: str,
) -> dict:
    """Controlled lifecycle transition. No hard delete — history is immutable."""
    from app.models import PilotOrg

    if status not in _ORG_STATUSES:
        raise ValidationFailed(f"status 必须是 {sorted(_ORG_STATUSES)} 之一。")
    row = (await db.execute(
        select(PilotOrg).where(PilotOrg.id == org_id)
    )).scalar_one_or_none()
    if row is None:
        raise ValidationFailed("机构不存在。")
    row.status = status
    if status in {"ACTIVE", "ONBOARDING"} and row.started_at is None:
        row.started_at = datetime.now(UTC)
    await db.flush()
    return _org_to_dict(row)


def _org_to_dict(row) -> dict:
    return {
        "pilot_org_id": str(row.id),
        "name": row.name,
        "type": row.org_type,
        "contact": row.contact,
        "status": row.status,
        "started_at": row.started_at.isoformat() if row.started_at else None,
        "expected_end_at": row.expected_end_at.isoformat() if row.expected_end_at else None,
        "participant_limit": row.participant_limit,
        "consent_version": row.consent_version,
        "notes": row.notes,
        "created_at": row.created_at.isoformat(),
    }
