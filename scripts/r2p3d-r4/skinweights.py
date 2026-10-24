"""skinweights — bind the R4 twin meshes to the PLI rig.

The PLI rig (packages/pet-3d/src/rig.ts) defines 16 hierarchical joint nodes
whose translations are LOCAL to their parents. We first accumulate those
translations into world-space bind positions. Each mesh vertex receives weights
for the 3 nearest bone SEGMENTS (parent->joint), computed from point-to-
segment distance, so the torso stays on the spine, thighs with the hip, etc.
A small root tie weights everything to the ground so no vertex can detach.

OUTPUT: per-vertex {joint_name: weight} top-3 dictionary, exported as JSON
for the Node GLB builder. Deterministic and mesh-agnostic.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

# Joint graph in the same order as rig.ts JointName (bind pose positions).
JOINT_SPECS: list[tuple[str, str, list[float]]] = [
    ("root", None, [0.0, 0.0, 0.0]),
    ("torso", "root", [0.0, 0.42, 0.0]),
    ("neck", "torso", [0.0, 0.34, 0.42]),
    ("head", "neck", [0.0, 0.12, 0.3]),
    ("earL", "head", [-0.22, 0.22, -0.02]),
    ("earR", "head", [0.22, 0.22, -0.02]),
    ("tail0", "torso", [0.0, 0.18, -0.52]),
    ("tail1", "tail0", [0.0, 0.08, -0.22]),
    ("shoulderFL", "torso", [-0.34, 0.02, 0.34]),
    ("kneeFL", "shoulderFL", [0.0, -0.22, 0.0]),
    ("shoulderFR", "torso", [0.34, 0.02, 0.34]),
    ("kneeFR", "shoulderFR", [0.0, -0.22, 0.0]),
    ("hipBL", "torso", [-0.36, -0.02, -0.36]),
    ("kneeBL", "hipBL", [0.0, -0.2, 0.0]),
    ("hipBR", "torso", [0.36, -0.02, -0.36]),
    ("kneeBR", "hipBR", [0.0, -0.2, 0.0]),
]

JOINT_NAMES: list[str] = [s[0] for s in JOINT_SPECS]
JOINT_PARENT: dict[str, str | None] = {name: parent for name, parent, _ in JOINT_SPECS}
JOINT_LOCAL: dict[str, np.ndarray] = {
    name: np.asarray(pos, dtype=np.float64) for name, _parent, pos in JOINT_SPECS
}

# Accumulate hierarchical local translations into the same world-space bind
# positions that glbwriter.py uses for inverse bind matrices. The previous
# implementation compared parent/child LOCAL translations as if both were
# absolute coordinates; for Doudou that incorrectly classified essentially
# the entire front/head region as "neck", causing visible component tearing.
JOINT_WORLD: dict[str, np.ndarray] = {}
for name in JOINT_NAMES:
    parent = JOINT_PARENT[name]
    local = JOINT_LOCAL[name]
    JOINT_WORLD[name] = local.copy() if parent is None else JOINT_WORLD[parent] + local

# Bone segment endpoints (parent world -> child world).
_SEGMENTS: list[tuple[int, int, np.ndarray, np.ndarray]] = []
for i, (name, parent, _pos) in enumerate(JOINT_SPECS):
    p = JOINT_WORLD[name]
    if parent is None:
        _SEGMENTS.append((i, i, p, p))  # root: point, not segment
    else:
        pid = JOINT_NAMES.index(parent)
        _SEGMENTS.append((i, pid, JOINT_WORLD[parent], p))


def _closest_point_on_segment(p: np.ndarray, a: np.ndarray, b: np.ndarray) -> np.ndarray:
    ab = b - a
    t = float(np.dot(p - a, ab) / max(1e-12, float(np.dot(ab, ab))))
    t = min(1.0, max(0.0, t))
    return a + t * ab


def compute_weights(
    verts: np.ndarray,
    scale: float = 1.0,
    top_k: int = 3,
) -> list[dict[str, float]]:
    """Per-vertex {joint: weight} top-3 (inverse squared segment distance).

    `scale` rescales the joint-space coordinates to the mesh's unit space.
    """
    V = int(verts.shape[0])
    out: list[dict[str, float]] = []
    for i in range(V):
        p = verts[i]
        dist: list[tuple[float, int]] = []
        for _j, (joint_i, _pid, a0, b0) in enumerate(_SEGMENTS):
            a = a0 * scale
            b = b0 * scale
            q = _closest_point_on_segment(p, a, b)
            d = float(np.linalg.norm(p - q))
            dist.append((d, joint_i))
        dist.sort(key=lambda t: t[0])
        best = dist[:top_k]
        total = 0.0
        ws: list[tuple[int, float]] = []
        for d, ji in best:
            w = 1.0 / (d * d + 1e-4)
            ws.append((ji, w))
            total += w
        row: dict[str, float] = {}
        for ji, w in ws:
            row[JOINT_NAMES[ji]] = round(w / total, 6)
        # root tie: guarantee the vertex never detaches (safety for anim).
        root_w = row.get("root", 0.0)
        if root_w < 0.02:
            row["root"] = 0.02
        out.append(row)
    return out


def write_weights_json(path: Path, weights: list[dict[str, float]]) -> None:
    payload = {"joints": JOINT_NAMES, "weights": weights}
    path.write_text(json.dumps(payload), encoding="utf-8")
