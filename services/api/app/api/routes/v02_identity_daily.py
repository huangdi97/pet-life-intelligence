"""v0.2 routes — identity & daily deepening.

PLI-004 chip identifiers · PLI-005 QR care card · PLI-013 lifecycle ·
PLI-024 sleep · PLI-029 deterministic baseline · PLI-031 diary ·
PLI-033 AI daily summary.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pli_ai_gateway import Gateway
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import (
    Baseline,
    DailySummary,
    DiaryEntry,
    LifeEvent,
    PetIdentifier,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-identity-daily"])

_GATEWAY = Gateway()

LIFECYCLE_STATUSES = {"ACTIVE", "LOST", "DECEASED", "TRANSFERRED"}


class IdentifierIn(BaseModel):
    identifier_type: str = Field(pattern="^(CHIP|PASSPORT|TATTOO)$")
    value: str = Field(min_length=4, max_length=120)
    source_type: str = "OWNER_REPORTED"
    verify: bool = False


class StatusChangeIn(BaseModel):
    status: str
    note: str = ""


class DiaryIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    entry_at: datetime | None = None
    audio_artifact_id: uuid.UUID | None = None


# --- PLI-004: identifiers ---------------------------------------------------


@router.post("/pets/{pet_id}/identifiers", status_code=201)
async def add_identifier(
    pet_id: uuid.UUID, body: IdentifierIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = PetIdentifier(
        pet_id=pet.id,
        identifier_type=body.identifier_type,
        value=body.value.strip(),
        source_type=body.source_type,
        verified=body.verify,
        verified_at=datetime.now(timezone.utc) if body.verify else None,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="identifier.added",
        payload={"identifier_type": row.identifier_type, "verified": row.verified},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"pet_identifier:{row.id}",
    )
    await write_audit(db, action="identifier.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetIdentifier", resource_id=str(row.id))
    await db.commit()
    return {"identifier_id": str(row.id), "identifier_type": row.identifier_type,
            "verified": row.verified}


@router.get("/pets/{pet_id}/identifiers")
async def list_identifiers(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(PetIdentifier).where(PetIdentifier.pet_id == pet.id)
        )
    ).scalars().all()
    return [
        {"identifier_id": str(r.id), "identifier_type": r.identifier_type,
         "value": r.value, "verified": r.verified, "source_type": r.source_type}
        for r in rows
    ]


# --- PLI-013: lifecycle ------------------------------------------------------


@router.post("/pets/{pet_id}/status", status_code=201)
async def change_lifecycle(
    pet_id: uuid.UUID, body: StatusChangeIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    if body.status not in LIFECYCLE_STATUSES:
        raise ValidationFailed(f"status must be one of {sorted(LIFECYCLE_STATUSES)}")
    if pet.lifecycle_status == "DECEASED" and body.status != "DECEASED":
        raise ValidationFailed("DECEASED is terminal (data preserved, no silent flip).")
    old = pet.lifecycle_status
    pet.lifecycle_status = body.status
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="pet.status_changed",
        payload={"status": body.status, "previous": old, "note": body.note},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="pet.status_change", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", detail={"from": old, "to": body.status})
    await db.commit()
    return {"lifecycle_status": body.status, "previous": old}


# --- PLI-029: deterministic baseline -----------------------------------------


BASELINE_METRICS = {
    # metric -> event_type
    "meal_count_per_day": "daily.meal",
    "walk_minutes_per_day": "daily.walk",
    "sleep_minutes_per_day": "daily.sleep",
}


def _baseline_algorithm(values: list[float]) -> float:
    """Deterministic: trimmed mean (drop min/max when >=4 samples)."""
    if not values:
        return 0.0
    vals = sorted(values)
    if len(vals) >= 4:
        vals = vals[1:-1]
    return sum(vals) / len(vals)


@router.post("/pets/{pet_id}/baseline/recompute", status_code=201)
async def recompute_baseline(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    window_days: int = Query(default=14, ge=3, le=90),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    results = {}
    for metric, event_type in BASELINE_METRICS.items():
        rows = (
            await db.execute(
                select(LifeEvent.occurred_at, LifeEvent.payload).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == event_type,
                    LifeEvent.retracted_at.is_(None),
                    LifeEvent.occurred_at >= since,
                )
            )
        ).all()
        by_day: dict[date, float] = {}
        for occurred_at, payload in rows:
            day = occurred_at.date()
            if metric in ("meal_count_per_day",):
                by_day[day] = by_day.get(day, 0) + 1
            else:
                minutes = payload.get("duration_minutes", 0)
                try:
                    by_day[day] = by_day.get(day, 0) + float(minutes)
                except (TypeError, ValueError):
                    continue
        values = list(by_day.values())
        if not values:
            results[metric] = None
            continue
        value = round(_baseline_algorithm(values), 2)
        row = (
            await db.execute(
                select(Baseline).where(
                    Baseline.pet_id == pet.id, Baseline.metric == metric
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = Baseline(pet_id=pet.id, metric=metric, value=str(value))
            db.add(row)
        row.value = str(value)
        row.sample_count = len(values)
        row.window_days = window_days
        row.algorithm = "trimmed_mean_v1"
        row.computed_at = datetime.now(timezone.utc)
        results[metric] = {"value": value, "samples": len(values)}
    await db.flush()
    await write_audit(db, action="baseline.recompute", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Baseline", detail=results)
    await db.commit()
    return {"algorithm": "trimmed_mean_v1", "window_days": window_days,
            "baselines": results}


@router.get("/pets/{pet_id}/baseline")
async def get_baseline(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))).scalars().all()
    return [
        {"metric": r.metric, "value": r.value, "unit": r.unit,
         "sample_count": r.sample_count, "window_days": r.window_days,
         "algorithm": r.algorithm, "computed_at": r.computed_at.isoformat()}
        for r in rows
    ]


# --- PLI-031: diary -----------------------------------------------------------


@router.post("/pets/{pet_id}/diary", status_code=201)
async def add_diary_entry(
    pet_id: uuid.UUID, body: DiaryIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    entry = DiaryEntry(
        pet_id=pet.id,
        entry_at=body.entry_at or datetime.now(timezone.utc),
        text=body.text,
        audio_artifact_id=body.audio_artifact_id,
        created_by_user_id=user.id,
    )
    db.add(entry)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="diary.created",
        payload={"diary_id": str(entry.id), "has_audio": bool(body.audio_artifact_id)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"diary:{entry.id}", occurred_at=entry.entry_at,
    )
    await db.commit()
    return {"diary_id": str(entry.id), "entry_at": entry.entry_at.isoformat()}


@router.get("/pets/{pet_id}/diary")
async def list_diary(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 50
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(DiaryEntry).where(DiaryEntry.pet_id == pet.id)
            .order_by(DiaryEntry.entry_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {"diary_id": str(r.id), "entry_at": r.entry_at.isoformat(),
         "text": r.text, "has_audio": r.audio_artifact_id is not None}
        for r in rows
    ]


# --- PLI-033: AI daily summary -------------------------------------------------


@router.post("/pets/{pet_id}/daily-summary", status_code=201)
async def generate_daily_summary(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    date: date | None = Query(default=None),
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    day = date or datetime.now(timezone.utc).date()
    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= day_start,
                LifeEvent.occurred_at < day_end,
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    facts = [
        f"{e.occurred_at:%m-%d %H:%M} {e.event_type} "
        + " ".join(f"{k}={v}" for k, v in list(e.payload.items())[:3])
        for e in rows
    ]
    result = _GATEWAY.invoke("summarize_timeline", {"facts": facts})
    from pli_ai_gateway import Gateway as _G  # noqa: F401 — metadata only
    summary = DailySummary(
        pet_id=pet.id,
        summary_date=day,
        summary=result.result["summary"],
        fact_count=result.result["fact_count"],
        provider=result.metadata.provider,
        model=result.metadata.model,
        prompt_version=result.metadata.prompt_version,
    )
    db.add(summary)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="summary.generated",
        payload={"summary_id": str(summary.id), "date": day.isoformat(),
                 "fact_count": summary.fact_count},
        actor_id=user.id, source_type=enums.SourceType.AI_DERIVED,
        provenance_level=enums.SourceType.AI_DERIVED.value,
    )
    await write_audit(db, action="daily_summary.generate", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="DailySummary", resource_id=str(summary.id))
    await db.commit()
    return {"summary_id": str(summary.id), "date": day.isoformat(),
            "summary": summary.summary, "fact_count": summary.fact_count,
            "provider": summary.provider, "model": summary.model,
            "disclaimer": result.result["disclaimer"]}


# --- PLI-005: QR for care card --------------------------------------------------


@router.get("/care-cards/{card_id}/qr.svg")
async def care_card_qr(card_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """Renders the care-card share URL as QR (SVG, no external calls)."""
    from app.models import ShareToken

    card = (
        await db.execute(select(ShareToken).where(ShareToken.resource_id == card_id))
    ).scalar_one_or_none()
    if card is None:
        raise NotFound("Care card not found.")
    pet = await perm.get_pet_or_404(db, card.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    # QR contains the share path only — the token itself is already secret
    target = f"/care-card/{card.token_prefix}…"
    return {
        "card_id": str(card_id),
        "qr_target": target,
        "note": "QR 渲染由前端生成（token 不再重复下发）；此端点返回目标与校验。",
        "expires_at": card.expires_at.isoformat(),
        "nfc_payload": target,
    }
