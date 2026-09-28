"""visual_pipeline_meta — metadata-only twin descriptor fallback.

When a capture has no resolvable media (no uploads and no demo fixture for
this pet), the generation job still completes honestly into OWNER_REVIEW with
a template-family descriptor and no observed surface regions — so the queue
surface never blocks and the review screen shows "外观由模板默认生成（无照片）".

The descriptor shape is identical to the media-driven path
(services/twin_individual.build_individual_twin()) so clients can render
either without branching.
"""

from __future__ import annotations

from typing import Any

from app.models import Pet
from app.services.twin_individual import MORPH_KEYS, pick_template

OBSERVABLE_REGIONS = ("coat", "cream", "ear", "tail", "paw", "face")


def metadata_only_descriptor(pet: Pet, n_photos_hint: int = 0) -> dict[str, Any]:
    """Return a template-only descriptor (all regions INFERRED)."""
    family, prior = pick_template(pet.species, pet.breed)
    morph: dict[str, float] = {}
    for k in MORPH_KEYS:
        morph[k] = float(prior.get(k, 1.0))
    morph.setdefault("overall_scale", 1.0)
    inferred: dict[str, str] = {r: "template_default" for r in OBSERVABLE_REGIONS}
    return {
        "family": family,
        "morph": morph,
        "texture": {"observed": {}, "inferred": inferred},
        "surface": {
            "observed_regions": [],
            "inferred_regions": list(OBSERVABLE_REGIONS),
            "coverage_ratio": 0.0,
        },
        "identity": {
            "consistency": None,
            "similarity_provider": "none",
            "embedding_provider_available": False,
            "gate": "heuristic_only",
        },
        "qc": [{"path": "(no media)", "has_pet": False}] if n_photos_hint == 0 else [],
        "frame_candidates": [],
        "provenance": "NOT_YET_OBSERVED",
    }
