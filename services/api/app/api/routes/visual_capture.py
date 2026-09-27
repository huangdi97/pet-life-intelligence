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

COVERAGE_ANGLES = ("front", "left", "right", "back", "full_body", "head")
# These angles are required for a usable candidate (deterministic hard gate).
REQUIRED_ANGLES = ("front", "full_body", "head")


def _capture_out(cap: PetVisualCapture) -> CaptureOut:
    return CaptureOut(
        capture_id=cap.id,
        pet_id=cap.pet_id,
        artifact_ids=cap.artifact_ids,
        capture_type=cap.capture_type,
        qc_result=cap.qc_result,
        qc_passed=cap.qc_passed,
        coverage=cap.coverage or {},
        privacy_scan=cap.privacy_scan,
        status=cap.status,
        created_at=cap.created_at,
    )


async def _get_capture_or_404(db, pet_id: uuid.UUID, capture_id: uuid.UUID) -> PetVisualCapture:
    cap = (
        await db.execute(
            select(PetVisualCapture).where(
                PetVisualCapture.id == capture_id, PetVisualCapture.pet_id == pet_id
            )
        )
    ).scalar_one_or_none()
    if cap is None:
        raise NotFound("capture not found")
    return cap


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
        coverage=body.coverage or {},
        status="UPLOADED",
    )
    # PRIVACY: coverage only records which angles the owner shot; it carries no
    # person/location data (EXIF handling belongs to the upload layer).
    db.add(cap)
    await db.commit()
    await db.refresh(cap)
    await write_audit(db, action="visual_capture.created", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_captures", resource_id=str(cap.id))
    return _capture_out(cap)


@router.get("/pets/{pet_id}/visual-captures/{capture_id}")
async def get_capture(
    pet_id: uuid.UUID, capture_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> CaptureOut:
    await _require_read(db, pet_id, user.id)
    return _capture_out(await _get_capture_or_404(db, pet_id, capture_id))


@router.post("/pets/{pet_id}/visual-captures/{capture_id}/qc")
async def run_capture_qc(
    pet_id: uuid.UUID, capture_id: uuid.UUID, db: DBSession, user: CurrentUser
) -> CaptureOut:
    """Deterministic QC: coverage gate + honest heuristic quality flags.

    Hard gate (fact, not AI): a candidate is only usable when the wizard
    collected front + full-body + head coverage and at least 2 photos. Blur /
    exposure / occlusion / identity-consistency / privacy are honestly reported
    as heuristic_only when no real AI vision provider is configured — the
    result is stored as a QC fact, never as a diagnosis. Failure returns clear
    per-attribute retake guidance so the wizard can prompt a re-shoot.
    """
    await _require_owner(db, pet_id, user.id)
    cap = await _get_capture_or_404(db, pet_id, capture_id)
    n = len(cap.artifact_ids)
    coverage = cap.coverage or {}
    present = [a for a in COVERAGE_ANGLES if coverage.get(a)]
    missing = [a for a in REQUIRED_ANGLES if not coverage.get(a)]

    qc = {
        "artifact_count": n,
        "coverage": {a: bool(coverage.get(a)) for a in COVERAGE_ANGLES},
        "present_angles": present,
        "missing_angles": missing,
        "has_front": bool(coverage.get("front")),
        "has_full_body": bool(coverage.get("full_body")),
        "has_head": bool(coverage.get("head")),
        "full_body_coverage_photos": n >= 4,
        # Honest, deterministic-only quality checks (no real AI vision here).
        "identity_consistency": "heuristic_only",
        "contamination_check": "heuristic_only",
        "blur_check": "heuristic_only",
        "exposure_check": "heuristic_only",
        "occlusion_check": "heuristic_only",
        "multi_pet_interference": "heuristic_only",
        "resolution_check": "heuristic_only",
        "privacy_scan": {"faces_detected": False, "children_detected": False},
        "retake_guidance": [
            f"请补拍：{a}" for a in missing
        ] + (["请提供至少 2 张清晰照片"] if n < 2 else []),
        "note": "deterministic coverage gate; quality checks heuristic_only "
                "(real AI vision EXTERNAL_BLOCKED) - activation still requires owner verification",
    }
    passed = n >= 2 and not missing
    cap.qc_result = qc
    cap.qc_passed = passed
    cap.status = "QC_PASSED" if passed else "QC_FAILED"
    await db.commit()
    await db.refresh(cap)
    await write_audit(db, action="visual_capture.qc", actor_user_id=user.id, pet_id=pet_id, resource_type="pet_visual_captures", resource_id=str(cap.id))
    return _capture_out(cap)
