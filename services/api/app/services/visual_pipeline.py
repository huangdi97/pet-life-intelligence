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

from app.adapters.visual_provider import VisualProvider
from app.models import Pet, PetVisualCapture, PetVisualJob, PetVisualModel
from app.services.twin_individual import build_individual_twin
from app.services.twin_media import image_quality

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


def _resolve_photos(capture: PetVisualCapture | None, pet: Pet) -> tuple[list[Path], str]:
    """Return (photo files, provenance) for the media pipeline.

    Own uploads (real files under local_upload_dir keyed by artifact id) are
    preferred; if none can be located, the in-repo DEMO_SYNTHETIC fixtures are
    used for known demo pets. Provenance is recorded accordingly so the
    candidate is never silently promoted to real-pet validation.
    """
    if capture and capture.artifact_ids:
        from app.core.config import get_settings

        upload_root = Path(get_settings().local_upload_dir)
        found: list[Path] = []
        for aid in capture.artifact_ids[:8]:
            p = upload_root / aid
            if p.exists() and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                found.append(p)
        if found:
            return found, "OWNER_REPORTED"
        # Capture exists but its artifact ids did not resolve to files on this
        # machine. For known demo pets we fall back to the in-repo
        # DEMO_SYNTHETIC fixture media so the individual twin actually runs.
        fixture = _demo_fixture_for(pet)
        if fixture is not None:
            photos = sorted(fixture.glob("*.png"))
            if photos:
                return photos, "DEMO_SYNTHETIC"
    # No capture at all -> metadata-only template descriptor (no photos).
    return [], "NOT_YET_OBSERVED"


def _build_individual(capture: PetVisualCapture | None, pet: Pet) -> dict[str, Any]:
    """Run the deterministic individual twin engine over resolved media.

    Falls back to a metadata-only descriptor when no photo is available, so
    the generation job still completes honestly into OWNER_REVIEW.
    """
    photos, provenance = _resolve_photos(capture, pet)
    if not photos:
        from app.services.visual_pipeline_meta import metadata_only_descriptor

        return metadata_only_descriptor(pet)
    angle_map: dict[str, list[int]] = {}
    for i, p in enumerate(photos):
        angle_map.setdefault(p.stem, []).append(i)
    from app.core.config import get_settings

    tmp = Path(get_settings().local_upload_dir).parent / "tmp" / "twin-frames"
    species = "cat" if (pet.species or "").lower() == "cat" else "dog"
    return build_individual_twin(
        photos,
        species=species,
        breed=pet.breed,
        angle_map=angle_map,
        tmp_dir=tmp,
    )


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
        desc = _build_individual(capture, pet)
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
