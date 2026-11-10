"""Pilot dashboard metrics and PilotOrg lifecycle (Stage E Phase O, PLI-GW0).

Dashboard metrics are isolation-aware: demo / internal / synthetic-domain
data is excluded so non-real data never enters real Pilot metrics.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ValidationFailed
from app.domain.event_types_daily import DAILY_EVENT_TYPES
from app.models import (
    LifeChangeCase,
    LifeChangeOutcome,
    LifeChangeReview,
    LifeEvent,
    Pet,
    PilotFeedback,
    PilotInviteCode,
    PilotOrg,
    PilotUserProfile,
    User,
)
from app.services.current_events import scope_current_event_stmt
from app.services.life_replay import RECORD_FACT_SOURCES


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

    # 2) active pets — only CURRENT EFFECTIVE record facts count.
    # Page-view telemetry, duplicates, retracted rows and superseded versions
    # are not evidence that a pet produced a new usable life record.
    async def active_count(since: datetime) -> int:
        stmt = (
            select(func.count(func.distinct(LifeEvent.pet_id)))
            .join(Pet, Pet.id == LifeEvent.pet_id)
            .join(User, User.id == Pet.created_by_user_id)
            .where(
                LifeEvent.recorded_at >= since,
                LifeEvent.is_duplicate.is_(False),
                # Pilot activity is evidence creation, not a prefix match.
                # Bind the metric to the same canonical quick-log registry used
                # by event validation so telemetry/system rows can never become
                # activity merely by acquiring a daily.*-looking name.
                LifeEvent.event_type.in_(tuple(DAILY_EVENT_TYPES)),
                LifeEvent.source_type.in_(tuple(RECORD_FACT_SOURCES)),
                Pet.is_demo.is_(False),
                Pet.is_internal.is_(False),
                real_email_cond(),
            )
        )
        stmt = scope_current_event_stmt(stmt, cutoff=now)
        return (await db.execute(stmt)).scalar_one()

    active_3d = await active_count(d3)
    active_7d = await active_count(d7)

    # 3) feedback from real users only
    feedback_count = (await db.execute(
        select(func.count()).select_from(PilotFeedback)
        .join(User, User.id == PilotFeedback.user_id)
        .where(User.is_demo.is_(False), User.is_internal.is_(False), real_email_cond())
    )).scalar_one()

    # 4) invite/registration funnel counts (real users only)
    # PILOT-INTEGRITY:
    # An invite code minted by a demo/internal/synthetic-domain actor is not a
    # real Pilot invitation; counting it would let the synthetic dry-run move a
    # real KPI. Codes whose issuer is unattributable (NULL created_by) stay
    # counted: the issuance was a real administrative act we cannot prove fake.
    invited = (await db.execute(
        select(func.count()).select_from(PilotInviteCode)
        .outerjoin(User, User.id == PilotInviteCode.created_by_user_id)
        .where(or_(
            PilotInviteCode.created_by_user_id.is_(None),
            and_(
                User.is_demo.is_(False),
                User.is_internal.is_(False),
                real_email_cond(),
            ),
        ))
    )).scalar_one()
    registered = (await db.execute(
        select(func.count()).select_from(PilotUserProfile)
        .join(User, User.id == PilotUserProfile.user_id)
        .where(User.is_demo.is_(False), User.is_internal.is_(False), real_email_cond())
    )).scalar_one()

    # 5) activated owners — the written Pilot contract is exact:
    # a DISTINCT owner with >=1 real pet that has >=3 effective record facts
    # within the first 24h after pet creation. A correction is a new journal
    # row but not a new fact identity, so the activation count groups the
    # correction with the source it supersedes.
    #
    # The projection cutoff is LEAST(now, pet_created+24h). Once the 24h
    # deadline passes, later retractions/corrections cannot rewrite whether
    # onboarding was achieved by that deadline; before it passes, invalidated
    # rows stop counting immediately. This mirrors PLI's bitemporal truth.
    activated_owners = (await db.execute(
        text(
            "SELECT count(DISTINCT p.created_by_user_id) FROM pets p "
            "JOIN users u ON u.id = p.created_by_user_id "
            "WHERE p.is_demo = false AND p.is_internal = false "
            "AND u.email NOT LIKE '%@pli.demo' "
            "AND u.email NOT LIKE '%@pli.test' "
            "AND u.email NOT LIKE '%@pli.pilot' "
            "AND ("
            "  SELECT count(DISTINCT COALESCE(e.supersedes_event_id, e.id)) "
            "  FROM life_events e "
            "  WHERE e.pet_id = p.id "
            "    AND e.is_duplicate = false "
            "    AND e.event_type IN ("
            "      'daily.meal','daily.drink','daily.elimination','daily.walk',"
            "      'daily.play','daily.weight','daily.sleep'"
            "    ) "
            "    AND e.source_type IN ("
            "      'OWNER_REPORTED','CAREGIVER_REPORTED','DEVICE_DERIVED',"
            "      'PROFESSIONAL_CONFIRMED','LAB_CONFIRMED'"
            "    ) "
            "    AND e.recorded_at >= p.created_at "
            "    AND e.recorded_at < LEAST("
            "      p.created_at + INTERVAL '24 hours', CURRENT_TIMESTAMP"
            "    ) "
            "    AND e.occurred_at < LEAST("
            "      p.created_at + INTERVAL '24 hours', CURRENT_TIMESTAMP"
            "    ) "
            "    AND (e.retracted_at IS NULL OR e.retracted_at >= LEAST("
            "      p.created_at + INTERVAL '24 hours', CURRENT_TIMESTAMP"
            "    )) "
            "    AND NOT EXISTS ("
            "      SELECT 1 FROM life_events successor "
            "      WHERE successor.pet_id = e.pet_id "
            "        AND successor.supersedes_event_id = e.id "
            "        AND successor.recorded_at < LEAST("
            "          p.created_at + INTERVAL '24 hours', CURRENT_TIMESTAMP"
            "        )"
            "    )"
            ") >= 3"
        )
    )).scalar_one()

    # 6) R8 loop observability. Count only append-only journal facts we really
    # possess; do not invent page-open/attention telemetry that is not recorded.
    cases_created = (await db.execute(
        select(func.count(LifeChangeCase.id))
        .join(Pet, Pet.id == LifeChangeCase.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
        )
    )).scalar_one()
    cases_reviewed = (await db.execute(
        select(func.count(func.distinct(LifeChangeReview.case_id)))
        .join(Pet, Pet.id == LifeChangeReview.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
        )
    )).scalar_one()
    cases_with_follow_up = (await db.execute(
        select(func.count(func.distinct(LifeChangeReview.case_id)))
        .join(Pet, Pet.id == LifeChangeReview.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            LifeChangeReview.decision == "RECORD_OBSERVATION",
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
        )
    )).scalar_one()
    cases_with_outcome = (await db.execute(
        select(func.count(func.distinct(LifeChangeOutcome.case_id)))
        .join(Pet, Pet.id == LifeChangeOutcome.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
        )
    )).scalar_one()
    source_corrections = (await db.execute(
        select(func.count(LifeEvent.id))
        .join(Pet, Pet.id == LifeEvent.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            LifeEvent.supersedes_event_id.is_not(None),
            LifeEvent.is_duplicate.is_(False),
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
        )
    )).scalar_one()
    source_retractions = (await db.execute(
        select(func.count(LifeEvent.id))
        .join(Pet, Pet.id == LifeEvent.pet_id)
        .join(User, User.id == Pet.created_by_user_id)
        .where(
            LifeEvent.retracted_at.is_not(None),
            LifeEvent.is_duplicate.is_(False),
            Pet.is_demo.is_(False), Pet.is_internal.is_(False), real_email_cond(),
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
        "metric_contract_version": "R8_PILOT_V2",
        "activation_window_hours": 24,
        "active_event_contract": "CURRENT_EFFECTIVE_RECORD_FACT",
        "r8_loop_observation_status": (
            "NOT_YET_OBSERVED" if pets_total == 0 else "OBSERVED"
        ),
        "r8_loop": {
            "cases_created": cases_created,
            "cases_reviewed": cases_reviewed,
            "cases_with_follow_up_observation": cases_with_follow_up,
            "cases_with_outcome": cases_with_outcome,
            "source_corrections": source_corrections,
            "source_retractions": source_retractions,
        },
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
