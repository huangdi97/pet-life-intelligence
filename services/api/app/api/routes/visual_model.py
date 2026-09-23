"""Pet Living Model (PLM) — model generation lifecycle, verification,
activation, retirement and render-manifest routes."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import desc, select

from app.adapters.visual_provider import get_provider
from app.api.deps import CurrentUser, DBSession
from app.api.routes.visual_helpers import (
    _get_model_or_404,
    _model_out,
    _next_version,
    _require_owner,
    _require_read,
)
from app.api.routes.visual_schemas import ManifestOut, ModelCreate, VerifyIn
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import Pet, PetVisualCapture, PetVisualModel, PetVisualRenderManifest
from app.services.eventlog import create_life_event, write_audit

router = APIRouter(tags=["pet-living-model"])


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
    # PROVENANCE:
    # The generated model is presentation data (GENERATED_3D), never a
    # clinical fact; it must not overwrite any real observation/event.
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
