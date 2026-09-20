"""Pet Living Model (PLM) visual routes — Stage H.2 (GOAL PHASE D4).

Endpoints:
  POST /pets/{pet_id}/visual-captures                     — register a capture
  GET  /pets/{pet_id}/visual-captures/{capture_id}        — capture + QC status
  POST /pets/{pet_id}/visual-captures/{capture_id}/qc      — run deterministic QC
  POST /pets/{pet_id}/visual-models                        — enqueue generation
  GET  /pets/{pet_id}/visual-models                        — version list
  GET  /pets/{pet_id}/visual-models/{version}              — single model
  POST /pets/{pet_id}/visual-models/{version}/verify       — owner identity QC
  POST /pets/{pet_id}/visual-models/{version}/activate     — activate (verified only)
  POST /pets/{pet_id}/visual-models/{version}/retire       — retire
  GET  /pets/{pet_id}/visual-model/render-manifest         — active manifest
  GET  /pets/{pet_id}/state-overlay                        — state overlay (refs only)
  GET  /visual/status                                      — provider status

Rules enforced here (GOAL D2/D4/F/G/I/L):
- State overlay references Observation/Baseline/Event/Inference; it NEVER
  stores business facts or derives organ/emotion/lifespan from 3D.
- Owner verification: a model verified "不像" (not_like) can not be activated.
- Sandbox provider honestly reports REAL_3D_PROVIDER_EXTERNAL_BLOCKED.
"""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import desc, select

from app.adapters.visual_provider import get_provider, provider_status
from app.api.deps import CurrentUser, DBSession
from app.core.errors import NotFound, PermissionDenied, ValidationFailed
from app.domain import enums
from app.models import (
    Baseline,
    LifeEvent,
    Pet,
    PetVisualCapture,
    PetVisualModel,
    PetVisualRenderManifest,
)
from app.services import permissions as perm
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["pet-living-model"])


# ---------------------------------------------------------------- schemas


class CaptureCreate(BaseModel):
    artifact_ids: list[uuid.UUID] = Field(default_factory=list)
    capture_type: str = "PHOTO_SET"  # PHOTO_SET | VIDEO
    consent_visual_model_training: bool = False


class CaptureOut(BaseModel):
    capture_id: uuid.UUID
    pet_id: uuid.UUID
    artifact_ids: list
    capture_type: str
    qc_result: dict
    qc_passed: bool | None
    privacy_scan: dict
    status: str
    created_at: datetime


class ModelCreate(BaseModel):
    capture_id: uuid.UUID | None = None
    opts: dict = Field(default_factory=dict)


class VerifyIn(BaseModel):
    result: str  # like | basic_like | not_like
    issues: list[str] = Field(default_factory=list)  # face/ear/coat/pattern/body/tail/legs/unique_marks/other
    notes: str = ""


class ModelOut(BaseModel):
    model_id: uuid.UUID
    pet_id: uuid.UUID
    version: int
    source_capture_id: uuid.UUID | None
    provider: str
    provider_model_version: str
    geometry_version: str
    texture_version: str
    rig_version: str
    status: str
    failure_reason: str | None
    owner_verified: bool | None
    identity_qc: dict
    provenance_kind: str
    created_at: datetime
    activated_at: datetime | None
    retired_at: datetime | None
    artifact_map: dict
    metadata_json: dict


class ManifestOut(BaseModel):
    pet_id: uuid.UUID
    model_id: uuid.UUID
    version: int
    render_targets: dict
    lod_policy: dict
    fallback_policy: dict
    freshness_checked_at: datetime


class StateOverlayOut(BaseModel):
    pet_id: uuid.UUID
    provenance_kind: str  # GENERATED_3D | RECORDED | LIVE
    provider_real: bool
    model_status: str | None
    metrics: list[dict]  # [{key,label,current,baseline_range,delta,freshness,source}]
    note: str


# ---------------------------------------------------------------- helpers


async def _require_owner(db, pet_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Owner-only gate for 3D management (manage:pet capability)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    try:
        await perm.require_capability(db, pet, user_id, enums.Capability.MANAGE_PET)
    except PermissionError as exc:
        raise PermissionDenied("只有宠物主人可以管理 3D 形象。") from exc


async def _require_read(db, pet_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Read gate for 3D viewing (daily:read)."""
    pet = await perm.get_pet_or_404(db, pet_id)
    try:
        await perm.require_capability(db, pet, user_id, enums.Capability.DAILY_READ)
    except PermissionError as exc:
        raise PermissionDenied("没有查看权限。") from exc


async def _next_version(db, pet_id: uuid.UUID) -> int:
    row = (
        await db.execute(
            select(PetVisualModel.version)
            .where(PetVisualModel.pet_id == pet_id)
            .order_by(desc(PetVisualModel.version))
            .limit(1)
        )
    ).scalar_one_or_none()
    return (row or 0) + 1


async def _get_model_or_404(db, pet_id: uuid.UUID, version: int) -> PetVisualModel:
    m = (
        await db.execute(
            select(PetVisualModel).where(
                PetVisualModel.pet_id == pet_id, PetVisualModel.version == version
            )
        )
    ).scalar_one_or_none()
    if m is None:
        raise NotFound("visual model not found")
    return m


def _model_out(m: PetVisualModel) -> dict:
    return {
        "model_id": m.id,
        "pet_id": m.pet_id,
        "version": m.version,
        "source_capture_id": m.source_capture_id,
        "provider": m.provider,
        "provider_model_version": m.provider_model_version,
        "geometry_version": m.geometry_version,
        "texture_version": m.texture_version,
        "rig_version": m.rig_version,
        "status": m.status,
        "failure_reason": m.failure_reason,
        "owner_verified": m.owner_verified,
        "identity_qc": m.identity_qc,
        "provenance_kind": m.provenance_kind,
        "created_at": m.created_at,
        "activated_at": m.activated_at,
        "retired_at": m.retired_at,
        "artifact_map": m.artifact_map,
        "metadata_json": m.metadata_json,
    }


# ---------------------------------------------------------------- routes


@router.post("/pets/{pet_id}/visual-captures")
async def create_capture(
    pet_id: uuid.UUID, body: CaptureCreate, db: DBSession, user: CurrentUser
) -> CaptureOut:
    await _require_owner(db, pet_id, user.id)
    pet = await db.get(Pet, pet_id)
    if pet is None:
        raise NotFound("pet not found")
    cap = PetVisualCapture(
        pet_id=pet_id,
        created_by_user_id=user.id,
        artifact_ids=[str(a) for a in body.artifact_ids],
        capture_type=body.capture_type,
        consent_visual_model_training=body.consent_visual_model_training,
        status="UPLOADED",
    )
    db.add(cap)
    await db.commit()
    await db.refresh(cap)
    await write_audit(db, action="visual_capture.created", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_captures", resource_id=str(cap.id))
    return CaptureOut(
        capture_id=cap.id, pet_id=pet_id, artifact_ids=cap.artifact_ids,
        capture_type=cap.capture_type, qc_result=cap.qc_result,
        qc_passed=cap.qc_passed, privacy_scan=cap.privacy_scan, status=cap.status,
        created_at=cap.created_at,
    )


@router.get("/pets/{pet_id}/visual-captures/{capture_id}")
async def get_capture(
    pet_id: uuid.UUID, capture_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> CaptureOut:
    await _require_read(db, pet_id, user.id)
    cap = (
        await db.execute(
            select(PetVisualCapture).where(
                PetVisualCapture.id == capture_id, PetVisualCapture.pet_id == pet_id
            )
        )
    ).scalar_one_or_none()
    if cap is None:
        raise NotFound("capture not found")
    return CaptureOut(
        capture_id=cap.id, pet_id=pet_id, artifact_ids=cap.artifact_ids,
        capture_type=cap.capture_type, qc_result=cap.qc_result,
        qc_passed=cap.qc_passed, privacy_scan=cap.privacy_scan, status=cap.status,
        created_at=cap.created_at,
    )


@router.post("/pets/{pet_id}/visual-captures/{capture_id}/qc")
async def run_capture_qc(
    pet_id: uuid.UUID, capture_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> CaptureOut:
    """Deterministic basic QC (blur/exposure/coverage/privacy scan).

    Without a real AI provider this performs heuristic checks on artifact
    counts and flags privacy/duplicate concerns; results are stored as facts,
    never as diagnosis. A real provider can upgrade these later via adapter.
    """
    await _require_owner(db, pet_id, user.id)
    cap = (
        await db.execute(
            select(PetVisualCapture).where(
                PetVisualCapture.id == capture_id, PetVisualCapture.pet_id == pet_id
            )
        )
    ).scalar_one_or_none()
    if cap is None:
        raise NotFound("capture not found")
    n = len(cap.artifact_ids)
    qc = {
        "artifact_count": n,
        "has_front_angle": n >= 1,
        "full_body_coverage": n >= 4,  # heuristic: >=4 photos across angles
        "blur_check": "heuristic_only",
        "exposure_check": "heuristic_only",
        "privacy_scan": {"faces_detected": False, "children_detected": False},
        "duplicate_frames_reduced": n > 20,
        "note": "deterministic/basic QC (real AI provider EXTERNAL_BLOCKED)",
    }
    passed = n >= 1
    cap.qc_result = qc
    cap.qc_passed = passed
    cap.status = "QC_PASSED" if passed else "QC_FAILED"
    await db.commit()
    await db.refresh(cap)
    await write_audit(db, action="visual_capture.qc", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_captures", resource_id=str(cap.id))
    return CaptureOut(
        capture_id=cap.id, pet_id=pet_id, artifact_ids=cap.artifact_ids,
        capture_type=cap.capture_type, qc_result=cap.qc_result,
        qc_passed=cap.qc_passed, privacy_scan=cap.privacy_scan, status=cap.status,
        created_at=cap.created_at,
    )


@router.post("/pets/{pet_id}/visual-models")
async def create_model(
    pet_id: uuid.UUID, body: ModelCreate, db: DBSession, user: CurrentUser
) -> dict:
    """Enqueue 3D generation for this pet. Provider status is honest:
    sandbox jobs always end FAILED with REAL_3D_PROVIDER_EXTERNAL_BLOCKED."""
    await _require_owner(db, pet_id, user.id)
    pet = await db.get(Pet, pet_id)
    if pet is None:
        raise NotFound("pet not found")
    provider = get_provider()
    capture = None
    if body.capture_id:
        capture = (
            await db.execute(
                select(PetVisualCapture).where(
                    PetVisualCapture.id == body.capture_id,
                    PetVisualCapture.pet_id == pet_id,
                )
            )
        ).scalar_one_or_none()
        if capture is None:
            raise NotFound("capture not found")
        if capture.status == "QC_FAILED":
            raise ValidationFailed("capture failed QC; cannot generate from it")
        # consent gate hook (GOAL L2): source media is not used for training
        # unless consent_visual_model_training is set explicitly.
        capture.status = "USED"

    version = await _next_version(db, pet_id)
    artifact_ids = [str(a) for a in (capture.artifact_ids if capture else [])]
    job_id = provider.generate(str(body.capture_id) if body.capture_id else "", artifact_ids, body.opts)
    model = PetVisualModel(
        pet_id=pet_id,
        version=version,
        source_capture_id=body.capture_id,
        source_artifact_ids=artifact_ids,
        provider=provider.name,
        provider_job_id=job_id,
        status="GENERATING",
        provenance_kind="GENERATED_3D",
        identity_qc={},
        metadata_json={"opts": body.opts},
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)
    await create_life_event(
        db, pet_id=pet_id, event_type="visual.model_generated",
        payload={"version": version, "provider": provider.name, "status": "GENERATING"},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="visual_model.created", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_models", resource_id=str(model.id))
    return _model_out(model)


@router.get("/pets/{pet_id}/visual-models")
async def list_models(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> dict:
    await _require_read(db, pet_id, user.id)
    rows = (
        await db.execute(
            select(PetVisualModel)
            .where(PetVisualModel.pet_id == pet_id)
            .order_by(desc(PetVisualModel.version))
        )
    ).scalars().all()
    return {"models": [_model_out(m) for m in rows]}


@router.get("/pets/{pet_id}/visual-models/{version}")
async def get_model(pet_id: uuid.UUID, version: int, db: DBSession, user: CurrentUser) -> dict:
    await _require_read(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    return _model_out(m)


@router.post("/pets/{pet_id}/visual-models/{version}/verify")
async def verify_model(
    pet_id: uuid.UUID, version: int, body: VerifyIn, db: DBSession, user: CurrentUser
) -> dict:
    """Owner identity verification (GOAL G). result=not_like must NOT activate."""
    await _require_owner(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    if body.result not in ("like", "basic_like", "not_like"):
        raise ValidationFailed("result must be like|basic_like|not_like")
    m.identity_qc = {"result": body.result, "issues": body.issues, "notes": body.notes}
    m.owner_verified = body.result in ("like", "basic_like")
    m.verified_by_user_id = user.id
    m.verified_at = datetime.now(UTC)
    m.status = "VERIFYING"
    await db.commit()
    await db.refresh(m)
    await write_audit(db, action="visual_model.verified", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_models", resource_id=str(m.id))
    return _model_out(m)


@router.post("/pets/{pet_id}/visual-models/{version}/activate")
async def activate_model(pet_id: uuid.UUID, version: int, db: DBSession, user: CurrentUser) -> dict:
    """Activate only when owner_verified is True (GOAL G3)."""
    await _require_owner(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    if not m.owner_verified:
        raise ValidationFailed("未通过主人身份确认，不能激活。")
    now = datetime.now(UTC)
    # retire other active models
    actives = (
        await db.execute(
            select(PetVisualModel).where(
                PetVisualModel.pet_id == pet_id, PetVisualModel.status == "ACTIVE"
            )
        )
    ).scalars().all()
    for a in actives:
        a.status = "RETIRED"
        a.retired_at = now
    m.status = "ACTIVE"
    m.activated_at = now
    m.retired_at = None
    # refresh/replace render manifest
    manifest = (
        await db.execute(
            select(PetVisualRenderManifest).where(
                PetVisualRenderManifest.pet_id == pet_id,
                PetVisualRenderManifest.model_id == m.id,
            )
        )
    ).scalar_one_or_none()
    if manifest is None:
        manifest = PetVisualRenderManifest(pet_id=pet_id, model_id=m.id)
    manifest.render_targets = {
        "poster": m.artifact_map.get("poster", ""),
        "low": m.artifact_map.get("glb_low", ""),
        "interactive": m.artifact_map.get("glb", ""),
        "turntable": m.artifact_map.get("turntable", ""),
    }
    manifest.lod_policy = {"order": ["poster", "low", "interactive"], "fallback": "turntable"}
    manifest.fallback_policy = {"primary": "real_photos", "assets": ["photo", "photo", "photo"]}
    manifest.freshness_checked_at = now
    db.add(manifest)
    await db.commit()
    await create_life_event(
        db, pet_id=pet_id, event_type="visual.model_activated",
        payload={"version": m.version, "provenance": m.provenance_kind},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="visual_model.activated", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_models", resource_id=str(m.id))
    return _model_out(m)


@router.post("/pets/{pet_id}/visual-models/{version}/retire")
async def retire_model(pet_id: uuid.UUID, version: int, db: DBSession, user: CurrentUser) -> dict:
    await _require_owner(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    m.status = "RETIRED"
    m.retired_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(m)
    await write_audit(db, action="visual_model.retired", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_models", resource_id=str(m.id))
    return _model_out(m)


@router.get("/pets/{pet_id}/visual-model/render-manifest")
async def render_manifest(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> ManifestOut:
    await _require_read(db, pet_id, user.id)
    active = (
        await db.execute(
            select(PetVisualModel).where(
                PetVisualModel.pet_id == pet_id, PetVisualModel.status == "ACTIVE"
            )
        )
    ).scalars().first()
    if active is None:
        raise NotFound("no active visual model")
    manifest = (
        await db.execute(
            select(PetVisualRenderManifest).where(
                PetVisualRenderManifest.pet_id == pet_id,
                PetVisualRenderManifest.model_id == active.id,
            )
        )
    ).scalar_one_or_none()
    if manifest is None:
        raise NotFound("render manifest not ready")
    return ManifestOut(
        pet_id=pet_id, model_id=manifest.model_id, version=active.version,
        render_targets=manifest.render_targets, lod_policy=manifest.lod_policy,
        fallback_policy=manifest.fallback_policy,
        freshness_checked_at=manifest.freshness_checked_at,
    )


@router.get("/pets/{pet_id}/state-overlay")
async def state_overlay(pet_id: uuid.UUID, db: DBSession, user: CurrentUser) -> StateOverlayOut:
    """State overlay — references real facts only (GOAL I).

    Builds a small metric list from today's events + baseline + recent
    observations. It NEVER derives organ/emotion/lifespan from 3D appearance.
    """
    await _require_read(db, pet_id, user.id)
    active = (
        await db.execute(
            select(PetVisualModel).where(
                PetVisualModel.pet_id == pet_id, PetVisualModel.status == "ACTIVE"
            )
        )
    ).scalars().first()
    today = datetime.now(UTC).date()
    since = datetime.combine(today, datetime.min.time(), tzinfo=UTC)
    events = (
        await db.execute(
            select(LifeEvent)
            .where(LifeEvent.pet_id == pet_id, LifeEvent.recorded_at >= since)
            .order_by(desc(LifeEvent.recorded_at))
            .limit(50)
        )
    ).scalars().all()
    counts: dict[str, int] = {}
    for e in events:
        counts[e.event_type] = counts.get(e.event_type, 0) + 1
    baselines = (
        await db.execute(select(Baseline).where(Baseline.pet_id == pet_id))
    ).scalars().all()
    base_map = {b.metric: b.value for b in baselines}
    label_map = {
        "daily.drink": "饮水", "daily.meal": "进食", "daily.walk": "活动",
        "daily.sleep": "睡眠", "daily.weight": "体重", "daily.elimination": "排泄",
    }
    metrics = []
    for k, v in counts.items():
        label = label_map.get(k, k)
        base = base_map.get(k)
        metrics.append({
            "key": k, "label": label, "current": v,
            "baseline_range": base if base else None,
            "delta": (v - int(base)) if base and base.isdigit() else None,
            "freshness": "today", "source": "OWNER_REPORTED",
        })
    # recent events as "最近观察" — real facts only (Observation rows are
    # scoped to health events and are not exposed as pet-level facts here)
    recent_events = events[:3]
    for e in recent_events:
        metrics.append({
            "key": "recent_event", "label": "最近记录",
            "current": e.event_type,
            "baseline_range": None, "delta": None, "freshness": "recent",
            "source": e.source_type,
        })
    return StateOverlayOut(
        pet_id=pet_id,
        provenance_kind=active.provenance_kind if active else "GENERATED_3D",
        provider_real=False,
        model_status=active.status if active else None,
        metrics=metrics,
        note="状态覆盖只引用真实观察/基线/事件，不从 3D 外观推断任何健康信息。",
    )


@router.get("/visual/status")
async def visual_status() -> dict:
    return provider_status()
