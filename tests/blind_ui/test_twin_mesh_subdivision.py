from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "scripts" / "r2p3d-r4" / "meshops.py"
SPEC = importlib.util.spec_from_file_location("pli_meshops", MODULE)
assert SPEC is not None and SPEC.loader is not None
meshops = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(meshops)


def test_linear_subdivide_preserves_open_shell_boundaries() -> None:
    # Two disconnected/touching low-poly shells model the native Corgi source:
    # their authored boundary positions must remain fixed when triangle density
    # is increased. Loop smoothing is intentionally NOT valid for this case.
    verts = np.asarray(
        [
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [1.0, 0.0, 0.0],
            [1.0, 1.0, 0.0],
            [0.0, 1.0, 0.0],
        ],
        dtype=np.float64,
    )
    faces = np.asarray([[0, 1, 2], [3, 4, 5]], dtype=np.int64)
    colors = np.ones((len(verts), 3), dtype=np.float64)

    refined_v, refined_f, refined_c = meshops.linear_subdivide(verts, faces, colors)

    assert refined_f.shape == (8, 3)
    assert refined_c is not None
    assert np.array_equal(refined_v[: len(verts)], verts)
    assert np.array_equal(refined_v.min(axis=0), verts.min(axis=0))
    assert np.array_equal(refined_v.max(axis=0), verts.max(axis=0))


def test_linear_subdivide_is_deterministic_across_repeated_passes() -> None:
    verts = np.asarray(
        [[0.0, 0.0, 0.0], [2.0, 0.0, 0.0], [0.0, 2.0, 0.0]],
        dtype=np.float64,
    )
    faces = np.asarray([[0, 1, 2]], dtype=np.int64)
    colors = np.asarray([[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])

    a_v, a_f, a_c = verts.copy(), faces.copy(), colors.copy()
    b_v, b_f, b_c = verts.copy(), faces.copy(), colors.copy()
    for _ in range(3):
        a_v, a_f, a_c = meshops.linear_subdivide(a_v, a_f, a_c)
        b_v, b_f, b_c = meshops.linear_subdivide(b_v, b_f, b_c)

    assert a_f.shape == (64, 3)
    assert np.array_equal(a_v, b_v)
    assert np.array_equal(a_f, b_f)
    assert np.array_equal(a_c, b_c)
    assert np.array_equal(a_v[: len(verts)], verts)
