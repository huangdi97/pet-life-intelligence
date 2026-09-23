"""v1.0 routes — finance records (PLI-176..184) + timeline extras (PLI-189/191).

Record-layer summaries and deterministic count comparisons only; no payments
executed anywhere in v1.0.
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound
from app.domain import enums
from app.models import Expense, HouseholdExpenseSplit, InsurancePolicyRecord, LifeEvent
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v10-platform"])


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
