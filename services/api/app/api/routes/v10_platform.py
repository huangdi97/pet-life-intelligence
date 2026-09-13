"""v1.0 routes — Stage C consolidated layer.

Covers: device abstraction + sandbox webhook (PLI-125..135), identity
extras (PLI-006/009/012/015), care network (PLI-043/044/045/048), welfare
(PLI-099..108 partial record layer), behavior extras (PLI-076..083),
health extras (PLI-065/066/067), training extras (PLI-089..098),
care services record layer (PLI-139..151), nutrition commerce constraints
(PLI-164..172 partial), finance records (PLI-176..184), timeline extras
(PLI-189/191), agent policy (PLI-201/202/206/207/209/210), platform
(PLI-218/220/222/224/226).

External integrations (real vendors, payments, carriers) are
EXTERNAL_BLOCKED by design: interface + sandbox + flag only.
"""

import hashlib
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.adapters.devices import AdapterError, get_provider, quality_check
from app.api.deps import CurrentUser, DBSession
from app.core.errors import APIError, NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import (
    AgentActionLog,
    AutomationRule,
    BehaviorEvent,
    BehaviorInterventionPlan,
    CapabilityRegistry,
    CareTask,
    DeviceEvent,
    Expense,
    ExperimentAssignment,
    FeatureFlag,
    HouseholdExpenseSplit,
    InsurancePolicyRecord,
    LifeEvent,
    MergeRequest,
    PetDevice,
    PetIdentifier,
    ProfessionalLink,
    ServiceRequest,
    TransferRequest,
    WelfareObservation,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, create_notification, write_audit

router = APIRouter(tags=["v10-platform"])


async def feature_enabled(db, key: str) -> bool:
    row = (
        await db.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    ).scalar_one_or_none()
    return bool(row and row.enabled)


# --- feature flags -------------------------------------------------------------


class FlagIn(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    enabled: bool
    note: str = ""


@router.post("/ops/feature-flags", status_code=201)
async def set_flag(body: FlagIn, db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(select(FeatureFlag).where(FeatureFlag.key == body.key))
    ).scalar_one_or_none()
    if row is None:
        row = FeatureFlag(key=body.key, enabled=body.enabled, note=body.note)
        db.add(row)
    else:
        row.enabled = body.enabled
        row.note = body.note
    await db.flush()
    await write_audit(db, action="flag.set", actor_user_id=user.id,
                      resource_type="FeatureFlag", resource_id=body.key,
                      detail={"enabled": body.enabled})
    await db.commit()
    return {"key": body.key, "enabled": body.enabled}


@router.get("/ops/feature-flags")
async def list_flags(db: DBSession, user: CurrentUser) -> list[dict]:
    rows = (await db.execute(select(FeatureFlag))).scalars().all()
    return [{"key": r.key, "enabled": r.enabled, "note": r.note} for r in rows]


# --- devices (PLI-125..135) ------------------------------------------------------


class DeviceLinkIn(BaseModel):
    provider: str = "fake"
    device_key: str = Field(min_length=1, max_length=120)
    display_name: str = ""


@router.post("/pets/{pet_id}/devices", status_code=201)
async def link_device(pet_id: uuid.UUID, body: DeviceLinkIn,
                      db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    try:
        provider = get_provider(body.provider)  # unknown/real vendors rejected
    except AdapterError as err:
        raise APIError(
            f"provider '{body.provider}' is EXTERNAL_BLOCKED (no sandbox adapter registered)",
            code="EXTERNAL_BLOCKED", status_code=403,
        ) from err
    if provider.external and not await feature_enabled(db, f"device.{body.provider}"):
        raise APIError(
            f"provider '{body.provider}' is EXTERNAL_BLOCKED (flag device.{body.provider} off)",
            code="EXTERNAL_BLOCKED", status_code=403,
        )
    row = PetDevice(
        pet_id=pet.id, device_key=body.device_key, provider=body.provider,
        display_name=body.display_name or body.device_key,
        linked_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="device.link", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetDevice", resource_id=str(row.id))
    await db.commit()
    return {"device_id": str(row.id), "provider": row.provider,
            "status": row.status,
            "note": "sandbox provider; real vendors are EXTERNAL_BLOCKED"}


@router.get("/pets/{pet_id}/devices")
async def list_devices(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(PetDevice).where(PetDevice.pet_id == pet.id))
    ).scalars().all()
    return [
        {"device_id": str(r.id), "provider": r.provider,
         "display_name": r.display_name, "status": r.status}
        for r in rows
    ]


@router.post("/pets/{pet_id}/devices/{device_id}/sync", status_code=201)
async def sync_device(pet_id: uuid.UUID, device_id: uuid.UUID,
                      db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    device = (
        await db.execute(
            select(PetDevice).where(
                PetDevice.id == device_id, PetDevice.pet_id == pet.id
            )
        )
    ).scalar_one_or_none()
    if device is None:
        raise NotFound("Device not found for this pet.")
    provider = get_provider(device.provider)
    ingested, rejected = 0, 0
    for ev in provider.fetch_recent(device.device_key):
        status, note = quality_check(ev)
        exists = (
            await db.execute(
                select(DeviceEvent).where(
                    DeviceEvent.provider == ev.provider,
                    DeviceEvent.provider_event_id == ev.provider_event_id,
                )
            )
        ).scalar_one_or_none()
        if exists is not None:
            continue  # dedupe (PLI-221 across sources)
        db.add(
            DeviceEvent(
                pet_id=pet.id, device_id=device.id, provider=ev.provider,
                provider_event_id=ev.provider_event_id,
                event_kind=ev.event_kind, occurred_at=ev.occurred_at,
                payload=ev.payload, quality_status=status, quality_note=note,
            )
        )
        if status == "REJECTED":
            rejected += 1
        else:
            ingested += 1
    await db.flush()
    await write_audit(db, action="device.sync", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetDevice", resource_id=str(device.id),
                      detail={"ingested": ingested, "rejected": rejected})
    await db.commit()
    return {"ingested": ingested, "rejected": rejected, "provider": device.provider}


@router.get("/pets/{pet_id}/device-events")
async def list_device_events(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 50
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(DeviceEvent).where(DeviceEvent.pet_id == pet.id)
            .order_by(DeviceEvent.occurred_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {"event_id": str(r.id), "event_kind": r.event_kind,
         "occurred_at": r.occurred_at.isoformat(), "quality_status": r.quality_status,
         "attribution": r.attribution, "review_status": r.review_status,
         "payload": r.payload}
        for r in rows
    ]


class WebhookIn(BaseModel):
    provider: str
    device_key: str
    provider_event_id: str
    event_kind: str
    occurred_at: datetime
    payload: dict = Field(default_factory=dict)


@router.post("/adapters/device-webhook/{provider}", status_code=201)
async def device_webhook(provider: str, body: WebhookIn,
                         db: DBSession, user: CurrentUser) -> dict:
    """Mock webhook ingest (Stage C: mock webhook). Flag-gated per provider."""
    if not await feature_enabled(db, f"device.{provider}"):
        raise PermissionDenied(f"webhook for '{provider}' is flag-gated (off).")
    device = (
        await db.execute(
            select(PetDevice).where(
                PetDevice.provider == provider,
                PetDevice.device_key == body.device_key,
            )
        )
    ).scalar_one_or_none()
    if device is None:
        raise NotFound("No linked device for this provider/device_key.")
    from app.adapters.devices import NormalizedEvent

    status, note = quality_check(
        NormalizedEvent(
            provider=provider,
            provider_event_id=body.provider_event_id,
            event_kind=body.event_kind,
            occurred_at=body.occurred_at,
            payload=body.payload,
        )
    )
    replay = (
        await db.execute(
            select(DeviceEvent).where(
                DeviceEvent.provider == provider,
                DeviceEvent.provider_event_id == body.provider_event_id,
            )
        )
    ).scalar_one_or_none()
    if replay is not None:
        from app.core.errors import ConflictError

        raise ConflictError(
            "Duplicate webhook event (provider_event_id already ingested).",
            code="DUPLICATE_EVENT",
            details={"device_event_id": str(replay.id)},
        )
    row = DeviceEvent(
        pet_id=device.pet_id, device_id=device.id, provider=provider,
        provider_event_id=body.provider_event_id,
        event_kind=body.event_kind, occurred_at=body.occurred_at,
        payload=body.payload, quality_status=status, quality_note=note,
    )
    db.add(row)
    await db.flush()
    await db.commit()
    return {"device_event_id": str(row.id), "quality_status": status}


@router.get("/pets/{pet_id}/home-summary")
async def home_summary(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-132: family status summary from today's device events."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = (
        await db.execute(
            select(DeviceEvent).where(
                DeviceEvent.pet_id == pet.id,
                DeviceEvent.occurred_at >= day_start,
                DeviceEvent.quality_status == "OK",
            )
        )
    ).scalars().all()
    by_kind: dict[str, int] = {}
    for r in rows:
        by_kind[r.event_kind] = by_kind.get(r.event_kind, 0) + 1
    return {"pet_id": str(pet.id), "today_counts": by_kind,
            "note": "汇总仅含已通过质量检查的设备事件。"}


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
    from sqlalchemy.orm.attributes import flag_modified

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
    return [
        {"event_id": str(r.id), "event_kind": r.event_kind,
         "occurred_at": r.occurred_at.isoformat(), "payload": r.payload}
        for r in rows
    ]


# --- identity extras (PLI-006/009/012/015) -----------------------------------------


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
    from sqlalchemy.orm.attributes import flag_modified

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


# --- care network extras (PLI-043/044/045/048) ---------------------------------------


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
    return [
        {"professional_id": str(r.id), "profession": r.profession,
         "display_name": r.display_name, "verified": r.verified}
        for r in rows
    ]


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
    return [{"task_id": str(t.id), "title": t.title,
             "due_at": t.due_at.isoformat()} for t in rows]


@router.get("/health-records/signature-policy")
async def signature_policy() -> dict:
    """PLI-045: professional record signature provenance policy."""
    return {
        "policy": "专业记录需带 signature（签署人/机构/时间），来源标 PROFESSIONAL_CONFIRMED",
        "signature_fields": ["signer", "institution", "signed_at"],
        "enforcement": "导入时若 kind=PRESCRIPTION/EXAM 且缺 signature 字段则记录为 UNSIGNED",
    }


# --- welfare record layer (PLI-099..108) ----------------------------------------------


class WelfareObservationIn(BaseModel):
    kind: str = Field(pattern="^(CHOICE|ENVIRONMENT_LOAD|STRESS_RECOVERY|QOL_QUESTIONNAIRE)$")
    observed_at: datetime | None = None
    data: dict = Field(default_factory=dict)
    source_type: str = "OWNER_REPORTED"


@router.post("/pets/{pet_id}/welfare-observations", status_code=201)
async def add_welfare_observation(pet_id: uuid.UUID, body: WelfareObservationIn,
                                  db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row = WelfareObservation(
        pet_id=pet.id, kind=body.kind,
        observed_at=body.observed_at or datetime.now(timezone.utc),
        data=body.data, source_type=body.source_type, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await db.commit()
    return {"observation_id": str(row.id),
            "note": "只记录可观察选择/负荷/恢复数据；不输出伪情绪结论。"}


@router.get("/pets/{pet_id}/welfare-evidence")
async def welfare_evidence(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-108: provenance-backed welfare evidence summary (counts only)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(WelfareObservation).where(WelfareObservation.pet_id == pet.id)
        )
    ).scalars().all()
    by_kind: dict[str, int] = {}
    for r in rows:
        by_kind[r.kind] = by_kind.get(r.kind, 0) + 1
    return {"pet_id": str(pet.id), "observation_counts": by_kind,
            "sources": sorted({r.source_type for r in rows}),
            "notice": "证据摘要来自带来源的可观察记录；不是情绪/福利真相断言。"}


# --- behavior extras (PLI-076..083) ------------------------------------------------------


BEHAVIOR_CATEGORIES = {"GENERAL", "AVOIDANCE_FEAR", "AGGRESSION_RISK", "ALONE"}


class InterventionIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    behavior_event_id: uuid.UUID | None = None
    steps: list[str] = Field(default_factory=list)


@router.post("/pets/{pet_id}/behavior-interventions", status_code=201)
async def create_intervention(pet_id: uuid.UUID, body: InterventionIn,
                              db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row = BehaviorInterventionPlan(
        pet_id=pet.id, behavior_event_id=body.behavior_event_id,
        title=body.title, approach="REWARD_BASED",
        steps=[{"description": s, "status": "PENDING"} for s in body.steps],
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="behavior_intervention.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="BehaviorInterventionPlan", resource_id=str(row.id))
    await db.commit()
    return {"plan_id": str(row.id), "approach": "REWARD_BASED",
            "note": "行为干预计划为记录层；不做医学/心理诊断。"}


@router.post("/behavior-interventions/{plan_id}/outcomes", status_code=201)
async def add_intervention_outcome(plan_id: uuid.UUID, body: dict,
                                   db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(
            select(BehaviorInterventionPlan).where(
                BehaviorInterventionPlan.id == plan_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Plan not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row.outcomes = list(row.outcomes) + [{
        "at": datetime.now(timezone.utc).isoformat(),
        "result": str(body.get("result", "UNKNOWN")),
        "notes": str(body.get("notes", "")),
    }]
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "outcomes")
    await db.flush()
    await db.commit()
    return {"plan_id": str(row.id), "outcomes": row.outcomes}


# --- health extras (PLI-065/066/067) -------------------------------------------------------


TERM_MAP = {
    "GDV": "胃扩张-扭转（紧急）",
    "FLUTD": "猫下泌尿道疾病",
    "otitis externa": "外耳炎",
    "dermatitis": "皮炎",
}


@router.get("/health/term-map")
async def term_map() -> dict:
    return {"map": TERM_MAP, "note": "静态标准术语映射 v1；由兽医专业内容版本管理。"}


# --- training extras (PLI-089..098) ----------------------------------------------------------


@router.get("/pets/{pet_id}/training/consistency")
async def training_consistency(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-093: sessions grouped by family member (deterministic)."""
    from app.models import TrainingSession

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(TrainingSession).where(TrainingSession.pet_id == pet.id)
        )
    ).scalars().all()
    by_actor: dict[str, int] = {}
    for s in rows:
        who = str(s.created_by_user_id)
        by_actor[who] = by_actor.get(who, 0) + 1
    return {"by_member": by_actor,
            "note": "一致性为记录统计，非评价。"}


@router.get("/training/course-templates")
async def course_templates() -> dict:
    """PLI-097: reward-based course templates (content-versioned)."""
    return {
        "version": "1.0.0",
        "templates": [
            {"name": "唤回基础", "weeks": 4, "method": "reward-based"},
            {"name": "笼内适应", "weeks": 3, "method": "reward-based"},
            {"name": "牵引随行", "weeks": 6, "method": "reward-based"},
        ],
        "policy": "仅正向强化课程模板。",
    }


# --- care services record layer (PLI-139..151) -------------------------------------------------


class ServiceRequestIn(BaseModel):
    service_kind: str = Field(pattern="^(WALKING|SITTING|GROOMING|TRAINING)$")
    needs_profile: dict = Field(default_factory=dict)
    care_card_id: uuid.UUID | None = None


@router.post("/pets/{pet_id}/service-requests", status_code=201)
async def create_service_request(pet_id: uuid.UUID, body: ServiceRequestIn,
                                 db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = ServiceRequest(
        pet_id=pet.id, service_kind=body.service_kind,
        needs_profile=body.needs_profile, care_card_id=body.care_card_id,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="service_request.create", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="ServiceRequest", resource_id=str(row.id))
    await db.commit()
    return {"request_id": str(row.id), "status": row.status,
            "boundary": "记录层：真实服务者匹配与支付 EXTERNAL_BLOCKED，本系统不撮合、不收款。"}


@router.post("/service-requests/{request_id}/checklist", status_code=201)
async def init_service_checklist(request_id: uuid.UUID, body: dict,
                                 db: DBSession, user: CurrentUser) -> dict:
    """PLI-143: pre-service checklist (same pattern as handoff checklist)."""
    row = (
        await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Service request not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    items = body.get("items") or [
        "喂食时间与份量说明", "当前用药与给药时间", "行为禁忌与应激源",
        "紧急联系人 / 首选医院", "常用物品位置",
    ]
    row.checklist = [{"text": t, "done": False, "done_by": None, "done_at": None}
                     for t in items]
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "checklist")
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "checklist": row.checklist}


@router.post("/service-requests/{request_id}/checklist/update")
async def update_service_checklist(request_id: uuid.UUID, body: dict,
                                   db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Service request not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    index = int(body.get("index", -1))
    if index < 0 or index >= len(row.checklist):
        raise ValidationFailed("checklist index out of range")
    row.checklist[index] = {
        **row.checklist[index], "done": bool(body.get("done")),
        "done_by": str(user.id),
        "done_at": datetime.now(timezone.utc).isoformat(),
    }
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "checklist")
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "checklist": row.checklist}


@router.post("/service-requests/{request_id}/summary", status_code=201)
async def generate_service_summary(request_id: uuid.UUID, db: DBSession,
                                   user: CurrentUser) -> dict:
    """PLI-146: deterministic service summary from updates + checklist."""
    row = (
        await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Service request not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    checklist_done = sum(1 for c in row.checklist if c.get("done"))
    row.summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "final_status": row.status,
        "update_count": len(row.updates),
        "checklist_done": str(checklist_done) + "/" + str(len(row.checklist)),
        "notice": "总结为记录统计，非主观评价。",
    }
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "summary")
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "summary": row.summary}


@router.post("/service-requests/{request_id}/updates", status_code=201)
async def add_service_update(request_id: uuid.UUID, body: dict,
                             db: DBSession, user: CurrentUser) -> dict:
    row = (
        await db.execute(select(ServiceRequest).where(ServiceRequest.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Service request not found.")
    pet = await perm.get_pet_or_404(db, row.pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    allowed = {"REQUESTED", "MATCHED", "BOOKED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
    new_status = str(body.get("status", ""))
    if new_status and new_status not in allowed:
        raise ValidationFailed(f"status must be one of {sorted(allowed)}")
    if new_status:
        row.status = new_status
    row.updates = list(row.updates) + [{
        "at": datetime.now(timezone.utc).isoformat(),
        "note": str(body.get("note", "")),
        "status": new_status or None,
    }]
    from sqlalchemy.orm.attributes import flag_modified

    flag_modified(row, "updates")
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "status": row.status}


# --- nutrition commerce constraints (PLI-164..168, PLI-172) --------------------------------------


PRODUCTS = [
    {"sku": "f-chicken-2kg", "name": "鸡肉配方犬粮 2kg", "tags": ["chicken", "dog"]},
    {"sku": "f-salmon-2kg", "name": "三文鱼配方犬粮 2kg", "tags": ["salmon", "dog"]},
    {"sku": "f-urinary-cat", "name": "泌尿道处方猫粮", "tags": ["cat", "urinary", "prescription"]},
]


@router.get("/pets/{pet_id}/products/filtered")
async def filtered_products(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-166: constraint filter — excludes products conflicting with the
    pet's recorded allergies. Purely subtractive; NOT a recommendation."""
    from app.models import DietProfile

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    diet = (
        await db.execute(select(DietProfile).where(DietProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    allergies = [a.lower() for a in (diet.allergies if diet else [])]
    allowed = [
        p for p in PRODUCTS
        if not any(a in [t.lower() for t in p["tags"]] for a in allergies)
    ]
    return {
        "allowed": allowed,
        "excluded_reason": "按已记录过敏/禁忌做约束过滤",
        "disclaimer": "这是约束过滤，不是营养推荐；处方类商品需兽医指导。",
    }


class FoodUsageIn(BaseModel):
    sku: str = ""
    product_name: str = ""
    grams: str = ""
    occurred_at: datetime | None = None
    pet_response: str = "UNKNOWN"


@router.post("/pets/{pet_id}/food-usage", status_code=201)
async def log_food_usage(pet_id: uuid.UUID, body: FoodUsageIn,
                         db: DBSession, user: CurrentUser) -> dict:
    """PLI-164/167: actual food usage + outcome (record layer)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    await create_life_event(
        db, pet_id=pet.id, event_type="daily.meal",
        payload={"food_type": body.product_name or body.sku,
                 "amount": body.grams, "unit": "g",
                 "outcome": body.pet_response},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"logged": True}


# --- finance records (PLI-176..184) -----------------------------------------------------------------


class ExpenseSplitIn(BaseModel):
    splits: list[dict] = Field(min_length=1)  # [{user_id, share}]


@router.post("/expenses/{expense_id}/splits", status_code=201)
async def split_expense(expense_id: uuid.UUID, body: ExpenseSplitIn,
                        db: DBSession, user: CurrentUser) -> dict:
    expense = (
        await db.execute(select(Expense).where(Expense.id == expense_id))
    ).scalar_one_or_none()
    if expense is None:
        raise NotFound("Expense not found.")
    for s in body.splits:
        db.add(
            HouseholdExpenseSplit(
                expense_id=expense.id,
                user_id=uuid.UUID(str(s["user_id"])),
                share=str(s.get("share", "")),
            )
        )
    await db.flush()
    await db.commit()
    return {"expense_id": str(expense.id), "splits": len(body.splits)}


@router.get("/pets/{pet_id}/finance/summary")
async def finance_summary(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    year: int | None = Query(default=None),
) -> dict:
    """PLI-177: yearly trend by category (counts + decimal-string sums)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    y = year or datetime.now(timezone.utc).year
    rows = (
        await db.execute(
            select(Expense).where(
                Expense.pet_id == pet.id,
                Expense.incurred_at >= datetime(y, 1, 1, tzinfo=timezone.utc),
                Expense.incurred_at < datetime(y + 1, 1, 1, tzinfo=timezone.utc),
            )
        )
    ).scalars().all()
    by_category: dict[str, float] = {}
    for r in rows:
        try:
            by_category[r.category] = by_category.get(r.category, 0) + float(r.amount)
        except ValueError:
            continue
    return {"year": y, "sums_by_category": {k: round(v, 2) for k, v in by_category.items()},
            "entries": len(rows),
            "note": "仅记录层汇总；不执行任何支付。"}


class PolicyIn(BaseModel):
    policy_no: str = Field(min_length=1, max_length=80)
    insurer_note: str = ""
    coverage_note: str = ""


@router.post("/pets/{pet_id}/insurance-policies", status_code=201)
async def add_policy(pet_id: uuid.UUID, body: PolicyIn,
                     db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = InsurancePolicyRecord(
        pet_id=pet.id, policy_no=body.policy_no,
        insurer_note=body.insurer_note, coverage_note=body.coverage_note,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="policy.add", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="InsurancePolicyRecord", resource_id=str(row.id))
    await db.commit()
    return {"policy_id": str(row.id),
            "note": "保单档案/理赔材料整理为记录层；与保险公司无真实连接（EXTERNAL_BLOCKED）。"}


@router.get("/pets/{pet_id}/finance/export.csv")
async def finance_export(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-184: CSV-ready export descriptor (frontend renders CSV)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(Expense).where(Expense.pet_id == pet.id)
            .order_by(Expense.incurred_at)
        )
    ).scalars().all()
    return {
        "columns": ["date", "category", "amount", "currency", "note"],
        "rows": [
            [r.incurred_at.date().isoformat(), r.category, r.amount,
             r.currency, r.note]
            for r in rows
        ],
    }


# --- timeline extras (PLI-189/191) ---------------------------------------------------------------------


@router.get("/pets/{pet_id}/year-review")
async def year_review(pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
                      year: int | None = Query(default=None)) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    y = year or datetime.now(timezone.utc).year
    rows = (
        await db.execute(
            select(LifeEvent.event_type, func.count()).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= datetime(y, 1, 1, tzinfo=timezone.utc),
                LifeEvent.occurred_at < datetime(y + 1, 1, 1, tzinfo=timezone.utc),
                LifeEvent.retracted_at.is_(None),
            ).group_by(LifeEvent.event_type)
        )
    ).all()
    return {"year": y, "counts": {t: c for t, c in rows}}


@router.get("/pets/{pet_id}/compare")
async def cross_period_compare(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    a_start: date, a_end: date, b_start: date, b_end: date,
) -> dict:
    """PLI-191: deterministic event-count comparison of two windows."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)

    async def count(start: date, end: date) -> int:
        return (
            await db.execute(
                select(func.count()).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.occurred_at >= datetime(start.year, start.month, start.day,
                                                     tzinfo=timezone.utc),
                    LifeEvent.occurred_at < datetime(end.year, end.month, end.day,
                                                    tzinfo=timezone.utc),
                    LifeEvent.retracted_at.is_(None),
                )
            )
        ).scalar_one()

    return {"a": {"start": a_start.isoformat(), "end": a_end.isoformat(),
                  "events": await count(a_start, a_end)},
            "b": {"start": b_start.isoformat(), "end": b_end.isoformat(),
                  "events": await count(b_start, b_end)},
            "notice": "确定性计数对比，不做医学解读。"}


# --- agent policy (PLI-201/202/206/209/210) ---------------------------------------------------------------


class AgentProposalIn(BaseModel):
    action_class: str = Field(pattern="^(INFO|BOOKING|PURCHASE|MEDICAL)$")
    proposal: dict = Field(default_factory=dict)
    pet_id: uuid.UUID | None = None


@router.post("/agent/actions", status_code=201)
async def propose_agent_action(body: AgentProposalIn,
                               db: DBSession, user: CurrentUser) -> dict:
    """Agent action policy: BOOKING/PURCHASE/MEDICAL are never auto-executed.
    The proposal is logged; execution requires an explicit human confirmation
    flow that does not exist for these classes in v1.0."""
    policy_result = "ALLOWED" if body.action_class == "INFO" else "REFUSED"
    row = AgentActionLog(
        pet_id=body.pet_id, action_class=body.action_class,
        proposal=body.proposal, policy_result=policy_result,
        executed=False, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await write_audit(db, action="agent.proposal", actor_user_id=user.id,
                      pet_id=body.pet_id, resource_type="AgentActionLog",
                      resource_id=str(row.id),
                      detail={"class": body.action_class, "result": policy_result})
    await db.commit()
    return {"action_id": str(row.id), "policy_result": policy_result,
            "executed": False,
            "policy": "BOOKING/PURCHASE/MEDICAL 动作一律不自动执行（PLI-202/204/135）。"}


@router.get("/agent/actions")
async def list_agent_actions(db: DBSession, user: CurrentUser) -> list[dict]:
    rows = (
        await db.execute(
            select(AgentActionLog).order_by(AgentActionLog.created_at.desc()).limit(50)
        )
    ).scalars().all()
    return [
        {"action_id": str(r.id), "action_class": r.action_class,
         "policy_result": r.policy_result, "executed": r.executed}
        for r in rows
    ]


# --- platform (PLI-218/220/222/224/226) ---------------------------------------------------------------------


HARMFUL_PATTERNS = ("自杀", "毒品", "枪支买卖", "虐杀")


@router.post("/diary/filtered")
async def diary_filtered_check(body: dict, db: DBSession, user: CurrentUser) -> dict:
    """PLI-218: harmful content safety check for user text."""
    text = str(body.get("text", ""))
    hit = next((p for p in HARMFUL_PATTERNS if p in text), None)
    return {"allowed": hit is None, "matched": hit,
            "policy": "社区/自由文本安全过滤（记录层）"}


@router.get("/pets/{pet_id}/identity-links")
async def identity_links(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    """PLI-222: cross-source normalization candidates by chip identifier."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    own = (
        await db.execute(
            select(PetIdentifier).where(PetIdentifier.pet_id == pet.id)
        )
    ).scalars().all()
    candidates = []
    for ident in own:
        rows = (
            await db.execute(
                select(PetIdentifier).where(
                    PetIdentifier.identifier_type == ident.identifier_type,
                    PetIdentifier.value == ident.value,
                    PetIdentifier.pet_id != pet.id,
                )
            )
        ).scalars().all()
        for r in rows:
            candidates.append({"pet_id": str(r.pet_id),
                               "identifier_type": r.identifier_type,
                               "matched_on": r.value})
    return candidates


@router.post("/experiments/{key}/assign", status_code=201)
async def assign_experiment(key: str, db: DBSession, user: CurrentUser) -> dict:
    """PLI-224: deterministic bucket by hash(user_id|key)."""
    digest = hashlib.sha256(f"{user.id}|{key}".encode()).hexdigest()
    bucket = "A" if int(digest, 16) % 2 == 0 else "B"
    row = (
        await db.execute(
            select(ExperimentAssignment).where(
                ExperimentAssignment.experiment_key == key,
                ExperimentAssignment.user_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = ExperimentAssignment(experiment_key=key, user_id=user.id, bucket=bucket)
        db.add(row)
        await db.flush()
    await db.commit()
    return {"experiment": key, "bucket": row.bucket, "deterministic": True}


@router.get("/pets/{pet_id}/data-quality")
async def data_quality(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-226: completeness score (deterministic, 0..1)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    checks = {
        "birth_date": pet.birth_date is not None,
        "breed": bool(pet.breed),
        "weight_note": bool(pet.weight_note),
        "avatar": pet.avatar_artifact_id is not None,
    }
    event_count = (
        await db.execute(
            select(func.count()).where(LifeEvent.pet_id == pet.id)
        )
    ).scalar_one()
    score = (sum(1 for v in checks.values() if v) + (1 if event_count >= 5 else 0)) / (
        len(checks) + 1
    )
    return {"pet_id": str(pet.id), "score": round(score, 2), "checks": checks,
            "event_count": event_count}


# --- Stage D Phase 7: integration capability registry -----------------------

REGISTRY_SEED = [
    {"capability": "device.telemetry", "provider": "fake", "mode": "SANDBOX",
     "status": "SANDBOX_READY", "feature_flag": "device.fake",
     "risk_level": "LOW", "notes": "sandbox provider; marked sandbox in payload"},
    {"capability": "device.telemetry", "provider": "<real vendors>",
     "mode": "REAL", "status": "EXTERNAL_BLOCKED",
     "feature_flag": "device.<vendor>", "risk_level": "HIGH",
     "notes": "no credential/agreement; adapter interface only"},
    {"capability": "vet.booking", "provider": "sandbox", "mode": "SANDBOX",
     "status": "DISABLED", "feature_flag": "feature.vet_booking",
     "risk_level": "HIGH", "notes": "policy: booking never auto-executed"},
    {"capability": "vet.booking", "provider": "real_provider", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "feature.vet_booking_real",
     "risk_level": "HIGH", "notes": "no legal/technical agreement"},
    {"capability": "payments", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "HIGH",
     "notes": "no payments in v1.0"},
    {"capability": "push.notifications", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "LOW",
     "notes": "in-app notifications only in v1.0"},
    {"capability": "insurance.claims", "provider": "any", "mode": "REAL",
     "status": "EXTERNAL_BLOCKED", "feature_flag": "", "risk_level": "HIGH",
     "notes": "record layer only"},
]


async def ensure_registry_seeded(db) -> None:
    for entry in REGISTRY_SEED:
        exists = (
            await db.execute(
                select(CapabilityRegistry).where(
                    CapabilityRegistry.capability == entry["capability"],
                    CapabilityRegistry.provider == entry["provider"],
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            db.add(CapabilityRegistry(**entry))


@router.get("/capabilities")
async def list_capabilities(db: DBSession, user: CurrentUser) -> list[dict]:
    await ensure_registry_seeded(db)
    await db.commit()
    rows = (
        await db.execute(
            select(CapabilityRegistry).order_by(
                CapabilityRegistry.capability, CapabilityRegistry.mode
            )
        )
    ).scalars().all()
    return [
        {
            "capability": r.capability, "provider": r.provider,
            "mode": r.mode, "environment": r.environment,
            "status": r.status, "feature_flag": r.feature_flag,
            "contract_version": r.contract_version,
            "risk_level": r.risk_level,
            "last_verified_at": r.last_verified_at.isoformat() if r.last_verified_at else None,
            "notes": r.notes,
        }
        for r in rows
    ]
