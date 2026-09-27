"""Pet Living Model (PLM) — model generation lifecycle, verification,
activation, retirement and render-manifest routes."""

import asyncio
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks
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
from app.core.db import get_session_factory
from app.core.errors import NotFound, ValidationFailed
from app.domain import enums
from app.models import Pet, PetVisualCapture, PetVisualJob, PetVisualModel, PetVisualRenderManifest
from app.services.eventlog import create_life_event, write_audit
from app.services.visual_pipeline import run_local_generation

router = APIRouter(tags=["pet-living-model"])


def _generate_background(model_id: str) -> None:
    """Run template-local generation in a fresh session (background task).

    The request session is closed after the response, so the worker opens its
    own session and loads the model/job/pet/capture by id. This keeps the
    QUEUED -> GENERATING -> READY lifecycle observable via the job route.
    """

    async def _worker() -> None:
        factory = get_session_factory()
        async with factory() as db:
            model = await db.get(PetVisualModel, uuid.UUID(model_id))
            if model is None:
                return
            job = (
                await db.execute(
                    select(PetVisualJob)
                    .where(PetVisualJob.model_id == model.id)
                    .order_by(desc(PetVisualJob.created_at))
                    .limit(1)
                )
            ).scalar_one_or_none()
            if job is None:
                return
            pet = await db.get(Pet, model.pet_id)
            capture = (
                await db.get(PetVisualCapture, model.source_capture_id)
                if model.source_capture_id
                else None
            )
            await run_local_generation(db, get_provider(), model, pet, capture, job)

    asyncio.run(_worker())


@router.post("/pets/{pet_id}/visual-models")
async def create_model(
    pet_id: uuid.UUID, body: ModelCreate, db: DBSession, user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> dict:
    """Enqueue candidate 3D generation for this pet.

    Uses the in-repo template-local pipeline; a real external generative
    provider remains honestly reported as EXTERNAL_BLOCKED. Idempotent via
    `idempotency_key`: a repeated create with the same key returns the same
    model instead of enqueuing a second generation.
    """
    await _require_owner(db, pet_id, user.id)
    pet = await db.get(Pet, pet_id)
    if pet is None:
        raise NotFound("pet not found")
    if body.idempotency_key:
        existing = (
            await db.execute(
                select(PetVisualModel, PetVisualJob)
                .join(PetVisualJob, PetVisualJob.model_id == PetVisualModel.id)
                .where(
                    PetVisualModel.pet_id == pet_id,
                    PetVisualJob.idempotency_key == body.idempotency_key,
                )
                .limit(1)
            )
        ).first()
        if existing is not None:
            return _model_out(existing[0])
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
    job = PetVisualJob(
        pet_id=pet_id,
        model_id=model.id,
        provider=provider.name,
        status="QUEUED",
        progress=0,
        idempotency_key=body.idempotency_key,
    )
    db.add(job)
    await create_life_event(
        db, pet_id=pet_id, event_type="visual.model_generated",
        payload={"version": version, "provider": provider.name, "status": "GENERATING"},
        actor_id=user.id, source_type=enums.SourceType.OWNER_REPORTED,
    )
    await write_audit(db, action="visual_model.created", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_models", resource_id=str(model.id))
    await db.commit()
    background_tasks.add_task(_generate_background, str(model.id))
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

@router.post("/pets/{pet_id}/visual-models/{version}/retry")
async def retry_model(
    pet_id: uuid.UUID, version: int, db: DBSession, user: CurrentUser,
    background_tasks: BackgroundTasks,
) -> dict:
    """Re-queue a FAILED/CANCELLED candidate for a fresh generation attempt."""
    await _require_owner(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    job = (
        await db.execute(
            select(PetVisualJob)
            .where(PetVisualJob.model_id == m.id)
            .order_by(desc(PetVisualJob.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if job is None:
        raise NotFound("generation job not found")
    if job.status not in ("FAILED", "CANCELLED"):
        raise ValidationFailed("only failed or cancelled candidates can be retried")
    if m.status not in ("FAILED",):
        m.status = "GENERATING"
    m.failure_reason = None
    job.status = "QUEUED"
    job.progress = 0
    job.error_reason = None
    job.attempts += 1
    job.updated_at = datetime.now(UTC)
    await db.commit()
    background_tasks.add_task(_generate_background, str(m.id))
    return _model_out(m)


@router.get("/pets/{pet_id}/visual-models/{version}/job")
async def get_model_job(pet_id: uuid.UUID, version: int, db: DBSession, user: CurrentUser) -> dict:
    """Return the latest generation job status/progress for a candidate."""
    await _require_read(db, pet_id, user.id)
    m = await _get_model_or_404(db, pet_id, version)
    job = (
        await db.execute(
            select(PetVisualJob)
            .where(PetVisualJob.model_id == m.id)
            .order_by(desc(PetVisualJob.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if job is None:
        raise NotFound("generation job not found")
    return {
        "model_id": str(m.id),
        "pet_id": str(m.pet_id),
        "version": m.version,
        "provider": job.provider,
        "status": job.status,
        "progress": job.progress,
        "attempts": job.attempts,
        "error_reason": job.error_reason,
    }
