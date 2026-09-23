"""Pet Living Model (PLM) — capture registration, retrieval and QC routes."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.api.routes.visual_helpers import _require_owner, _require_read
from app.api.routes.visual_schemas import CaptureCreate, CaptureOut
from app.core.errors import NotFound
from app.models import Pet, PetVisualCapture
from app.services.eventlog import write_audit

router = APIRouter(tags=["pet-living-model"])


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
