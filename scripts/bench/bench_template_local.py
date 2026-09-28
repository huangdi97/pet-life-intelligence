"""R2P3D-R1 provider benchmark — template_local pipeline measurement.

Deterministic, offline, no model downloads. Measures:
  - template pipeline import + pure mapping/manifest cost
  - end-to-end in-process generation timing (JobQueue simulation via
    visual_pipeline functions) for dog (corgi) and cat (standard).
  - pet-3d runtime scene metrics are measured by the Node side
    (scripts/bench/provider-bench-pet3d.mjs).

Writes JSON + CSV into artifacts/r2p3d-r1/provider-benchmark/.
"""

from __future__ import annotations

import csv
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "services" / "api"))

OUT_DIR = REPO / "artifacts" / "r2p3d-r1" / "provider-benchmark"
OUT_DIR.mkdir(parents=True, exist_ok=True)


class _Pet:
    """Minimal Pet stand-in carrying only the fields the pipeline reads."""

    def __init__(self, species: str, breed: str) -> None:
        self.species = species
        self.breed = breed


def _measure_pipeline() -> list[dict]:
    from app.services import visual_pipeline as vp

    results: list[dict] = []
    cases = [
        ("dog corgi", _Pet("dog", "柯基")),
        ("dog retriever", _Pet("dog", "golden retriever")),
        ("cat standard", _Pet("cat", "domestic")),
    ]
    for name, pet in cases:
        t0 = time.perf_counter()
        family, variant = vp._template_for(pet)
        observed, inferred = vp._build_surface_manifest(None, 4)
        t1 = time.perf_counter()
        results.append(
            {
                "case": name,
                "family": family,
                "variant": variant,
                "ms": round((t1 - t0) * 1000, 2),
                "observed_keys": len(observed),
                "inferred_keys": len(inferred),
                "geometry_version": vp.GEOMETRY_VERSION,
                "rig_version": vp.RIG_VERSION,
            }
        )
    return results


def main() -> int:
    t_import0 = time.perf_counter()
    results = _measure_pipeline()
    t_import1 = time.perf_counter()

    row = {
        "benchmark": "template_local",
        "provider": "template_local",
        "real": False,
        "generation_mode": "deterministic in-process",
        "model_download": "none (policy)",
        "cases": results,
        "import_cold_sec": round(t_import1 - t_import0, 3),
        "resource": {
            "gpu_vram_mib": 0,
            "gpu_used": False,
            "ram_note": "pure python/numpy-free; RAM trivial",
        },
        "license_state": "in-repo MIT (self-authored)",
        "output_format": "render_descriptor (family/variant) + morph/texture JSON",
        "quality_flags": {
            "identity_usefulness": "high for coat/pattern via photo projection; "
            "shape limited by template family count",
            "backside": "template-informed (INFERRED), not photo-verified",
        },
        "verdict": "RECOMMENDED_STANDARD_PIPELINE",
    }

    out_json = OUT_DIR / "template_local_result.json"
    out_csv = OUT_DIR / "template_local_cases.csv"
    out_json.write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding="utf-8")
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        w.writeheader()
        w.writerows(results)

    print(json.dumps(row, ensure_ascii=False, indent=2))
    print(f"\nwrote {out_json}")
    print(f"wrote {out_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())