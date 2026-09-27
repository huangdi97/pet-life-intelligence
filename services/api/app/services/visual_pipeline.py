"""R.2-P3D template-local generation pipeline.

Deterministic generation of PROVISIONAL candidate models: selects a template
family/variant from the pet's species+breed, derives a surface manifest that
marks attributes projected from real photos (OBSERVED) vs completed by the
template (INFERRED), sets version metadata and a render descriptor, then moves
the model into OWNER_REVIEW (status READY).

Honesty: this pipeline never claims a real external generative provider. It
only produces a candidate representation (template + photo texture projection)
that is still gated by owner identity verification before activation.
"""

from __future__ import annotations

from app.adapters.visual_provider import VisualProvider
from app.models import Pet, PetVisualCapture, PetVisualJob, PetVisualModel

GEOMETRY_VERSION = "template-v1"
RIG_VERSION = "rig-anim-v1"
PROVIDER_MODEL_VERSION = "template-v1"

# breed -> (family, variant) for the in-repo procedural template registry
_DOG_TEMPLATES = {
    "corgi": ("spitz", "corgi"),
    "spitz": ("spitz", "spitz"),
    "samoyed": ("spitz", "spitz"),
    "pomeranian": ("spitz", "spitz"),
    "husky": ("spitz", "spitz"),
    "retriever": ("retriever", "retriever"),
    "golden retriever": ("retriever", "retriever"),
    "labrador": ("retriever", "retriever"),
    "shepherd": ("shepherd", "shepherd"),
    "german shepherd": ("shepherd", "shepherd"),
    "dachshund": ("short_leg", "dachshund"),
    "bulldog": ("brachycephalic", "bulldog"),
    "poodle": ("toy", "poodle"),
    "bichon": ("toy", "bichon"),
    "greyhound": ("sighthound", "greyhound"),
    "whippet": ("sighthound", "whippet"),
}
_CAT_TEMPLATES = {
    "short": ("cat", "standard"),
    "domestic": ("cat", "standard"),
    "dlh": ("cat", "long_hair"),
    "longhair": ("cat", "long_hair"),
    "persian": ("cat", "long_hair"),
    "munchkin": ("cat", "short_leg"),
    "siamese": ("cat", "slender"),
    "oriental": ("cat", "slender"),
}


def _template_for(pet: Pet) -> tuple[str, str]:
    """Return (family, variant) for the given pet, with a deterministic fallback."""
    species = (pet.species or "").strip().lower()
    breed = (pet.breed or "").strip().lower()
    if species == "cat":
        family, variant = _CAT_TEMPLATES.get(breed, ("cat", "standard"))
    else:
        family, variant = _DOG_TEMPLATES.get(breed, ("spitz", "dog"))
    return family, variant


def _build_surface_manifest(capture: PetVisualCapture | None, n_photos: int) -> tuple[dict, dict]:
    """Return (observed, inferred) surface manifests.

    OBSERVED attributes are only claimed when there is a photo projection basis;
    otherwise that attribute goes to INFERRED (template default). Never the
    reverse. Manifest labels stay descriptive, not clinical.
    """
    observed: dict[str, str] = {}
    if capture and n_photos >= 4:
        observed = {
            # Real photos projected onto the template; NOT photographic proof
            # of organ/health - purely surface identity.
            "coat": "photo_projection",
            "pattern": "photo_projection",
            "body": "photo_projection",
            "unique_marks": "photo_projection",
        }
    elif capture and n_photos >= 1:
        observed = {"coat": "photo_projection", "body": "photo_projection"}
    inferred = {
        "face": "template_default",
        "ears": "template_default",
        "tail": "template_default",
        "legs": "template_default",
        "head_shape": "template_default",
    }
    return observed, inferred


async def run_local_generation(
    db, provider: VisualProvider, model: PetVisualModel, pet: Pet,
    capture: PetVisualCapture | None, job: PetVisualJob,
) -> None:
    """Run deterministic candidate generation and persist the outcome.

    Records success/failure into the durable job and model rows so the async
    surface is honest even though this runs in-process on a fast path.
    """
    from datetime import datetime, timezone

    job.status = "GENERATING"
    job.progress = 20
    await db.commit()

    try:
        family, variant = _template_for(pet)
        n_photos = len(capture.artifact_ids) if capture else 0
        observed, inferred = _build_surface_manifest(capture, n_photos)
        texture_version = "photo-projection-v1" if observed else "template-default-v1"
        geometry_version = f"template-{family}-{variant}-v1"

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
            # clients resolve the descriptor via packages/pet-3d registry; a
            # future provider may replace glb/turntable URLs here.
            "render_descriptor": f"{family}/{variant}",
            "template_family": family,
            "template_variant": variant,
            "texture_source": "photo" if observed else "template_default",
            "glb": "",
            "glb_low": "",
            "poster": "",
            "turntable": "",
        }
        model.metadata_json["opts"] = {"observed_photo_count": n_photos}
        model.metadata_json["surface"] = {"observed": observed, "inferred": inferred}
        model.status = "READY"  # OWNER_REVIEW

        job.status = "READY"
        job.progress = 100
        job.updated_at = datetime.now(timezone.utc)
        provider.complete(
            str(job.id),
            render_descriptor=f"{family}/{variant}",
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
