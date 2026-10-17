from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "scripts" / "r2p3d-r4" / "unwrap.py"
SPEC = importlib.util.spec_from_file_location("pli_unwrap", MODULE)
assert SPEC is not None and SPEC.loader is not None
unwrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(unwrap)


def test_atlas_barycentric_interpolation_stays_inside_triangle() -> None:
    verts = np.asarray(
        [
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
        ],
        dtype=np.float64,
    )
    normals = np.asarray([[0.0, 0.0, 1.0]] * 3, dtype=np.float64)
    faces = np.asarray([[0, 1, 2]], dtype=np.int64)
    uvs = np.asarray(
        [
            [0.10, 0.10],
            [0.90, 0.10],
            [0.10, 0.90],
        ],
        dtype=np.float64,
    )

    samples: list[tuple[float, float]] = []

    def painter(pos: np.ndarray, _nrm: np.ndarray, _prior: np.ndarray):
        x, y = float(pos[0]), float(pos[1])
        samples.append((x, y))
        assert x >= -1e-8
        assert y >= -1e-8
        assert x + y <= 1.0 + 1e-8
        return np.asarray([0.7, 0.4, 0.2]), True

    unwrap.paint_atlas(
        verts,
        normals,
        faces,
        uvs,
        32,
        painter,
        vcolors=np.zeros((3, 3), dtype=np.float64),
    )
    assert samples
