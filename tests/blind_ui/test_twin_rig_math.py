from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "scripts" / "r2p3d-r4" / "skinweights.py"
SPEC = importlib.util.spec_from_file_location("pli_skinweights", MODULE)
assert SPEC is not None and SPEC.loader is not None
skinweights = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(skinweights)


def _dominant(point: tuple[float, float, float]) -> str:
    row = skinweights.compute_weights(np.asarray([point], dtype=np.float64))[0]
    return max(row, key=row.get)


def test_joint_world_positions_accumulate_hierarchy() -> None:
    assert np.allclose(skinweights.JOINT_WORLD["torso"], [0.0, 0.42, 0.0])
    assert np.allclose(skinweights.JOINT_WORLD["neck"], [0.0, 0.76, 0.42])
    assert np.allclose(skinweights.JOINT_WORLD["head"], [0.0, 0.88, 0.72])
    assert np.allclose(skinweights.JOINT_WORLD["shoulderFL"], [-0.34, 0.44, 0.34])
    assert np.allclose(skinweights.JOINT_WORLD["kneeFL"], [-0.34, 0.22, 0.34])
    assert np.allclose(skinweights.JOINT_WORLD["tail1"], [0.0, 0.68, -0.74])


def test_representative_vertices_bind_to_anatomical_segments() -> None:
    # Regression for the R5.6 Doudou tearing root cause: the old algorithm
    # treated local joint translations as world positions and assigned the
    # entire front/head region to neck.
    assert _dominant((0.0, 0.88, 0.72)) == "head"
    assert _dominant((-0.34, 0.44, 0.34)) == "shoulderFL"
    assert _dominant((0.34, 0.44, 0.34)) == "shoulderFR"
    assert _dominant((0.0, 0.68, -0.74)) == "tail1"
