"""v1.0 routes — device abstraction + feature flags (PLI-125..135).

Feature-flag ops control; device link/sync/list + sandbox webhook ingest.
Real vendors stay EXTERNAL_BLOCKED: sandbox adapter + per-provider flag only.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.adapters.devices import (
    AdapterError,
    NormalizedEvent,
    get_provider,
    quality_check,
)
from app.api.deps import CurrentUser, DBSession
from app.core.errors import APIError, ConflictError, NotFound, PermissionDenied
from app.core.security import require_ops_admin
from app.domain import enums
from app.models import DeviceEvent, FeatureFlag, PetDevice
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v10-platform"])


async def feature_enabled(db, key: str) -> bool:
    row = (
        await db.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    ).scalar_one_or_none()
    return bool(row and row.enabled)


class FlagIn(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    enabled: bool
    note: str = ""


@router.post("/ops/feature-flags", status_code=201)
async def set_flag(body: FlagIn, db: DBSession, user: CurrentUser) -> dict:
    await require_ops_admin(user)
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
    await require_ops_admin(user)
    rows = (await db.execute(select(FeatureFlag))).scalars().all()
    return [{"key": r.key, "enabled": r.enabled, "note": r.note} for r in rows]


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
