"""Medication plans & administrations (PLI-059/060, E2E-06).
v0.1 hard boundaries: no dose recommendations, no auto stop-medication
advice, source of medication info is explicit (docs/05, GOAL §12)."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ConflictError, NotFound, ValidationFailed
from app.domain import enums
from app.models import HealthEvent, MedicationDose, MedicationPlan
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["medication"])

MAX_SCHEDULE_DOSES = 60


class MedicationPlanCreate(BaseModel):
    medicine_name: str = Field(min_length=1, max_length=200)
    dose_text: str = Field(min_length=1, max_length=200)
    route: str = ""
    frequency_text: str = ""
    frequency_per_day: int = Field(default=1, ge=1, le=12)
    start_at: datetime | None = None
    duration_days: int = Field(default=7, ge=1, le=30)
    source_type: str = enums.SourceType.OWNER_REPORTED.value
    source_note: str = Field(default="", max_length=300)
    instructions: str = ""
    health_event_id: uuid.UUID | None = None


class AdministrationIn(BaseModel):
    planned_dose_id: uuid.UUID | None = None
    administered_at: datetime | None = None
    note: str = ""


@router.post("/pets/{pet_id}/medication-plans", status_code=201)
async def create_medication_plan(
    pet_id: uuid.UUID, body: MedicationPlanCreate, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if body.source_type not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed(
            f"source_type must be one of {enums.PROVENANCE_LEVELS} (medication info "
            "must state its origin — no dose recommendation is generated)."
        )
    he_id = body.health_event_id
    if he_id is not None:
        he = (
            await db.execute(select(HealthEvent).where(HealthEvent.id == he_id))
        ).scalar_one_or_none()
        if he is None or he.pet_id != pet.id:
            raise NotFound("Linked health event not found for this pet.")

    start = body.start_at or datetime.now(UTC)
    plan = MedicationPlan(
        pet_id=pet.id, health_event_id=he_id,
        medicine_name=body.medicine_name, dose_text=body.dose_text,
        route=body.route, frequency_text=body.frequency_text,
        frequency_per_day=body.frequency_per_day,
        start_date=start,
        end_date=start + timedelta(days=body.duration_days),
        source_type=body.source_type, source_note=body.source_note,
        instructions=body.instructions, created_by_user_id=user.id,
    )
    db.add(plan)
    await db.flush()

    # schedule doses for missed-dose detection
    interval = timedelta(hours=24 / body.frequency_per_day)
    planned = start
    dose_count = 0
    while planned < plan.end_date and dose_count < MAX_SCHEDULE_DOSES:
        db.add(MedicationDose(plan_id=plan.id, planned_at=planned))
        planned += interval
        dose_count += 1
    await db.flush()

    await create_life_event(
        db, pet_id=pet.id, event_type="medication.plan_created",
        payload={"plan_id": str(plan.id), "medicine_name": plan.medicine_name,
                 "dose_text": plan.dose_text, "source_type": plan.source_type},
        actor_id=user.id, source_type=enums.SourceType(body.source_type),
        source_ref=f"medication_plan:{plan.id}",
    )
    await write_audit(db, action="medication_plan.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="MedicationPlan", resource_id=str(plan.id))
    await db.commit()
    return {
        "plan_id": str(plan.id),
        "medicine_name": plan.medicine_name,
        "dose_text": plan.dose_text,
        "doses_scheduled": dose_count,
        "boundary": "v0.1 不提供剂量推荐，也不提供停药建议；来源已记录。",
    }


@router.get("/pets/{pet_id}/medication-plans")
async def list_medication_plans(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(MedicationPlan).where(MedicationPlan.pet_id == pet.id)
            .order_by(MedicationPlan.created_at.desc())
        )
    ).scalars().all()
    out = []
    for p in rows:
        doses = (
            await db.execute(
                select(MedicationDose).where(MedicationDose.plan_id == p.id)
                .order_by(MedicationDose.planned_at).limit(60)
            )
        ).scalars().all()
        out.append(
            {
                "plan_id": str(p.id), "medicine_name": p.medicine_name,
                "dose_text": p.dose_text, "route": p.route,
                "frequency_text": p.frequency_text, "status": p.status,
                "source_type": p.source_type, "source_note": p.source_note,
                "start_date": p.start_date.isoformat(),
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "doses": [
                    {"dose_id": str(d.id), "planned_at": d.planned_at.isoformat(),
                     "status": d.status, "given_at": d.given_at.isoformat() if d.given_at else None,
                     "given_by": str(d.given_by_user_id) if d.given_by_user_id else None}
                    for d in doses
                ],
            }
        )
    return out


@router.post("/medication-plans/{plan_id}/administrations", status_code=201)
async def record_administration(
    plan_id: uuid.UUID, body: AdministrationIn, db: DBSession, user: CurrentUser
) -> dict:
    plan = (
        await db.execute(select(MedicationPlan).where(MedicationPlan.id == plan_id))
    ).scalar_one_or_none()
    if plan is None:
        raise NotFound("Medication plan not found.")
    pet = await perm.get_pet_or_404(db, plan.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)

    administered_at = body.administered_at or datetime.now(UTC)

    dose: MedicationDose | None = None
    if body.planned_dose_id is not None:
        dose = (
            await db.execute(
                select(MedicationDose).where(
                    MedicationDose.id == body.planned_dose_id,
                    MedicationDose.plan_id == plan.id,
                )
            )
        ).scalar_one_or_none()
        if dose is None:
            raise NotFound("Planned dose not found for this plan.")
        if dose.status == enums.DoseStatus.GIVEN.value:
            # E2E-06 duplicate administration protection
            await write_audit(db, action="medication.administration_conflict",
                              actor_user_id=user.id, household_id=pet.household_id,
                              pet_id=pet.id, resource_type="MedicationDose",
                              resource_id=str(dose.id),
                              detail={"already_given_by": str(dose.given_by_user_id)})
            await db.commit()
            raise ConflictError(
                "This dose was already administered. First record kept.",
                code="MEDICATION_CONFLICT",
                details={"dose_id": str(dose.id),
                         "given_at": dose.given_at.isoformat() if dose.given_at else None,
                         "given_by": str(dose.given_by_user_id) if dose.given_by_user_id else None},
            )
        dose.status = enums.DoseStatus.GIVEN.value
        dose.given_at = administered_at
        dose.given_by_user_id = user.id
        dose.note = body.note
    await db.flush()

    await create_life_event(
        db, pet_id=pet.id, event_type="medication.administered",
        payload={"plan_id": str(plan.id),
                 "dose_id": str(dose.id) if dose else None,
                 "administered_at": administered_at.isoformat(),
                 "by_actor": str(user.id), "status": "GIVEN"},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        source_ref=f"medication_plan:{plan.id}",
    )
    await write_audit(db, action="medication.administer", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="MedicationPlan", resource_id=str(plan.id))
    await db.commit()
    return {"plan_id": str(plan.id),
            "dose_id": str(dose.id) if dose else None,
            "status": "GIVEN",
            "administered_at": administered_at.isoformat()}


@router.post("/medication-plans/{plan_id}/skip")
async def skip_dose(plan_id: uuid.UUID, body: AdministrationIn,
                    db: DBSession, user: CurrentUser) -> dict:
    plan = (
        await db.execute(select(MedicationPlan).where(MedicationPlan.id == plan_id))
    ).scalar_one_or_none()
    if plan is None:
        raise NotFound("Medication plan not found.")
    pet = await perm.get_pet_or_404(db, plan.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    if body.planned_dose_id is None:
        raise ValidationFailed("planned_dose_id required.")
    dose = (
        await db.execute(
            select(MedicationDose).where(
                MedicationDose.id == body.planned_dose_id,
                MedicationDose.plan_id == plan.id,
            )
        )
    ).scalar_one_or_none()
    if dose is None:
        raise NotFound("Planned dose not found.")
    if dose.status == enums.DoseStatus.GIVEN.value:
        raise ConflictError("Dose already administered; cannot mark skipped.",
                            code="MEDICATION_CONFLICT")
    dose.status = enums.DoseStatus.SKIPPED.value
    dose.note = body.note
    await db.flush()
    await write_audit(db, action="medication.skip", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="MedicationDose", resource_id=str(dose.id),
                      detail={"note": body.note})
    await db.commit()
    return {"dose_id": str(dose.id), "status": dose.status}
