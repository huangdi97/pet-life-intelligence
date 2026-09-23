"""Pet Living Model (PLM) — permission gates and shared model helpers."""

import uuid

from sqlalchemy import desc, select

from app.core.errors import NotFound, PermissionDenied
from app.domain import enums
from app.models import PetVisualModel
from app.services import permissions as perm


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
