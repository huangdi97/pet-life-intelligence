"""objio — minimal OBJ/MTL parser and writer for the R4 twin bake pipeline.

Handles: v (positions), vt (uv), vn (normals), f (faces with per-corner
indices in any of v / v/vt / v/vt/vn forms), usemtl groups, Kd colors.

The pipeline converts OBJ into flat per-corner triangle arrays:
  - verts      (V, 3)        unique positions (pre-subdivision)
  - faces      (F, 3)        vertex indices
  - face_matl  (F,)          material index per face
  - mat_names  [str]         material name list
  - mat_colors (M, 3)        Kd linear color per material (0..1)

The writer emits a flat OBJ with v/vt/vn/f (v/vt/vn form, per-corner) so it
can be re-imported losslessly by three.js OBJLoader or this parser.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

# --------------------------------------------------------------------------
# parse
# --------------------------------------------------------------------------


def parse_mtl(path: Path) -> dict[str, np.ndarray]:
    """Return {material_name: Kd(np float64 [3])}."""
    out: dict[str, np.ndarray] = {}
    cur: str | None = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = raw.split()
        if not s:
            continue
        if s[0] == "newmtl":
            cur = s[1]
        elif s[0] == "Kd" and cur is not None and len(s) >= 4:
            out[cur] = np.array([float(x) for x in s[1:4]], dtype=np.float64)
    return out


def parse_obj(
    path: Path,
    mtl_kd: dict[str, np.ndarray] | None = None,
) -> dict[str, object]:
    """Parse an OBJ into the flat-triangle dict (see module docstring)."""
    verts: list[list[float]] = []
    uvs: list[list[float]] = []
    norms: list[list[float]] = []
    faces: list[tuple[int, int, int]] = []
    face_mat: list[str | None] = []
    mat_names: list[str] = []
    cur: str | None = None
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = raw.split()
        if not s:
            continue
        head = s[0]
        if head == "v":
            verts.append([float(x) for x in s[1:4]])
        elif head == "vt":
            uvs.append([float(x) for x in s[1:3]])
        elif head == "vn":
            norms.append([float(x) for x in s[1:4]])
        elif head == "usemtl":
            cur = s[1]
            if cur not in mat_names:
                mat_names.append(cur)
        elif head == "f" and len(s) >= 4:
            idx: list[int] = []
            for tok in s[1:]:
                parts = tok.split("/")
                # OBJ indices are 1-based; negative = relative to end.
                i0 = int(parts[0])
                idx.append(i0 - 1 if i0 > 0 else len(verts) + i0)
            # Fan-triangulate any polygon (OBJ exports quads/ngons here).
            for k in range(1, len(idx) - 1):
                faces.append((idx[0], idx[k], idx[k + 1]))
                face_mat.append(cur)

    V = np.asarray(verts, dtype=np.float64).reshape(-1, 3)
    F = np.asarray(faces, dtype=np.int64).reshape(-1, 3)
    FM = np.asarray(
        [mat_names.index(m) if m in mat_names else -1 for m in face_mat],
        dtype=np.int64,
    )
    if mtl_kd is None:
        mtl_kd = {}
    mats: list[np.ndarray] = []
    for name in mat_names:
        mats.append(mtl_kd.get(name, np.array([0.72, 0.72, 0.72])))
    if len(mats) == 0:
        mats.append(np.array([0.72, 0.72, 0.72]))
    MC = np.asarray(mats, dtype=np.float64).reshape(-1, 3)

    out: dict[str, object] = {
        "verts": V,
        "faces": F,
        "face_mat": FM,
        "mat_names": mat_names,
        "mat_colors": MC,
    }
    if uvs:
        out["uvs"] = np.asarray(uvs, dtype=np.float64).reshape(-1, 2)
    if norms:
        out["norms"] = np.asarray(norms, dtype=np.float64).reshape(-1, 3)
    return out


# --------------------------------------------------------------------------
# write
# --------------------------------------------------------------------------


def write_obj(
    dest: Path,
    verts: np.ndarray,
    uvs: np.ndarray | None,
    normals: np.ndarray | None,
    faces: np.ndarray,
    matl_faces: np.ndarray | None = None,
    mat_names: list[str] | None = None,
) -> None:
    """Write a flat OBJ (v/vt/vn + f v/vt/vn per corner)."""
    lines: list[str] = []
    if mat_names:
        lines.append("mtllib %s" % dest.stem)
    for v in verts:
        lines.append("v %.6f %.6f %.6f" % (v[0], v[1], v[2]))
    if uvs is not None:
        for t in uvs:
            lines.append("vt %.6f %.6f" % (t[0], 1.0 - t[1]))
    if normals is not None:
        for n in normals:
            lines.append("vn %.6f %.6f %.6f" % (n[0], n[1], n[2]))
    cur = -1
    for i, f in enumerate(faces):
        m = int(matl_faces[i]) if matl_faces is not None else -1
        if m != cur:
            if mat_names:
                lines.append("usemtl %s" % mat_names[m])
            cur = m
        c = []
        for j in f:
            parts = [str(int(j) + 1)]
            if uvs is not None:
                parts.append(str(int(j) + 1))
            if normals is not None:
                parts.append(str(int(j) + 1))
            c.append("/".join(parts))
        lines.append("f " + " ".join(c))
    dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
