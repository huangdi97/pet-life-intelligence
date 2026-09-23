"""v0.2 daily extras — PLI-163 diet profile · PLI-175 expense ledger ·
PLI-187 milestones · PLI-188 memories · PLI-190/198 search with evidence.

Pure refactor of v02_social_platform.py; endpoint bodies kept verbatim.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import ValidationFailed
from app.domain import enums
from app.models import (
    DietProfile,
    Expense,
    LifeEvent,
    Milestone,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event

router = APIRouter(tags=["v02-social-platform"])


# --- PLI-163 diet profile --------------------------------------------------------


class DietProfileIn(BaseModel):
    current_food: str = ""
    allergies: list[str] = Field(default_factory=list)
    feeding_rules: str = ""
    vet_advised: bool = False
    source_type: str = "OWNER_REPORTED"


@router.put("/pets/{pet_id}/diet-profile")
async def put_diet_profile(
    pet_id: uuid.UUID, body: DietProfileIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.source_type not in enums.PROVENANCE_LEVELS:
        raise ValidationFailed("invalid source_type")
    row = (
        await db.execute(select(DietProfile).where(DietProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        row = DietProfile(pet_id=pet.id, source_type=body.source_type,
                          updated_by_user_id=user.id)
        db.add(row)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    row.updated_by_user_id = user.id
    await db.flush()
    await db.commit()
    return {"pet_id": str(pet.id), "updated": True}


@router.get("/pets/{pet_id}/diet-profile")
async def get_diet_profile(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    row = (
        await db.execute(select(DietProfile).where(DietProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        return {"pet_id": str(pet.id), "profile": None}
    return {"pet_id": str(pet.id), "profile": {
        "current_food": row.current_food, "allergies": row.allergies,
        "feeding_rules": row.feeding_rules, "vet_advised": row.vet_advised,
        "source_type": row.source_type}}


# --- PLI-175 expenses ---------------------------------------------------------------


CATEGORIES = {"FOOD", "MEDICAL", "SUPPLIES", "GROOMING", "TRAINING", "OTHER"}


class ExpenseIn(BaseModel):
    category: str
    amount: str = Field(min_length=1, max_length=40)
    currency: str = "CNY"
    incurred_at: datetime | None = None
    note: str = ""


@router.post("/pets/{pet_id}/expenses", status_code=201)
async def log_expense(
    pet_id: uuid.UUID, body: ExpenseIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.category not in CATEGORIES:
        raise ValidationFailed(f"category must be one of {sorted(CATEGORIES)}")
    try:
        float(body.amount)
    except ValueError as exc:
        raise ValidationFailed("amount must be a decimal string") from exc
    row = Expense(
        pet_id=pet.id, household_id=pet.household_id, category=body.category,
        amount=body.amount, currency=body.currency,
        incurred_at=body.incurred_at or datetime.now(timezone.utc),
        note=body.note, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="expense.logged",
        payload={"expense_id": str(row.id), "category": row.category,
                 "amount": row.amount, "currency": row.currency},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"expense_id": str(row.id)}


@router.get("/pets/{pet_id}/expenses")
async def list_expenses(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, limit: int = 100
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(Expense).where(Expense.pet_id == pet.id)
            .order_by(Expense.incurred_at.desc()).limit(limit)
        )
    ).scalars().all()
    return [
        {"expense_id": str(r.id), "category": r.category, "amount": r.amount,
         "currency": r.currency, "incurred_at": r.incurred_at.isoformat()}
        for r in rows
    ]


@router.get("/pets/{pet_id}/expenses/summary")
async def expense_summary(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(Expense.category, func.count()).where(Expense.pet_id == pet.id)
            .group_by(Expense.category)
        )
    ).all()
    totals = {cat: cnt for cat, cnt in rows}
    total = (
        await db.execute(select(func.count()).where(Expense.pet_id == pet.id))
    ).scalar_one()
    return {"by_category_count": totals, "total_entries": total,
            "note": "金额合计在前端计算（字符串金额不在此聚合）"}


# --- PLI-187 milestones + PLI-188 memories -------------------------------------------


class MilestoneIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: str = "OTHER"
    occurred_at: datetime
    note: str = ""


@router.post("/pets/{pet_id}/milestones", status_code=201)
async def add_milestone(
    pet_id: uuid.UUID, body: MilestoneIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    row = Milestone(
        pet_id=pet.id, title=body.title, kind=body.kind,
        occurred_at=body.occurred_at, note=body.note, created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="milestone.recorded",
        payload={"milestone_id": str(row.id), "title": row.title, "kind": row.kind},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
        occurred_at=row.occurred_at,
    )
    await db.commit()
    return {"milestone_id": str(row.id)}


@router.get("/pets/{pet_id}/milestones")
async def list_milestones(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(Milestone).where(Milestone.pet_id == pet.id)
            .order_by(Milestone.occurred_at.desc())
        )
    ).scalars().all()
    return [
        {"milestone_id": str(r.id), "title": r.title, "kind": r.kind,
         "occurred_at": r.occurred_at.isoformat()}
        for r in rows
    ]


@router.get("/pets/{pet_id}/memories")
async def memories_on_this_day(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    years_back: int = Query(default=3, ge=1, le=20),
) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    now = datetime.now(timezone.utc)
    out = []
    for y in range(1, years_back + 1):
        try:
            target = now.replace(year=now.year - y)
        except ValueError:
            continue
        start = target - timedelta(days=1)
        rows = (
            await db.execute(
                select(LifeEvent).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.occurred_at >= start,
                    LifeEvent.occurred_at < target + timedelta(days=1),
                    LifeEvent.retracted_at.is_(None),
                ).order_by(LifeEvent.occurred_at).limit(10)
            )
        ).scalars().all()
        if rows:
            out.append({"years_ago": y, "window": f"{start.date()} ~ {target.date()}",
                        "events": len(rows),
                        "sample": [f"{e.event_type}" for e in rows[:5]]})
    return out


# --- PLI-190/197/198/199 search, QA, hints --------------------------------------------


def _event_text(e: LifeEvent) -> str:
    return " ".join([e.event_type, *[f"{k}:{v}" for k, v in e.payload.items()]])


@router.get("/pets/{pet_id}/search")
async def search_timeline(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser, q: str = Query(min_length=1),
    domain: str | None = Query(default=None), limit: int = 20,
) -> dict:
    """PLI-190/198: keyword search over canonical events; every hit cites the
    real event id — nothing generated."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    stmt = select(LifeEvent).where(
        LifeEvent.pet_id == pet.id, LifeEvent.retracted_at.is_(None)
    )
    if domain:
        stmt = stmt.where(LifeEvent.event_type.like(f"{domain}.%"))
    rows = (
        await db.execute(stmt.order_by(LifeEvent.occurred_at.desc()).limit(500))
    ).scalars().all()
    q_lower = q.lower()
    hits = [e for e in rows if q_lower in _event_text(e).lower()][:limit]
    return {
        "query": q,
        "hits": [
            {"event_id": str(e.id), "event_type": e.event_type,
             "occurred_at": e.occurred_at.isoformat(), "payload": e.payload}
            for e in hits
        ],
        "notice": "只返回真实事件引用；无记录即无结果（不生成历史）。",
    }
