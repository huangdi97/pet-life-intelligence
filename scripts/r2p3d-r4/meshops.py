"""meshops — topology/normal/normalization helpers for the R4 twin bake.

Pure numpy implementations (no vtk/pyvista dependency — the repo venv must
stay lean):

  - face_normals / vertex_normals (area-weighted, smooth)
  - loop_subdivide: Loop subdivision with (r,g,b) per-vertex color
    attribute carried through the same weighting rules, so coat markings
    survive every refinement step
  - smooth_vertices: 1-2 umbrella relaxation passes (gentle)
  - normalize_mesh: align body axis, ground at y=0, center, scale height
  - material_region_centroids: mesh-space landmark anchors from per-vertex
    colors (head / eyes / ears / muzzle …) that the painter consumes

The subdivision face count grows ~4x per pass, so two passes on the dog
(~1.5k faces) and three on the cat (~0.4k faces) land inside the
20k–80k triangle target.
"""
from __future__ import annotations

import numpy as np


def face_normals(v: np.ndarray, f: np.ndarray) -> np.ndarray:
    """Area-weighted triangle normals (F,3), unnormalized length = 2*area."""
    a = v[f[:, 0]]
    b = v[f[:, 1]]
    c = v[f[:, 2]]
    n = np.cross(b - a, c - a)  # (F,3)
    return n


def vertex_normals(v: np.ndarray, f: np.ndarray, vcount: int) -> np.ndarray:
    """Smooth per-vertex normals (V,3): area-weighted accumulate, normalized."""
    fn = face_normals(v, f)
    norm = np.zeros((vcount, 3), dtype=np.float64)
    for k in range(3):
        np.add.at(norm, f[:, k], fn)
    lens = np.linalg.norm(norm, axis=1, keepdims=True)
    return np.divide(norm, lens, out=norm, where=lens > 1e-12)


def loop_subdivide(
    v: np.ndarray, f: np.ndarray, colors: np.ndarray | None
) -> tuple[np.ndarray, np.ndarray, np.ndarray | None]:
    """Loop subdivision (positions + optional per-vertex colors).

    Returns (v', f', colors') with the same face count x4. Interior rules:
      odd : 3/8(a+b) + 1/8(c+d)  (colors: 0.5 mix of the shared edge ends)
      even: (1-bn)·v + bn·mean(neighbors), bn of Loop's beta-n formula
    Boundary rules: 3/4 + 1/4 and 1/2(a+b) respectively.
    """
    V = v.shape[0]
    Ftot = f.shape[0]
    F3 = int(f.shape[1])
    if F3 != 3:
        raise ValueError("only triangle meshes supported")

    # Edge -> list of faces that contain it.
    edges: dict[tuple[int, int], list[int]] = {}
    for i in range(Ftot):
        for k in range(3):
            a, b = int(f[i, k]), int(f[i, (k + 1) % 3])
            key = (min(a, b), max(a, b))
            edges.setdefault(key, []).append(i)

    # Vertex -> neighbor edges (for even-vertex weighting).
    vnei: dict[int, list[int]] = {}
    for (a, b) in edges:
        vnei.setdefault(a, []).append(b)
        vnei.setdefault(b, []).append(a)

    def even_pos(idx: int) -> np.ndarray:
        nb = vnei.get(idx, [])
        nb = [n for n in nb if n != idx]
        if not nb:
            return v[idx].copy()
        # boundary: valence-2 on an open boundary uses the 3/4,1/4 rule
        # (we cannot distinguish open edges cheaply; interior-only meshes
        # dominate, so use the interior beta formula for everyone).
        n = len(nb)
        beta = (1.0 / n) * (5.0 / 8.0 - (3.0 / 8.0 + (1.0 / 4.0) * np.cos(2 * np.pi / n)) ** 2)
        return (1.0 - beta) * v[idx] + beta * np.mean(v[nb], axis=0)

    def odd_pos(a: int, b: int, c: int, d: int) -> np.ndarray:
        return 3.0 / 8.0 * (v[a] + v[b]) + 1.0 / 8.0 * (v[c] + v[d])

    n_odd = len(edges)
    if colors is None:
        cnew = None
    else:
        cnew = np.empty((V + n_odd, 3), dtype=np.float64)

    # New vertex ids: original vertices 0..V-1 stay, midpoints appended.
    midpoint: dict[tuple[int, int], int] = {}
    next_id = int(V)
    v_list: list[np.ndarray] = [v[i].copy() for i in range(V)]

    def even_col(idx: int) -> np.ndarray | None:
        if colors is None:
            return None
        nb = vnei.get(idx, [])
        nb = [n for n in nb if n != idx]
        if not nb:
            return colors[idx].copy()
        return 0.5 * colors[idx] + 0.5 * np.mean(colors[nb], axis=0)

    def odd_col(a: int, b: int) -> np.ndarray | None:
        if colors is None:
            return None
        return 0.5 * (colors[a] + colors[b])

    # Even vertices: recompute positions & colors.
    for idx in range(V):
        v_list[idx] = even_pos(idx)
        if colors is not None and cnew is not None:
            cnew[idx] = even_col(idx)

    # Odd vertices: one per edge (shared across adjacent faces).
    for (a, b) in edges:
        mid = np.zeros(3, dtype=np.float64)
        if colors is not None and cnew is not None:
            cnew[next_id] = odd_col(a, b)
        others: list[np.ndarray] = []
        for fi in edges[(a, b)]:
            tri = f[fi]
            for x in tri:
                if int(x) not in (a, b):
                    others.append(v[int(x)])
        if len(others) >= 2:
            o0, o1 = others[0], others[1]
            mid: np.ndarray = 3.0 / 8.0 * (v[a] + v[b]) + 1.0 / 8.0 * (o0 + o1)
        else:
            # Boundary edge (open surface, e.g. ear tips / eye sockets):
            # Loop's boundary odd-vertex rule is the edge midpoint.
            mid = 0.5 * (v[a] + v[b])
        v_list.append(mid)
        midpoint[(a, b)] = next_id
        next_id += 1

    # Rebuild faces: each triangle -> 4 subtriangles.
    new_faces: list[list[int]] = []
    for i in range(Ftot):
        i0, i1, i2 = int(f[i, 0]), int(f[i, 1]), int(f[i, 2])
        e01 = midpoint[(min(i0, i1), max(i0, i1))]
        e12 = midpoint[(min(i1, i2), max(i1, i2))]
        e20 = midpoint[(min(i2, i0), max(i2, i0))]
        new_faces.append([i0, e01, e20])
        new_faces.append([i1, e12, e01])
        new_faces.append([i2, e20, e12])
        new_faces.append([e01, e12, e20])

    return np.asarray(v_list, dtype=np.float64), np.asarray(new_faces, dtype=np.int64), cnew


def smooth_vertices(
    v: np.ndarray,
    f: np.ndarray,
    iterations: int = 1,
    lam: float = 0.2,
) -> np.ndarray:
    """Umbrella relaxation that preserves hard silhouettes (small lambda)."""
    out = v.copy()
    adj: dict[int, list[int]] = {}
    for fi in f:
        for k in range(3):
            a, b = int(fi[k]), int(fi[(k + 1) % 3])
            adj.setdefault(a, []).append(b)
            adj.setdefault(b, []).append(a)
    for _ in range(iterations):
        target = out.copy()
        for i, nbs in adj.items():
            target[i] += lam * (np.mean(out[nbs], axis=0) - out[i])
        out = target
    return out


def normalize_mesh(
    v: np.ndarray,
    target_height: float,
    rotate_y_deg: float = 0.0,
) -> tuple[np.ndarray, dict[str, float]]:
    """Align + scale a mesh into PLI twin unit space.

    Returns (verts, m) where m records the normalize transform for QA.
    """
    verts = v.astype(np.float64, copy=True)
    if rotate_y_deg:
        a = np.deg2rad(rotate_y_deg)
        ca, sa = np.cos(a), np.sin(a)
        x, _, z = verts[:, 0], verts[:, 1], verts[:, 2]
        verts[:, 0] = x * ca + z * sa
        verts[:, 2] = -x * sa + z * ca
    lo = verts.min(axis=0)
    hi = verts.max(axis=0)
    h = hi[1] - lo[1]
    s = target_height / h if h > 1e-9 else 1.0
    verts = (verts - np.array([0.0, lo[1], 0.0])) * s
    cx = (verts[:, 0].max() + verts[:, 0].min()) / 2.0
    cz = (verts[:, 2].max() + verts[:, 2].min()) / 2.0
    verts[:, 0] -= cx
    verts[:, 2] -= cz
    m = {
        "scale": float(s),
        "translate_y_min": float(lo[1]),
        "height": float(verts[:, 1].max() - verts[:, 1].min()),
        "rotate_y_deg": float(rotate_y_deg),
    }
    return verts, m


def material_region_centroids(
    positions: np.ndarray,
    colors: np.ndarray,
    palette: list[np.ndarray],
) -> list[list[float]]:
    """Nearest-palette-label per vertex, then color-region position centroids.

    Returns one centroid [x, y, z] (or [nan]*3 when absent) per palette slot.
    Call AFTER normalize_mesh on positions + colors so anchors live in twin
    unit space (painter landmark consumption).
    """
    if colors is None or int(colors.shape[0]) == 0:
        return [[float("nan"), float("nan"), float("nan")] for _ in palette]
    P = np.asarray(palette, dtype=np.float64)
    d = np.linalg.norm(colors[:, None, :] - P[None, :, :], axis=2)  # (V,M)
    label = d.argmin(axis=1)
    out: list[list[float]] = []
    for m in range(P.shape[0]):
        sel = np.flatnonzero(label == m)
        if sel.size == 0:
            out.append([float("nan"), float("nan"), float("nan")])
        else:
            out.append([float(c) for c in positions[sel].mean(axis=0)])
    return out
