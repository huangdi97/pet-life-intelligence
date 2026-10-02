"""unwrap — deterministic UV atlas generation for the R4 twin bake.

Produces a real UV layout (charts + packing) for an arbitrary triangle mesh
with no UV data, then rasterizes per-pixel colors into a square atlas.

Approach:
  - faces are bucketed by their dominant normal axis (6 buckets), then
    connected components inside each bucket form UV charts (islands);
  - each island is projected onto its best-fit plane, aspect-preserved and
    packed into a grid cell of the atlas (shelf packing by area);
  - per-corner UVs are emitted; vertices shared across charts are duplicated,
    so the returned mesh is a flat indexed mesh with a 1:1 position↔uv map
    (seams only where the surface normal changes direction).

Rasterization is vectorized per-face (numpy) and O(atlas texels).
"""
from __future__ import annotations

import numpy as np

ATLAS_CELLS = 16


def _dominant_axis(n: np.ndarray) -> int:
    """Bucket id 0..5 from +x,-x,+y,-y,+z,-z facing."""
    k = int(np.argmax(np.abs(n)))
    return 2 * k + (0 if n[k] >= 0 else 1)


def _nearest_perp(n: np.ndarray) -> np.ndarray:
    """A normalized vector perpendicular to n (deterministic)."""
    axis = np.argmin(np.abs(n))
    e = np.zeros(3)
    e[axis] = 1.0
    u = np.cross(n, e)
    nrm = np.linalg.norm(u)
    return u / nrm if nrm > 1e-9 else np.array([1.0, 0.0, 0.0])


def unwrap(
    verts: np.ndarray,
    faces: np.ndarray,
    f_normals: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Return (new_verts, faces_new, uvs_new, oldidx_new).

    new_verts are unique (position, chart) pairs; faces_new indexes them;
    uvs_new in [0,1); oldidx_new maps each new vertex to the original vertex
    index (used to expand per-vertex skin weights).
    """
    F = int(faces.shape[0])
    # Union-find over faces: two faces sharing an edge belong to the same
    # chart when their normals agree (dot > cos(31deg)). This flood-charts
    # the smooth mesh like a real smart-unwrap: charts break only at creases
    # (paw/body, ear/head, leg folds) instead of at every axis bucket flip.
    parent = list(range(F))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    edge_faces: dict[tuple[int, int], list[int]] = {}
    for i in range(F):
        for k in range(3):
            a, b = int(faces[i, k]), int(faces[i, (k + 1) % 3])
            key = (min(a, b), max(a, b))
            edge_faces.setdefault(key, []).append(i)
    for li in edge_faces.values():
        if len(li) >= 2:
            a, b = li[0], li[1]
            if float(np.dot(f_normals[a], f_normals[b])) > 0.85:
                union(a, b)

    roots = np.asarray([find(i) for i in range(F)], dtype=np.int64)
    charts: dict[int, list[int]] = {}
    for i in range(F):
        charts.setdefault(int(roots[i]), []).append(i)

    # Project each chart and pack into atlas grid cells.
    new_v: list[np.ndarray] = []  # packed chart vertices only
    new_uv: list[np.ndarray] = []
    old_idx: list[int] = []
    face_new: list[list[int]] = []  # faces of processed charts only

    chart_items: list[tuple[float, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, list, list, list]] = []
    for _cid, flist in charts.items():
        nrm = f_normals[flist].mean(axis=0)
        n_len = np.linalg.norm(nrm)
        if n_len < 1e-12:
            continue
        nrm /= n_len
        u = _nearest_perp(nrm)
        v = np.cross(nrm, u)
        uv_parts: list[list[int]] = []
        pt: list[np.ndarray] = []
        for fi in flist:
            tri: list[int] = []
            for vi in faces[fi]:
                local = np.asarray([float(np.dot(verts[vi], u)), float(np.dot(verts[vi], v))])
                tri.append(len(pt))
                pt.append(local)
            uv_parts.append(tri)
        P = np.asarray(pt)
        lo = P.min(axis=0)
        span = P.max(axis=0) - lo
        area = float(span[0] * span[1])
        chart_items.append((area, nrm, u, v, lo, span, flist, uv_parts, pt))

    chart_items.sort(key=lambda t: t[0], reverse=True)

    # --- resolution-aware shelf packing -------------------------------
    # Every chart receives space proportional to its own surface size at a
    # fixed texel density (TEXELS_PER_UNIT), instead of being squeezed into a
    # fixed grid cell — big charts (body/flanks) keep real UV resolution.
    canvas = 2048.0
    pad_px = 2.0
    layout: list[tuple[int, float, float, float, float]] = []  # idx, x, y, w, h

    def shelf_place(tex_per_unit: float) -> float:
        layout.clear()
        x = 0.0
        y = 0.0
        row_h = 0.0
        for idx in range(len(chart_items)):
            _a, nrm, u, v, lo, span, flist, uv_parts, pt = chart_items[idx]
            w = span[0] * tex_per_unit + 2 * pad_px
            h = span[1] * tex_per_unit + 2 * pad_px
            if w > canvas or h > canvas:
                # a chart wider than the canvas: scale its tex density down
                f = min(canvas / w, canvas / h)
                w *= f
                h *= f
            if x + w > canvas:
                x = 0.0
                y += row_h
                row_h = 0.0
            layout.append((idx, x, y, w, h))
            x += w
            row_h = max(row_h, h)
        return y + row_h

    # Grow texel density until the shelf nearly fills the canvas, so the
    # atlas resolution actually matches the mesh's triangle density
    # (a 1e-5-unit face then owns ~10-20 px instead of <1 px).
    tex_per_unit = 100.0
    for _ in range(200):
        candidate = tex_per_unit * 1.15
        if shelf_place(candidate) > canvas:
            break
        tex_per_unit = candidate

    for idx, x0, y0, w, h in layout:
        area, nrm, u, v, lo2, span, flist, uv_parts, pt = chart_items[idx]
        scale_px = min((w - 2 * pad_px) / span[0], (h - 2 * pad_px) / span[1])
        if scale_px <= 0:
            continue
        offset_px = np.array([x0 + pad_px, y0 + pad_px], dtype=np.float64)
        # One packed slot per unique mesh vertex used by this chart; every
        # corner of a vertex shares the same projected UV, so shared vertices
        # are not duplicated within a chart (only across charts at seams).
        local_of: dict[int, int] = {}
        local_order: list[int] = []
        for _gi, fi in enumerate(flist):
            for ci in range(3):
                vi = int(faces[fi, ci])
                if vi not in local_of:
                    local_of[vi] = len(local_order)
                    local_order.append(vi)
        for vi in local_order:
            p2 = np.array([float(np.dot(verts[vi], u)), float(np.dot(verts[vi], v))])
            nur = (offset_px + (p2 - lo2) * scale_px) / canvas
            new_uv.append(nur)
            new_v.append(verts[vi])
            old_idx.append(vi)
        base_slot = len(new_v) - len(local_order)
        for _gi, fi in enumerate(flist):
            tri = [base_slot + local_of[int(faces[fi, ci])] for ci in range(3)]
            face_new.append(tri)

    V2 = np.asarray(new_v, dtype=np.float64).reshape(-1, 3)
    UV = np.asarray(new_uv, dtype=np.float64).reshape(-1, 2)
    OLD = np.asarray(old_idx, dtype=np.int64).reshape(-1)
    FN = np.asarray(face_new, dtype=np.int64).reshape(-1, 3)
    return V2, FN, UV, OLD


def paint_atlas(
    verts: np.ndarray,
    normals: np.ndarray,
    faces: np.ndarray,
    uvs: np.ndarray,
    res: int,
    paint_fn,
    vcolors: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Paint a square atlas.

    paint_fn(pos3 (3,), nrm3 (3,)) -> (rgb float [0,1]^3, observed bool).
    Returns (rgb HxWx3 float, observed HxW bool) with y=0 at atlas top.
    """
    rgb = np.full((res, res, 3), 0.5, dtype=np.float64)
    obs = np.zeros((res, res), dtype=bool)

    def edge(u0, u1, p):
        # p is the (H, W, 2) grid — use the last axis for x/y channels.
        return (u1[0] - u0[0]) * (p[..., 1] - u0[1]) - (u1[1] - u0[1]) * (p[..., 0] - u0[0])

    for fi in range(faces.shape[0]):
        i0, i1, i2 = int(faces[fi, 0]), int(faces[fi, 1]), int(faces[fi, 2])
        a, b, c = uvs[i0], uvs[i1], uvs[i2]
        lo = np.floor(np.minimum(np.minimum(a, b), c) * res).astype(np.int64)
        hi = np.ceil(np.maximum(np.maximum(a, b), c) * res).astype(np.int64)
        lo = np.maximum(lo, 0)
        hi = np.minimum(hi, res - 1)
        if lo[0] > hi[0] or lo[1] > hi[1]:
            continue
        xs = np.arange(lo[0], hi[0] + 1, dtype=np.float64) / res
        ys = np.arange(lo[1], hi[1] + 1, dtype=np.float64) / res
        X, Y = np.meshgrid(xs, ys)  # (H,W)
        P = np.stack([X, Y], axis=-1)
        e0 = edge(a, b, P)
        e1 = edge(b, c, P)
        e2 = edge(c, a, P)
        inside = ((e0 >= 0) & (e1 >= 0) & (e2 >= 0)) | ((e0 <= 0) & (e1 <= 0) & (e2 <= 0))
        if not inside.any():
            continue
        # barycentric weights (signed) for the inside pixels only
        denom = e0 + e1 + e2  # 2x signed area
        w0 = e1 / np.where(np.abs(denom) < 1e-12, 1.0, denom)
        w1 = e2 / np.where(np.abs(denom) < 1e-12, 1.0, denom)
        w2 = np.where(np.abs(denom) < 1e-12, 1.0, denom) - w0 - w1
        mask = inside & (np.abs(denom) > 1e-12)
        if not mask.any():
            continue
        pos = (w0[..., None] * verts[i0] + w1[..., None] * verts[i1] + w2[..., None] * verts[i2])
        nrm = (w0[..., None] * normals[i0] + w1[..., None] * normals[i1] + w2[..., None] * normals[i2])
        nlen = np.linalg.norm(nrm, axis=-1, keepdims=True)
        nrm = np.divide(nrm, nlen, out=nrm, where=nlen > 1e-9)
        if vcolors is not None:
            prior = (
                w0[..., None] * vcolors[i0]
                + w1[..., None] * vcolors[i1]
                + w2[..., None] * vcolors[i2]
            )
        else:
            prior = np.zeros_like(nrm)
        H, W = mask.shape
        flat = np.flatnonzero(mask)
        color_out = np.empty((flat.size, 3))
        obs_out = np.empty(flat.size, dtype=bool)
        posf = pos.reshape(-1, 3)
        nrmf = nrm.reshape(-1, 3)
        priorf = prior.reshape(-1, 3)
        for q in range(flat.size):
            idx = int(flat[q])
            col, ob = paint_fn(posf[idx], nrmf[idx], priorf[idx])
            color_out[q] = col
            obs_out[q] = ob
        rows, cols = np.unravel_index(flat, (H, W))
        rgb[lo[1] + rows, lo[0] + cols] = color_out
        obs[lo[1] + rows, lo[0] + cols] = obs_out
    return rgb, obs
