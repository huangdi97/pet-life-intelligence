"""v0.2 daily routes — PLI-031 diary · PLI-033 AI daily summary.

Pure refactor of v02_identity_daily.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import DailySummary, DiaryEntry, LifeEvent
from app.services import permissions as perm
from app.services.ai_gateway import get_gateway
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-identity-daily"])

_GATEWAY = get_gateway()


class DiaryIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    entry_at: datetime | None = None
    audio_artifact_id: uuid.UUID | None = None


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
