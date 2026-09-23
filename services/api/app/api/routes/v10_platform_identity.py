import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import (
    AutomationRule,
    BehaviorEvent,
    CareTask,
    DeviceEvent,
    LifeEvent,
    MergeRequest,
    ProfessionalLink,
    TransferRequest,
)
from app.services import permissions as perm
from app.services.eventlog import create_notification, write_audit

router = APIRouter(tags=["v10-platform"])
class RuleIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    condition: dict
    action: str = "NOTIFY"
    requires_confirmation: bool = False

@router.post("/pets/{pet_id}/automation-rules", status_code=201)
async def create_rule(pet_id: uuid.UUID, body: RuleIn,
                      db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    high_risk = body.action != "NOTIFY"
    row = AutomationRule(
        pet_id=pet.id, name=body.name, condition=body.condition,
        action=body.action, requires_confirmation=high_risk or body.requires_confirmation,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="automation_rule.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="AutomationRule", resource_id=str(row.id))
    await db.commit()
    return {"rule_id": str(row.id), "requires_confirmation": row.requires_confirmation,
            "note": "非 NOTIFY 动作一律需要人工确认，绝不自动执行（PLI-135）。"}

@router.post("/device-events/{event_id}/attribution")
async def assign_attribution(event_id: uuid.UUID, body: dict,
                             db: DBSession, user: CurrentUser) -> dict:
    """PLI-128: manual multi-pet attribution for a device event."""
    row = (
        await db.execute(select(DeviceEvent).where(DeviceEvent.id == event_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Device event not found.")
    target_pet = await perm.get_pet_or_404(
        db, uuid.UUID(str(body.get("pet_id", "")))
    )
    await perm.require_capability(db, target_pet, user.id, enums.Capability.MANAGE_PET)
    attribution = str(body.get("attribution", "MANUAL"))
    if attribution not in {"DEVICE", "MANUAL", "UNRESOLVED"}:
        raise ValidationFailed("attribution must be DEVICE|MANUAL|UNRESOLVED")
    row.pet_id = target_pet.id
    row.attribution = attribution
    await db.flush()
    await write_audit(db, action="device_event.attribute", actor_user_id=user.id,
                      household_id=target_pet.household_id, pet_id=target_pet.id,
                      resource_type="DeviceEvent", resource_id=str(row.id),
                      detail={"attribution": attribution})
    await db.commit()
    return {"event_id": str(row.id), "pet_id": str(target_pet.id),
            "attribution": attribution}

@router.post("/device-events/{event_id}/review")
async def review_device_event(event_id: uuid.UUID, body: dict,
                              db: DBSession, user: CurrentUser) -> dict:
    """PLI-131: AI event review queue write-back."""
    row = (
        await db.execute(select(DeviceEvent).where(DeviceEvent.id == event_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Device event not found.")
    pet = await perm.get_pet_or_404(db, uuid.UUID(str(row.pet_id)))
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_WRITE)
    status = str(body.get("status", ""))
    if status not in {"CONFIRMED", "REJECTED"}:
        raise ValidationFailed("status must be CONFIRMED|REJECTED")
    row.review_status = status
    row.payload = {**row.payload, "review_note": str(body.get("note", ""))}
    flag_modified(row, "payload")
    await db.flush()
    await write_audit(db, action="device_event.review", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="DeviceEvent", resource_id=str(row.id),
                      detail={"status": status})
    await db.commit()
    return {"event_id": str(row.id), "review_status": status}

@router.get("/pets/{pet_id}/device-events/review-queue")
async def review_queue(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    """PLI-131: AI event review queue (PENDING items)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MEDICAL_READ)
    rows = (
        await db.execute(
            select(DeviceEvent).where(
                DeviceEvent.pet_id == pet.id,
                DeviceEvent.review_status == "PENDING",
            ).order_by(DeviceEvent.occurred_at.desc()).limit(50)
        )
    ).scalars().all()
    return [{"event_id": str(r.id), "event_kind": r.event_kind,
             "occurred_at": r.occurred_at.isoformat(), "payload": r.payload}
            for r in rows]

class TransferIn(BaseModel):
    to_user_email: str
    reason: str = ""

@router.post("/pets/{pet_id}/transfer-requests", status_code=201)
async def request_transfer(pet_id: uuid.UUID, body: TransferIn,
                           db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = TransferRequest(
        pet_id=pet.id, from_user_id=user.id,
        to_user_email=body.to_user_email.lower(), reason=body.reason,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="transfer.request", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="TransferRequest", resource_id=str(row.id),
                      detail={"to": body.to_user_email})
    await db.commit()
    return {"request_id": str(row.id), "status": "PENDING",
            "note": "所有权转移是高风险动作：仅登记，需人工确认后执行（不会自动转移）。"}

class MergeIn(BaseModel):
    pet_id_a: uuid.UUID
    pet_id_b: uuid.UUID
    evidence: dict = Field(default_factory=dict)

@router.post("/pets/merge-requests", status_code=201)
async def request_merge(body: MergeIn, db: DBSession, user: CurrentUser) -> dict:
    if body.pet_id_a == body.pet_id_b:
        raise ValidationFailed("cannot merge a pet with itself")
    await perm.get_pet_or_404(db, body.pet_id_a)
    await perm.get_pet_or_404(db, body.pet_id_b)
    row = MergeRequest(
        pet_id_a=body.pet_id_a,
        pet_id_b=body.pet_id_b,
        evidence=body.evidence,
        requested_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="merge.request", actor_user_id=user.id,
                      resource_type="MergeRequest", resource_id=str(row.id))
    await db.commit()
    return {"request_id": str(row.id), "status": "PENDING",
            "note": "身份合并高风险：仅登记，人工确认后执行。"}

class FieldPrivacyIn(BaseModel):
    hidden_fields: list[str] = Field(default_factory=list)

@router.put("/pets/{pet_id}/field-privacy")
async def put_field_privacy(pet_id: uuid.UUID, body: FieldPrivacyIn,
                            db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    allowed = {"weight_note", "birth_date", "breed"}
    invalid = [f for f in body.hidden_fields if f not in allowed]
    if invalid:
        raise ValidationFailed(f"fields not privacy-maskable: {invalid}")
    pet.field_privacy = body.hidden_fields
    flag_modified(pet, "field_privacy")
    await db.flush()
    await write_audit(db, action="field_privacy.set", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", resource_id=str(pet.id),
                      detail={"hidden": body.hidden_fields})
    await db.commit()
    return {"pet_id": str(pet.id), "hidden_fields": body.hidden_fields,
            "enforcement": "GET /pets/{id} and Care Card mask these fields "
                           "for viewers without manage capability"}

@router.get("/pets/{pet_id}/export")
async def export_pet(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-015: full data export bundle (owner-only, audited)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_owner(db, pet, user.id)
    events = (
        await db.execute(
            select(LifeEvent).where(LifeEvent.pet_id == pet.id)
            .order_by(LifeEvent.occurred_at).limit(5000)
        )
    ).scalars().all()
    tasks = (
        await db.execute(select(CareTask).where(CareTask.pet_id == pet.id))
    ).scalars().all()
    behaviors = (
        await db.execute(select(BehaviorEvent).where(BehaviorEvent.pet_id == pet.id))
    ).scalars().all()
    bundle = {
        "export_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pet": {"id": str(pet.id), "name": pet.name, "species": pet.species,
                "breed": pet.breed, "sex": pet.sex, "birth_date": str(pet.birth_date or "")},
        "life_events": [
            {"event_id": str(e.id), "event_type": e.event_type,
             "occurred_at": e.occurred_at.isoformat(), "payload": e.payload,
             "provenance_level": e.provenance_level, "retracted": e.retracted_at is not None}
            for e in events
        ],
        "tasks": [{"id": str(t.id), "title": t.title, "status": t.status} for t in tasks],
        "behavior_events": [{"id": str(b.id), "behavior": b.behavior} for b in behaviors],
        "notice": "导出包含全部带来源事件；医疗敏感数据请妥善保管。",
    }
    await write_audit(db, action="pet.export", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="Pet", resource_id=str(pet.id))
    await db.commit()
    return bundle

class ProfessionalIn(BaseModel):
    profession: str = Field(pattern="^(VET|TRAINER|GROOMER|NUTRITIONIST)$")
    display_name: str = ""
    user_id: uuid.UUID | None = None
    credential_note: str = ""

@router.post("/pets/{pet_id}/professionals", status_code=201)
async def add_professional(pet_id: uuid.UUID, body: ProfessionalIn,
                           db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = ProfessionalLink(
        pet_id=pet.id, user_id=body.user_id, profession=body.profession,
        display_name=body.display_name, credential_note=body.credential_note,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="professional.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="ProfessionalLink", resource_id=str(row.id))
    await db.commit()
    return {"professional_id": str(row.id)}

@router.get("/pets/{pet_id}/professionals")
async def list_professionals(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(ProfessionalLink).where(ProfessionalLink.pet_id == pet.id))
    ).scalars().all()
    return [{"professional_id": str(r.id), "profession": r.profession,
             "display_name": r.display_name, "verified": r.verified}
            for r in rows]

@router.get("/pets/{pet_id}/overdue-tasks")
async def overdue_tasks(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    """PLI-043: overdue OPEN tasks (escalation source)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    now = datetime.now(timezone.utc)
    rows = (
        await db.execute(
            select(CareTask).where(
                CareTask.pet_id == pet.id,
                CareTask.status == "OPEN",
                CareTask.due_at.is_not(None),
                CareTask.due_at < now,
            )
        )
    ).scalars().all()
    for t in rows:
        await create_notification(
            db, household_id=pet.household_id, pet_id=pet.id,
            notification_type="TASK_OVERDUE",
            title=f"任务逾期：{t.title}",
            body=f"截止 {t.due_at.isoformat()}，仍未完成。",
            data={"task_id": str(t.id)},
            dedupe_key=f"task-overdue:{t.id}:{now.date().isoformat()}",
        )
    await db.commit()
    return [{"task_id": str(t.id), "title": t.title, "due_at": t.due_at.isoformat()} for t in rows]

@router.get("/health-records/signature-policy")
async def signature_policy() -> dict:
    """PLI-045: professional record signature provenance policy."""
    return {"policy": "专业记录需带 signature（签署人/机构/时间），来源标 PROFESSIONAL_CONFIRMED",
            "signature_fields": ["signer", "institution", "signed_at"],
            "enforcement": "导入时若 kind=PRESCRIPTION/EXAM 且缺 signature 字段则记录为 UNSIGNED"}
