"""v0.2 routes — medical record import + recovery plan + symptom trend
(v02_care_health sub-module).

PLI-057/058 medical record import · PLI-061 recovery plan · PLI-062
symptom trend.

Pure refactor of v02_care_health.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import HealthEvent, HealthRecord, LifeEvent, RecoveryPlan
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-care-health"])


class RecordImportIn(BaseModel):
    kind: str = Field(pattern="^(PRESCRIPTION|LAB|EXAM|VACCINATION)$")
    occurred_at: datetime | None = None
    content: dict = Field(default_factory=dict)
    source_type: str = enums.SourceType.PROFESSIONAL_CONFIRMED.value
    source_note: str = ""
    artifact_id: uuid.UUID | None = None


class RecoveryPlanIn(BaseModel):
    items: list[dict] = Field(min_length=1)


# --- PLI-057/058: medical record import ---------------------------------------------


@router.post("/pets/{pet_id}/health-records", status_code=201)
async def import_health_record(
    pet_id: uuid.UUID, body: RecordImportIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if body.source_type not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed("source_type must be a valid provenance level (PLI-058)")
    # PLI-045: professional records must carry signature provenance.
    sig = body.content.get("signature") if isinstance(body.content, dict) else None
    if body.kind in ("PRESCRIPTION", "EXAM"):
        signed = isinstance(sig, dict) and all(
            sig.get(k) for k in ("signer", "institution", "signed_at")
        )
        signature_status = "SIGNED" if signed else "UNSIGNED"
    else:
        signature_status = "NOT_REQUIRED"
    record = HealthRecord(
        pet_id=pet.id, kind=body.kind, occurred_at=body.occurred_at,
        content=body.content, source_type=body.source_type,
        signature_status=signature_status,
        source_note=body.source_note, artifact_id=body.artifact_id,
        created_by_user_id=user.id,
    )
    db.add(record)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="health.record_imported",
        payload={"record_id": str(record.id), "kind": record.kind,
                 "source_type": record.source_type},
        actor_id=user.id, source_type=enums.SourceType(body.source_type),
        source_ref=f"health_record:{record.id}",
    )
    await write_audit(db, action="health_record.import", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="HealthRecord", resource_id=str(record.id))
    await db.commit()
    return {"record_id": str(record.id), "kind": record.kind,
            "provenance": record.source_type,
            "signature_status": record.signature_status,
            "note": "导入记录带来源分级；PRESCRIPTION/EXAM 缺签名标记为 UNSIGNED；"
                    "不自动生成诊断。"}


@router.get("/pets/{pet_id}/health-records")
async def list_health_records(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(HealthRecord).where(HealthRecord.pet_id == pet.id)
            .order_by(HealthRecord.created_at.desc())
        )
    ).scalars().all()
    return [
        {"record_id": str(r.id), "kind": r.kind, "content": r.content,
         "source_type": r.source_type, "source_note": r.source_note,
         "signature_status": r.signature_status,
         "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None}
        for r in rows
    ]


# --- PLI-061: recovery plan -----------------------------------------------------------


@router.post("/health-events/{health_event_id}/recovery-plan", status_code=201)
async def create_recovery_plan(
    health_event_id: uuid.UUID, body: RecoveryPlanIn, db: DBSession, user: CurrentUser
) -> dict:
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound("Health event not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    plan = RecoveryPlan(
        health_event_id=he.id, pet_id=pet.id,
        items=[{"description": str(i.get("description", "")),
                "due_at": i.get("due_at"), "status": "PENDING"}
               for i in body.items],
        created_by_user_id=user.id,
    )
    db.add(plan)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="recovery_plan.updated",
        payload={"plan_id": str(plan.id), "items": len(plan.items)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"recovery_plan:{plan.id}",
    )
    await db.commit()
    return {"plan_id": str(plan.id), "items": plan.items}


@router.patch("/recovery-plans/{plan_id}/items/{index}")
async def update_recovery_item(
    plan_id: uuid.UUID, index: int, body: dict, db: DBSession, user: CurrentUser
) -> dict:
    plan = (
        await db.execute(select(RecoveryPlan).where(RecoveryPlan.id == plan_id))
    ).scalar_one_or_none()
    if plan is None:
        raise NotFound("Plan not found.")
    pet = await perm.get_pet_or_404(db, plan.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if index >= len(plan.items):
        raise ValidationFailed("item index out of range")
    status = str(body.get("status", ""))
    if status not in {"PENDING", "DONE", "SKIPPED"}:
        raise ValidationFailed("status must be PENDING|DONE|SKIPPED")
    plan.items[index]["status"] = status
    plan.updated_at = datetime.now(timezone.utc)
    flag_modified(plan, "items")
    await db.flush()
    await db.commit()
    return {"plan_id": str(plan.id), "items": plan.items}


# --- PLI-062: symptom trend ------------------------------------------------------------


@router.get("/health-events/{health_event_id}/trend")
async def symptom_trend(
    health_event_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    he = (
        await db.execute(select(HealthEvent).where(HealthEvent.id == health_event_id))
    ).scalar_one_or_none()
    if he is None:
        raise NotFound("Health event not found.")
    pet = await perm.get_pet_or_404(db, he.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= he.created_at,
                LifeEvent.event_type.in_(["health.observation_added", "ai.observation",
                                          "health.intake_step"]),
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    per_day: dict[str, int] = {}
    for e in rows:
        k = e.occurred_at.date().isoformat()
        per_day[k] = per_day.get(k, 0) + 1
    triage = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.event_type == "health.triage_assigned",
                LifeEvent.occurred_at >= he.created_at,
            ).order_by(LifeEvent.occurred_at)
        )
    ).scalars().all()
    return {
        "health_event_id": str(he.id),
        "observations_per_day": per_day,
        "triage_timeline": [
            {"level": e.payload.get("level"), "at": e.occurred_at.isoformat()}
            for e in triage
        ],
        "notice": "确定性统计（规则），非医学判断。",
    }
