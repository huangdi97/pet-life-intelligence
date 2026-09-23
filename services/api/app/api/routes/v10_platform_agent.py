"""v1.0 routes — agent policy (PLI-201/202/206/209/210) + platform
(PLI-218/220/222/224/226) + integration capability registry (Stage D P7).
"""

import hashlib
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.domain import enums
from app.models import (
    AgentActionLog,
    CapabilityRegistry,
    ExperimentAssignment,
    LifeEvent,
    PetIdentifier,
)
from app.services import permissions as perm
from app.services.eventlog import write_audit

router = APIRouter(tags=["v10-platform"])


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
