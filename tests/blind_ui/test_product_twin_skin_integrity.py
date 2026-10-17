"""No-vision integrity gate for the exact Doudou and Mimi product GLBs."""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "scripts" / "twin" / "product_twin_qa.py"
spec = importlib.util.spec_from_file_location("pli_product_skin_qa", path)
assert spec and spec.loader
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def test_shipped_twin_skin_indices_weights_and_inverse_bind_matrices() -> None:
    for pet in ("doudou", "mimi"):
        gltf, blob = qa.read_glb(ROOT / "packages" / "pet-3d" / "assets" / "twins" / f"{pet}.glb")
        errors, metrics = qa.validate_skinning_data(gltf, blob)
        assert errors == [], f"{pet}: {errors}"
        assert metrics["checkedVertices"] >= 1000
        assert metrics["maxWeightSumError"] <= 0.002
        assert metrics["maxInverseBindError"] <= 1e-4
