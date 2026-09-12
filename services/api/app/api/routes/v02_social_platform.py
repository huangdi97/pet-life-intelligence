"""v0.2 routes — social, nutrition, finance, timeline extras, personal
search/QA, memory, platform ops.

PLI-111..113 social (double-consent friends + block/report) ·
PLI-163 diet profile · PLI-175 expense ledger · PLI-187 milestones ·
PLI-188 memories · PLI-190/198 search with evidence · PLI-197 personal QA ·
PLI-199 why-happened hints · PLI-200 low-risk task plans ·
PLI-205 structured memory · PLI-225 analytics counters · PLI-228 ops.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from pli_ai_gateway import Gateway
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import (
    AnalyticsCounter,
    Baseline,
    DietProfile,
    Expense,
    Incident,
    LifeEvent,
    MedicationPlan,
    Milestone,
    Pet,
    PetFriend,
    PetPreference,
    SocialInteraction,
    SocialProfile,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["v02-social-platform"])

_GATEWAY = Gateway()


# --- PLI-111 social profile ---------------------------------------------------


class SocialProfileIn(BaseModel):
    good_with_dogs: str = "UNKNOWN"
    good_with_cats: str = "UNKNOWN"
    good_with_kids: str = "UNKNOWN"
    good_with_strangers: str = "UNKNOWN"
    notes: str = ""


@router.put("/pets/{pet_id}/social-profile")
async def put_social_profile(
    pet_id: uuid.UUID, body: SocialProfileIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    for v in (body.good_with_dogs, body.good_with_cats, body.good_with_kids,
              body.good_with_strangers):
        if v not in {"UNKNOWN", "GOOD", "OK", "CAUTION", "NO"}:
            raise ValidationFailed("values must be UNKNOWN|GOOD|OK|CAUTION|NO")
    row = (
        await db.execute(select(SocialProfile).where(SocialProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        row = SocialProfile(pet_id=pet.id, updated_by_user_id=user.id)
        db.add(row)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    row.updated_by_user_id = user.id
    await db.flush()
    await db.commit()
    return {"pet_id": str(pet.id), "profile": body.model_dump(),
            "note": "经验档案，非行为评估。"}


@router.get("/pets/{pet_id}/social-profile")
async def get_social_profile(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    row = (
        await db.execute(select(SocialProfile).where(SocialProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    if row is None:
        return {"pet_id": str(pet.id), "profile": None}
    return {
        "pet_id": str(pet.id),
        "profile": {
            "good_with_dogs": row.good_with_dogs, "good_with_cats": row.good_with_cats,
            "good_with_kids": row.good_with_kids,
            "good_with_strangers": row.good_with_strangers, "notes": row.notes,
        },
    }


# --- PLI-112 friends with double consent + PLI-113 interactions -----------------


class FriendRequestIn(BaseModel):
    friend_pet_id: uuid.UUID


@router.post("/pets/{pet_id}/friends", status_code=201)
async def request_friend(
    pet_id: uuid.UUID, body: FriendRequestIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.friend_pet_id == pet.id:
        raise ValidationFailed("cannot friend self")
    friend = await perm.get_pet_or_404(db, body.friend_pet_id)
    # requester must be able to manage their own pet; other side must accept
    row = PetFriend(
        pet_id=pet.id, friend_pet_id=friend.id,
        requested_by_user_id=user.id, status="PENDING",
    )
    db.add(row)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.friend_requested",
        payload={"friend_pet_id": str(friend.id), "request_id": str(row.id)},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="social.request", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="PetFriend", resource_id=str(row.id))
    await db.commit()
    return {"request_id": str(row.id), "status": "PENDING",
            "note": "需要对方家庭接受后才会激活（双重同意）。"}


class FriendAcceptIn(BaseModel):
    accept: bool = True


@router.post("/pet-friends/{request_id}/respond")
async def respond_friend(
    request_id: uuid.UUID, body: FriendAcceptIn, db: DBSession, user: CurrentUser
) -> dict:
    row = (
        await db.execute(select(PetFriend).where(PetFriend.id == request_id))
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("Request not found.")
    friend = await perm.get_pet_or_404(db, row.friend_pet_id)
    await perm.require_capability(db, friend, user.id, enums.Capability.MANAGE_PET)
    row.status = "ACTIVE" if body.accept else "DECLINED"
    row.accepted_by_user_id = user.id
    await db.flush()
    await db.commit()
    return {"request_id": str(row.id), "status": row.status}


@router.post("/pets/{pet_id}/friends/{friend_pet_id}/block", status_code=201)
async def block_friend(
    pet_id: uuid.UUID, friend_pet_id: uuid.UUID, body: dict,
    db: DBSession, user: CurrentUser,
) -> dict:
    from app.models import SocialReport

    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.MANAGE_PET)
    row = (
        await db.execute(
            select(PetFriend).where(
                PetFriend.pet_id == pet.id, PetFriend.friend_pet_id == friend_pet_id
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        row.status = "BLOCKED"
    db.add(
        SocialReport(
            pet_id=pet.id, friend_pet_id=friend_pet_id,
            action=str(body.get("action", "BLOCK")),
            reason=str(body.get("reason", "")), reported_by_user_id=user.id,
        )
    )
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.blocked",
        payload={"friend_pet_id": str(friend_pet_id),
                 "action": str(body.get("action", "BLOCK"))},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="social.block", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="SocialReport")
    await db.commit()
    return {"pet_id": str(pet.id), "friend_pet_id": str(friend_pet_id),
            "status": "BLOCKED"}


@router.get("/pets/{pet_id}/friends")
async def list_friends(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> list[dict]:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(select(PetFriend).where(PetFriend.pet_id == pet.id))
    ).scalars().all()
    return [
        {"request_id": str(r.id), "friend_pet_id": str(r.friend_pet_id),
         "status": r.status}
        for r in rows
    ]


class InteractionIn(BaseModel):
    friend_pet_id: uuid.UUID
    occurred_at: datetime | None = None
    quality: str = "UNKNOWN"
    duration_minutes: int | None = Field(default=None, ge=0, le=24 * 60)
    notes: str = ""


@router.post("/pets/{pet_id}/social-interactions", status_code=201)
async def log_interaction(
    pet_id: uuid.UUID, body: InteractionIn, db: DBSession, user: CurrentUser
) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_WRITE)
    if body.quality not in {"UNKNOWN", "GOOD", "NEUTRAL", "TENSE", "BAD"}:
        raise ValidationFailed("quality must be UNKNOWN|GOOD|NEUTRAL|TENSE|BAD")
    friendship = (
        await db.execute(
            select(PetFriend).where(
                PetFriend.pet_id == pet.id,
                PetFriend.friend_pet_id == body.friend_pet_id,
                PetFriend.status == "ACTIVE",
            )
        )
    ).scalar_one_or_none()
    if friendship is None:
        raise PermissionDenied("Interactions require an ACTIVE friend relation.")
    inter = SocialInteraction(
        pet_id=pet.id, friend_pet_id=body.friend_pet_id,
        occurred_at=body.occurred_at or datetime.now(timezone.utc),
        quality=body.quality, duration_minutes=body.duration_minutes,
        notes=body.notes, created_by_user_id=user.id,
    )
    db.add(inter)
    await db.flush()
    await create_life_event(
        db, pet_id=pet.id, event_type="social.interaction_logged",
        payload={"interaction_id": str(inter.id),
                 "friend_pet_id": str(body.friend_pet_id), "quality": inter.quality},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await db.commit()
    return {"interaction_id": str(inter.id), "quality": inter.quality}


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


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)


@router.post("/pets/{pet_id}/ask")
async def pet_ask(pet_id: uuid.UUID, body: AskIn, db: DBSession, user: CurrentUser) -> dict:
    """PLI-197 personal QA — answer_with_evidence must cite real events."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id, LifeEvent.retracted_at.is_(None)
            ).order_by(LifeEvent.occurred_at.desc()).limit(200)
        )
    ).scalars().all()
    evidence = [
        {"id": str(e.id), "text": f"{e.occurred_at:%Y-%m-%d} {e.event_type} {_event_text(e)}"}
        for e in rows
    ]
    result = _GATEWAY.invoke(
        "answer_with_evidence", {"question": body.question, "evidence": evidence}
    )
    sufficient = result.result["sufficient"]
    await create_life_event(
        db, pet_id=pet.id, event_type="pet.asked",
        payload={"question": body.question[:100],
                 "sufficient": sufficient,
                 "citations": result.result["citations"]},
        actor_id=user.id, source_type=enums.SourceType.AI_DERIVED,
        provenance_level=enums.SourceType.AI_DERIVED.value,
        allow_duplicate=True,
    )
    await db.commit()
    return {
        "answer": result.result["answer"],
        "citations": result.result["citations"],
        "sufficient": sufficient,
        "disclaimer": result.result["disclaimer"],
        "note": "答案必须引用证据；citations 可在 Timeline 核对。",
    }


@router.get("/pets/{pet_id}/why")
async def why_happened(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser,
    after_event_id: uuid.UUID = Query(...),
) -> dict:
    """PLI-199: deterministic 'prior events' hints — explicitly NOT causal."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    anchor = (
        await db.execute(select(LifeEvent).where(LifeEvent.id == after_event_id))
    ).scalar_one_or_none()
    if anchor is None or anchor.pet_id != pet.id:
        raise NotFound("Anchor event not found on this pet.")
    window_start = anchor.occurred_at - timedelta(hours=48)
    rows = (
        await db.execute(
            select(LifeEvent).where(
                LifeEvent.pet_id == pet.id,
                LifeEvent.occurred_at >= window_start,
                LifeEvent.occurred_at < anchor.occurred_at,
                LifeEvent.retracted_at.is_(None),
            ).order_by(LifeEvent.occurred_at.desc()).limit(10)
        )
    ).scalars().all()
    return {
        "anchor_event_id": str(anchor.id),
        "prior_events": [
            {"event_id": str(e.id), "event_type": e.event_type,
             "occurred_at": e.occurred_at.isoformat()}
            for e in rows
        ],
        "notice": "仅展示时间上更早的相关记录（相关性提示），不是因果解释。",
    }


# --- PLI-200 low-risk task plan --------------------------------------------------------


@router.post("/pets/{pet_id}/task-plan")
async def low_risk_task_plan(
    pet_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> dict:
    """PLI-200: deterministic suggested tasks from baseline gaps — never
    medical actions."""
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    today = datetime.now(timezone.utc).date()
    suggestions = []
    for _metric, event_type in (("meal", "daily.meal"), ("walk", "daily.walk"),
                               ("play", "daily.play"), ("sleep", "daily.sleep")):
        count = (
            await db.execute(
                select(func.count()).where(
                    LifeEvent.pet_id == pet.id,
                    LifeEvent.event_type == event_type,
                    LifeEvent.occurred_at >= datetime(today.year, today.month, today.day,
                                                     tzinfo=timezone.utc),
                )
            )
        ).scalar_one()
        if count == 0:
            suggestions.append(f"今天还没有「{event_type}」记录，需要时可在 Quick Log 补记。")
    await write_audit(db, action="task_plan.suggest", actor_user_id=user.id,
                      household_id=pet.household_id, pet_id=pet.id,
                      resource_type="TaskPlan", detail={"count": len(suggestions)})
    await db.commit()
    return {"suggestions": suggestions or ["今天的常规记录已齐全。"],
            "boundary": "仅低风险日常建议；不包含医疗动作（PLI-204 硬边界）。"}


# --- PLI-205 structured memory ----------------------------------------------------------


@router.get("/pets/{pet_id}/memory")
async def structured_memory(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    pet = await perm.get_pet_or_404(db, pet_id)
    await perm.require_capability(db, pet, user.id, enums.Capability.DAILY_READ)
    prefs = (
        await db.execute(select(PetPreference).where(PetPreference.pet_id == pet.id))
    ).scalars().all()
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet.id))
    ).scalars().all()
    diet = (
        await db.execute(select(DietProfile).where(DietProfile.pet_id == pet.id))
    ).scalar_one_or_none()
    meds = (
        await db.execute(
            select(MedicationPlan).where(
                MedicationPlan.pet_id == pet.id, MedicationPlan.status == "ACTIVE"
            )
        )
    ).scalars().all()
    return {
        "pet_id": str(pet.id),
        "memory": {
            "preferences": [
                {"kind": p.kind, "subject": p.subject, "source": p.source_type}
                for p in prefs
            ],
            "baselines": [
                {"metric": b.metric, "value": b.value, "algorithm": b.algorithm}
                for b in baselines
            ],
            "diet": ({"allergies": diet.allergies, "current_food": diet.current_food,
                      "source": diet.source_type} if diet else None),
            "active_medications": [
                {"medicine_name": m.medicine_name, "dose_text": m.dose_text,
                 "source": m.source_type}
                for m in meds
            ],
        },
        "notice": "结构化记忆只来自已验证的记录，均带来源。",
    }


# --- PLI-225 analytics counters -----------------------------------------------------------


class CounterIn(BaseModel):
    metric: str = Field(min_length=1, max_length=80)


@router.post("/analytics/counter", status_code=201)
async def bump_counter(body: CounterIn, db: DBSession, user: CurrentUser) -> dict:
    day = datetime.now(timezone.utc).date()
    row = (
        await db.execute(
            select(AnalyticsCounter).where(
                AnalyticsCounter.metric == body.metric, AnalyticsCounter.day == day
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = AnalyticsCounter(metric=body.metric, day=day, count=1)
        db.add(row)
    else:
        row.count += 1
    await db.flush()
    await db.commit()
    return {"metric": body.metric, "day": day.isoformat(), "count": row.count,
            "note": "只存聚合计数，不存原始 payload（PLI-225）。"}


# --- PLI-228 ops status + incidents ----------------------------------------------------------


@router.get("/ops/status")
async def ops_status(db: DBSession, user: CurrentUser) -> dict:
    counts = {}
    for name, stmt in (
        ("pets", select(func.count()).select_from(Pet)),
        ("life_events", select(func.count()).select_from(LifeEvent)),
        ("open_incidents", select(func.count()).where(Incident.status == "OPEN")),
    ):
        counts[name] = (await db.execute(stmt)).scalar_one()
    return {
        "service": "pli-api",
        "time": datetime.now(timezone.utc).isoformat(),
        "counts": counts,
        "rule_engine": __import__("pli_rules", fromlist=["get_engine"])
        .get_engine().engine_version,
        "note": "轻量运行状态（PLI-228）；完整监控栈为生产部署任务。",
    }


class IncidentIn(BaseModel):
    severity: str = Field(pattern="^(INFO|WARN|CRITICAL)$")
    title: str = Field(min_length=1, max_length=200)
    detail: str = ""


@router.post("/ops/incidents", status_code=201)
async def create_incident(body: IncidentIn, db: DBSession, user: CurrentUser) -> dict:
    row = Incident(severity=body.severity, title=body.title,
                   detail=body.detail, created_by_user_id=user.id)
    db.add(row)
    await db.flush()
    await write_audit(db, action="incident.create", actor_user_id=user.id,
                      resource_type="Incident", resource_id=str(row.id),
                      detail={"severity": row.severity})
    await db.commit()
    return {"incident_id": str(row.id), "status": row.status}


@router.get("/ops/incidents")
async def list_incidents(db: DBSession, user: CurrentUser) -> list[dict]:
    rows = (
        await db.execute(
            select(Incident).order_by(Incident.created_at.desc()).limit(50)
        )
    ).scalars().all()
    return [
        {"incident_id": str(r.id), "severity": r.severity, "title": r.title,
         "status": r.status, "created_at": r.created_at.isoformat()}
        for r in rows
    ]
