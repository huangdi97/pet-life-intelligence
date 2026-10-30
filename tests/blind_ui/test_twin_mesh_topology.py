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


def _boundary_stats(faces: np.ndarray) -> tuple[int, int]:
    edge_count: dict[tuple[int, int], int] = {}
    for tri in faces:
        for k in range(3):
            a = int(tri[k])
            b = int(tri[(k + 1) % 3])
            edge = (min(a, b), max(a, b))
            edge_count[edge] = edge_count.get(edge, 0) + 1
    boundary = [edge for edge, count in edge_count.items() if count == 1]
    return len(boundary), len({vertex for edge in boundary for vertex in edge})


def _read_obj_positions_faces(path: Path) -> tuple[np.ndarray, np.ndarray]:
    vertices: list[list[float]] = []
    faces: list[list[int]] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith("v "):
            vertices.append([float(value) for value in line.split()[1:4]])
        elif line.startswith("f "):
            face = [int(token.split("/")[0]) - 1 for token in line.split()[1:4]]
            faces.append(face)
    return np.asarray(vertices, dtype=np.float64), np.asarray(faces, dtype=np.int64)


def test_exact_weld_connects_duplicate_source_seam_without_face_loss() -> None:
    vertices = np.asarray(
        [
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [1.0, 0.0, 0.0],  # duplicate shared-edge endpoint
            [0.0, 1.0, 0.0],  # duplicate shared-edge endpoint
            [1.0, 1.0, 0.0],
        ],
        dtype=np.float64,
    )
    faces = np.asarray([[0, 1, 2], [3, 5, 4]], dtype=np.int64)
    welded, welded_faces, _ = meshops.weld_exact_vertices(vertices, faces)

    assert welded.shape == (4, 3)
    assert welded_faces.shape == faces.shape
    assert _boundary_stats(welded_faces) == (4, 4)


def test_boundary_preserving_loop_keeps_authored_open_outline_exact() -> None:
    vertices = np.asarray(
        [[0.0, 0.0, 0.0], [1.0, 0.0, 0.0], [1.0, 1.0, 0.0], [0.0, 1.0, 0.0]],
        dtype=np.float64,
    )
    faces = np.asarray([[0, 1, 2], [0, 2, 3]], dtype=np.int64)

    refined, refined_faces, _ = meshops.loop_subdivide(
        vertices,
        faces,
        None,
        preserve_boundary_vertices=True,
    )

    assert np.array_equal(refined[: len(vertices)], vertices)
    assert refined_faces.shape == (8, 3)


def test_native_corgi_weld_removes_conversion_duplicates_before_smoothing() -> None:
    source = (
        ROOT
        / "artifacts"
        / "r2p3d-r5"
        / "twin-sources"
        / "doudou-gobkit-corgi"
        / "Corgi.obj"
    )
    vertices, faces = _read_obj_positions_faces(source)
    before_edges, before_vertices = _boundary_stats(faces)
    welded, welded_faces, _ = meshops.weld_exact_vertices(vertices, faces)
    after_edges, after_vertices = _boundary_stats(welded_faces)

    # The Gobkit->OBJ conversion duplicates many seam vertices. Welding exact
    # positions is topology repair, not shape invention: all 508 faces remain,
    # while open-shell pressure drops enough for boundary-safe Loop smoothing.
    assert faces.shape[0] == 508
    assert welded_faces.shape[0] == faces.shape[0]
    assert welded.shape[0] < vertices.shape[0] * 0.70
    assert after_edges < before_edges * 0.25
    assert after_vertices < before_vertices * 0.30


def test_doudou_bake_preserves_native_corgi_silhouette_at_v3_density() -> None:
    source = (ROOT / "scripts" / "r2p3d-r4" / "bake_twin.py").read_text(encoding="utf-8")
    dog_block = source.split('"dog": {', 1)[1].split('"cat": {', 1)[0]
    assert '"subdiv": 3' in dog_block
    # Fresh R5.6 runtime contact sheets showed that even boundary-preserving
    # Loop moved enough interior vertices to round the native Corgi into a
    # faceted blob. Exact welding repairs conversion seams; linear refinement
    # then raises density without changing the authored silhouette.
    assert '"subdivision_mode": "linear-boundary-preserving"' in dog_block
    assert '"weld_exact_vertices": True' in dog_block


def test_mimi_bake_faces_the_canonical_front_camera() -> None:
    source = (ROOT / "scripts" / "r2p3d-r4" / "bake_twin.py").read_text(encoding="utf-8")
    cat_block = source.split('"cat": {', 1)[1].split("}", 1)[0]
    # Product camera yaw=0 observes from +Z. Fresh Android evidence shows the
    # front view without the tail and the rear view with it; the ambiguity was
    # missing face paint, not an axis reversal. Keep the verified +90° bake.
    assert '"rotate_y_deg": 90.0' in cat_block
