"""Pilot dashboard metrics and PilotOrg lifecycle (Stage E Phase O, PLI-GW0).

Dashboard metrics are isolation-aware: demo / internal / synthetic-domain
data is excluded so non-real data never enters real Pilot metrics.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationFailed
from app.models import (
    LifeEvent,
    Pet,
    PilotFeedback,
    PilotInviteCode,
    PilotOrg,
    PilotUserProfile,
    User,
)


async def pilot_dashboard(db: AsyncSession) -> dict:
    """Pilot metrics (Stage E §26) — isolation-aware (PLI-GW0).

    Demo / internal pets and users are excluded from real pilot metrics
    (exclude_demo=true / exclude_internal=true). Synthetic reserved domains
    (@pli.demo seed, @pli.test tests/remote scripts, @pli.pilot demo seed)
    are excluded at query time as a safety net, covering legacy rows and
    future synthetic registrations alike.
    """
    # Imported at call time only: app.services.pilot re-exports this function,
    # so a module-level import here would create an import cycle.
    from app.services.pilot import pilot_enabled

    # PILOT-INTEGRITY:
    # Non-real data (demo/internal pets and users, synthetic-domain emails)
    # must never enter real Pilot metrics. The AND-of-NOT-LIKE guard below is
    # the second defensive boundary on top of the exclude_demo/internal flags.
    synthetic_suffixes = ("%@pli.demo", "%@pli.test", "%@pli.pilot")

    def real_email_cond():
        # AND of NOT-LIKEs: exclude a row if its creator email matches ANY
        # synthetic suffix. (OR of NOT-LIKEs is almost always true — bug.)
        return and_(*[User.email.notlike(s) for s in synthetic_suffixes])

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
    rows = (await db.execute(
        select(PilotOrg).order_by(PilotOrg.created_at)
    )).scalars().all()
    return [_org_to_dict(r) for r in rows]


async def transition_pilot_org(
    db: AsyncSession, org_id: uuid.UUID, status: str,
) -> dict:
    """Controlled lifecycle transition. No hard delete — history is immutable."""
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
