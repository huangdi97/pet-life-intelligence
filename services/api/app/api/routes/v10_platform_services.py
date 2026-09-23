"""v1.0 routes — care services record layer (PLI-139..151) + nutrition commerce
constraints (PLI-164..168, PLI-172). Record layer only: no real provider
matching, payments, or recommendations.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import DietProfile, ServiceRequest
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v10-platform"])


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


PRODUCTS = [
    {"sku": "f-chicken-2kg", "name": "鸡肉配方犬粮 2kg", "tags": ["chicken", "dog"]},
    {"sku": "f-salmon-2kg", "name": "三文鱼配方犬粮 2kg", "tags": ["salmon", "dog"]},
    {"sku": "f-urinary-cat", "name": "泌尿道处方猫粮", "tags": ["cat", "urinary", "prescription"]},
]


@router.get("/pets/{pet_id}/products/filtered")
async def filtered_products(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    """PLI-166: constraint filter — excludes products conflicting with the
    pet's recorded allergies. Purely subtractive; NOT a recommendation."""
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
