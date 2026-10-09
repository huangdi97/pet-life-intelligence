"""R2P3D-R1 template-local generation pipeline — individual twin edition.

Deterministic generation of PROVISIONAL candidate models. The pipeline now
consumes real media (owner uploads or the in-repo DEMO_SYNTHETIC fixtures) via
the Standard Individual Twin engine (services/twin_individual.py):

  media -> QC/segment -> frame candidates -> morph shape fitting
        -> multi-view texture projection -> surface manifest (OBSERVED/INFERRED)
        -> twin descriptor {family, morph, texture, surface, identity}

A metadata-only fallback (template family/variant + manifest) still exists for
captures whose media cannot be located yet, so the queue surface never blocks.

Honesty: this pipeline never claims a real external generative provider. It
only produces a candidate representation (template + photo texture projection)
gated by owner identity verification before activation. Provenance is recorded
per candidate (DEMO_SYNTHETIC fixtures vs owner media).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import uuid

from app.adapters.visual_provider import VisualProvider
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Artifact, Pet, PetVisualCapture, PetVisualJob, PetVisualModel
from app.services.twin_individual import build_individual_twin
from app.services.twin_media import image_quality
from app.services.storage import get_storage

GEOMETRY_VERSION = "template-v1"
RIG_VERSION = "rig-anim-v2"  # R2P3D-R1: 12-clip joint rig
PROVIDER_MODEL_VERSION = "template-v1"

# in-repo demo fixture media (DEMO_SYNTHETIC) keyed by demo pet identity
MEDIA_FIXTURES: dict[str, tuple[str, str]] = {
    "doudou": ("tests/fixtures/media/doudou-demo-dog", "dog"),
    "mimi": ("tests/fixtures/media/mimi-demo-cat", "cat"),
}


def _demo_fixture_for(pet: Pet) -> Path | None:
    """Resolve in-repo demo fixture photos for a known demo pet (or None)."""
    name = (pet.name or "").strip()
    key = None
    if name in ("豆豆", "doudou"):
        key = "doudou"
    elif name in ("咪咪", "mimi"):
        key = "mimi"
    if key is None:
        return None
    rel, _species = MEDIA_FIXTURES[key]
    root = Path(__file__).resolve().parents[4] / rel
    if root.exists():
        return root
    return None


async def _resolve_photos(db, capture: PetVisualCapture | None, pet: Pet) -> tuple[list[Path], str, list[str | None]]:
    """Materialize captured IMAGE artifacts through the storage abstraction.

    Artifact UUID is database identity, not a filesystem path. Production
    uploads use random storage keys and may live in MinIO, so the old direct
    local path lookup silently missed real owner media. Returned artifact ids
    stay index-aligned with photo paths so capture angle provenance survives.
    """
    if capture and capture.artifact_ids:
        ordered_ids: list[uuid.UUID] = []
        for raw in capture.artifact_ids[:8]:
            try:
                ordered_ids.append(uuid.UUID(str(raw)))
            except (TypeError, ValueError):
                continue
        if ordered_ids:
            rows = (
                await db.execute(
                    select(Artifact).where(
                        Artifact.id.in_(ordered_ids),
                        Artifact.pet_id == pet.id,
                        Artifact.deleted_at.is_(None),
                    )
                )
            ).scalars().all()
            by_id = {str(row.id): row for row in rows}
            storage = get_storage()
            media_root = Path(get_settings().local_upload_dir).parent / "tmp" / "twin-media" / str(capture.id)
            media_root.mkdir(parents=True, exist_ok=True)
            suffix_by_type = {
                "image/png": ".png",
                "image/jpeg": ".jpg",
                "image/webp": ".webp",
            }
            found: list[Path] = []
            found_ids: list[str | None] = []
            for raw in capture.artifact_ids[:8]:
                row = by_id.get(str(raw))
                if row is None or row.kind != "IMAGE":
                    continue
                suffix = suffix_by_type.get(row.content_type)
                if suffix is None:
                    continue
                try:
                    content = await storage.get(row.storage_key)
                except Exception:
                    continue
                target = media_root / f"{row.id}{suffix}"
                target.write_bytes(content)
                found.append(target)
                found_ids.append(str(row.id))
            if found:
                return found, "OWNER_REPORTED", found_ids

        # Demo seeded captures intentionally reference fixture identities rather
        # than persisted upload objects. Preserve that deterministic test/demo
        # path, but never label it owner media.
        fixture = _demo_fixture_for(pet)
        if fixture is not None:
            photos = sorted(fixture.glob("*.png"))
            if photos:
                return photos, "DEMO_SYNTHETIC", [None] * len(photos)

    return [], "NOT_YET_OBSERVED", []


CANONICAL_CAPTURE_ANGLES = {"front", "left", "right", "back", "full_body", "head"}


def _angle_map_for_photos(
    photos: list[Path],
    artifact_ids: list[str | None],
    capture: PetVisualCapture | None,
) -> dict[str, list[int]]:
    """Resolve semantic camera direction for each materialized photo."""
    angle_map: dict[str, list[int]] = {}
    stored = ((capture.coverage or {}).get("_angle_artifact_ids") or {}) if capture else {}
    by_artifact = {
        str(artifact_id): angle
        for angle, artifact_id in stored.items()
        if angle in CANONICAL_CAPTURE_ANGLES
    }
    for i, path in enumerate(photos):
        artifact_id = artifact_ids[i] if i < len(artifact_ids) else None
        angle = by_artifact.get(str(artifact_id)) if artifact_id else None
        if angle is None:
            stem = path.stem
            if stem == "full":
                stem = "full_body"
            angle = stem if stem in CANONICAL_CAPTURE_ANGLES else None
        if angle:
            angle_map.setdefault(angle, []).append(i)
    return angle_map


async def _build_individual(db, capture: PetVisualCapture | None, pet: Pet) -> dict[str, Any]:
    """Build the individual descriptor from actual persisted owner media."""
    photos, provenance, artifact_ids = await _resolve_photos(db, capture, pet)
    if not photos:
        from app.services.visual_pipeline_meta import metadata_only_descriptor

        return metadata_only_descriptor(pet)
    angle_map = _angle_map_for_photos(photos, artifact_ids, capture)
    tmp = Path(get_settings().local_upload_dir).parent / "tmp" / "twin-frames"
    species = "cat" if (pet.species or "").lower() == "cat" else "dog"
    result = build_individual_twin(
        photos,
        species=species,
        breed=pet.breed,
        angle_map=angle_map,
        tmp_dir=tmp,
    )
    result["provenance"] = provenance
    result["capture_angles"] = sorted(angle_map)
    return result


async def run_local_generation(
    db, provider: VisualProvider, model: PetVisualModel, pet: Pet,
    capture: PetVisualCapture | None, job: PetVisualJob,
) -> None:
    """Run deterministic candidate generation and persist the outcome.

    Records success/failure into the durable job and model rows so the async
    surface is honest even though this runs in-process on a fast path.
    """
    job.status = "GENERATING"
    job.progress = 20
    await db.commit()

    try:
        desc = await _build_individual(db, capture, pet)
        family = desc["family"]
        variant = family.split("-")[1] if "-" in family else family
        observed = {k: "photo_projection" for k in desc["surface"]["observed_regions"]}
        inferred = {k: "template_default" for k in desc["surface"]["inferred_regions"]}
        n_photos = len(desc.get("qc", []))
        zoom_texture = "photo-projection-v1" if observed else "template-default-v1"
        geometry_version = f"template-{family}-morph-v1"
        texture_version = zoom_texture

        # PROVENANCE:
        # Presentation-only candidate (GENERATED_3D). It must never be
        # promoted to a clinical fact; activation still requires owner verify.
        model.observed_surface_manifest = observed
        model.inferred_surface_manifest = inferred
        model.geometry_version = geometry_version
        model.texture_version = texture_version
        model.rig_version = RIG_VERSION
        model.provider_model_version = PROVIDER_MODEL_VERSION
        model.artifact_map = {
            "render_descriptor": family,
            "template_family": family,
            "template_variant": variant,
            "texture_source": "photo" if observed else "template_default",
            "twin_descriptor": {
                "family": family,
                "morph": desc["morph"],
                "texture": desc["texture"],
                "surface": desc["surface"],
            },
            "glb": "",
            "glb_low": "",
            "poster": "",
            "turntable": "",
        }
        model.metadata_json["opts"] = {
            "observed_photo_count": n_photos,
            "media_provenance": desc["provenance"],
            "identity": desc["identity"],
            "capture_angles": desc.get("capture_angles", []),
        }
        model.metadata_json["surface"] = {"observed": observed, "inferred": inferred}
        # Identity gate surfaces on the model for the client review screen.
        if desc["identity"].get("gate") == "NEEDS_OWNER_CONFIRMATION":
            model.identity_qc = {"gate": "NEEDS_OWNER_CONFIRMATION"}
        model.status = "READY"  # OWNER_REVIEW
        model.failure_reason = None

        job.status = "READY"
        job.progress = 100
        job.updated_at = datetime.now(timezone.utc)
        job.error_reason = None
        provider.complete(
            str(job.id),
            render_descriptor=family,
            versions={
                "provider_model_version": PROVIDER_MODEL_VERSION,
                "geometry_version": geometry_version,
                "texture_version": texture_version,
                "rig_version": RIG_VERSION,
            },
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001 - recorded into job row
        job.status = "FAILED"
        job.error_reason = f"{type(exc).__name__}: {exc}"[:200]
        job.attempts += 1
        model.status = "FAILED"
        model.failure_reason = job.error_reason
        provider.fail(str(job.id), job.error_reason)
        await db.commit()


def _qc_quality_flags(photos: list[Path]) -> dict:
    """Deterministic image-level quality flags used only by tests/QA."""
    flags: dict[str, Any] = {}
    if photos:
        q = [image_quality(p) for p in photos]
        flags = {
            "blur_scores": [x["blur_score"] for x in q],
            "exposures": [x["exposure"] for x in q],
        }
    return flags
