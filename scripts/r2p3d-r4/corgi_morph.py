"""corgi_morph — deterministic Corgi-like morphology for the demo dou-dou twin.

Applied AFTER normalize_mesh (PLI twin unit space: height ~1.35, ground y=0,
z+ = forward/muzzle, x centered) and BEFORE unwrap+paint, so the 5-view
texture projection and the observed/inferred masks conform to the new
silhouette. Positions-only editing — topology, UV graph and skin rig are
regenerated downstream by the bake.

Design notes (WHY these choices):

- Region-aware smooth ramps, not hard shells: every transform is a per-vertex
  scalar built from smoothstep(lo, hi, coord) so adjacent regions blend
  continuously and shading weights stay well-formed.
- Height budget, not global re-normalization: after the y morphs (legs, depth,
  forehead) the mesh is scaled ON THE Y AXIS ONLY so the final height lands
  near the rig's 1.35-unit budget. A global (uniform) re-scale would cancel
  the z/x length/width gains, which is exactly what a naive "morph then
  normalize" would do. The skin rig's joint offsets are unaffected because
  the height change is < ~2%.
- Muzzle shortening is anchored to the muzzle root plane (just in front of
  the eye line), never to the back of the skull, so the nose moves back by a
  *fraction of the muzzle*, not a fraction of the whole head.

Honesty: this is a **demo Corgi-like product asset**, not a claim of the real
pet's morphology. Every factor and the measured before/after deltas are
recorded in the twin metadata for deterministic auditing.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import NamedTuple

import numpy as np

# dog material palette (derived from the source MTL Kd): [brown, eye_black,
# eye_white, white] 鈥?see bake_twin._landmarks_dog.
_EYE_BLACK = np.array([0.0, 0.0, 0.0])


class MorphMetrics(NamedTuple):
    before: dict[str, float]
    after: dict[str, float]


@dataclass
class MorphParams:
    # R4.2 targets — region-aware, silhouette-first Corgi-like proportions:
    # long low back, short legs, wide head, upright ears, short muzzle.
    body_length_scale: float = 1.30     # long Corgi back (z stretch, torso band)
    body_depth_scale: float = 1.10      # thicker chest/ribcage (y, torso band)
    chest_width_scale: float = 1.20     # wider chest (x, front torso)
    leg_height_scale: float = 0.50      # short legs (y compressed toward ground)
    head_width_scale: float = 1.28      # wider skull (Corgi cheek)
    muzzle_length_scale: float = 0.68   # shorter muzzle (nose pulled back toward root)
    forehead_raise: float = 0.09        # fuller forehead (fraction of head height)
    ear_width_scale: float = 1.40       # large upright ear pinna (x widen, ear band)
    ear_raise_scale: float = 1.18       # ear lift (y, ear cap only) — triangle read
    neck_length_scale: float = 0.92     # short thick neck (z compression)
    height_budget: float = 1.34         # final max_y target after y-only scale


_LEG_TOP_Y = 0.34       # top of the legs zone (fraction of height)
_BODY_FLOOR_Y = 0.50    # torso band lower bound (fraction of height)
_BODY_CEIL_Y = 0.80     # torso band upper bound
_HEAD_FLOOR_Y = 0.60    # head band lower bound


def _smooth(coord: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Smoothstep ramp 0 -> 1 over [lo, hi] (clamped; 0 outside)."""
    t = np.clip((coord - lo) / max(hi - lo, 1e-9), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _measure(v: np.ndarray) -> dict[str, float]:
    """Deterministic morphology measurements (twin unit space, meters)."""
    h = float(v[:, 1].max())
    ymin = float(v[:, 1].min())
    zmin = float(v[:, 2].min())
    zmax = float(v[:, 2].max())
    out = {
        "body_length": float(zmax - zmin),
        "total_height": float(h - ymin),
        "max_y": float(h),
        "body_length_ratio": float(zmax - zmin) / max(h - ymin, 1e-9),
    }
    # trunk (back) length: z span of the torso mass in the mid band — isolates
    # the "long back" stretch from the muzzle pull which shortens the nose.
    trunkband = v[(v[:, 1] > 0.50 * h) & (v[:, 1] < 0.78 * h)]
    if trunkband.shape[0] >= 4:
        out["trunk_length"] = float(np.percentile(trunkband[:, 2], 97) - np.percentile(trunkband[:, 2], 3))
        out["trunk_length_ratio"] = out["trunk_length"] / max(h - ymin, 1e-9)
    head = v[v[:, 1] > _HEAD_FLOOR_Y * h]
    if head.shape[0]:
        out["head_width"] = float(head[:, 0].max() - head[:, 0].min())
        out["head_depth"] = float(head[:, 2].max() - head[:, 2].min())
        out["head_width_ratio"] = out["head_width"] / max(h - ymin, 1e-9)
        out["muzzle_stickout"] = float(head[:, 2].max() - np.percentile(head[:, 2], 45))
        out["muzzle_stickout_ratio"] = out["muzzle_stickout"] / max(zmax - zmin, 1e-9)
    legs = v[v[:, 1] < _LEG_TOP_Y * h]
    if legs.shape[0]:
        # leg-top mass percentile: the upper edge of the leg bulk (proxy for
        # knee height above ground); compresses when the legs are shortened.
        out["leg_top_p95"] = float(np.percentile(legs[:, 1], 95))
        out["leg_top_ratio"] = out["leg_top_p95"] / max(h - ymin, 1e-9)
    trunk = v[(np.abs(v[:, 2]) < 0.25 * max(zmax - zmin, 1e-9)) & (v[:, 1] < 0.6 * h)]
    if trunk.shape[0]:
        out["belly_clearance"] = float(trunk[:, 1].min()) - ymin
        out["belly_clearance_ratio"] = out["belly_clearance"] / max(h - ymin, 1e-9)
    return out


def measure_metrics(v: np.ndarray) -> dict[str, float]:
    """Public deterministic morphology measurements (unit space, meters)."""
    return _measure(v)


def corgi_proxies(v: np.ndarray) -> dict[str, float]:
    """Deterministic Corgi silhouette proxies (machine proxy only, never a
    human breed-recognition claim). Ratios are dimensionless and recorded for
    auditing; they only support regression/plausibility gates."""
    out: dict[str, float] = {}
    h = float(v[:, 1].max())
    ymin = float(v[:, 1].min())
    height = h - ymin
    out["total_height"] = height
    body = float(v[:, 2].max() - v[:, 2].min())
    out["body_length_over_height"] = body / max(height, 1e-9)
    legs = v[v[:, 1] < 0.34 * h]
    out["leg_length_over_height"] = (
        float(np.percentile(legs[:, 1], 95)) / max(height, 1e-9) if legs.shape[0] else 0.0
    )
    head = v[v[:, 1] > 0.60 * h]
    if head.shape[0]:
        head_h = float(head[:, 1].max() - head[:, 1].min())
        out["head_width_over_head_height"] = float(head[:, 0].max() - head[:, 0].min()) / max(head_h, 1e-9)
        # ear height: ear tips vs the head-floor band (y=0.60h) — proxy for the
        # upright pinna read that a Corgi silhouette needs.
        out["ear_height_over_head_height"] = float(head[:, 1].max() - 0.60 * h) / max(head_h, 1e-9)
        out["muzzle_length_over_head_length"] = (
            float(head[:, 2].max() - np.percentile(head[:, 2], 45)) / max(head[:, 2].max() - head[:, 2].min(), 1e-9)
        )
        chest = v[(v[:, 1] < 0.6 * h) & (np.abs(v[:, 2]) < 0.35 * max(body, 1e-9))]
        chest_w = float(chest[:, 0].max() - chest[:, 0].min()) if chest.shape[0] else 0.0
        out["chest_width_over_head_width"] = chest_w / max(float(head[:, 0].max() - head[:, 0].min()), 1e-9)
    return out


def corgi_morph(
    verts: np.ndarray,
    colors: np.ndarray | None = None,
    p: MorphParams | None = None,
) -> tuple[np.ndarray, dict[str, float], dict[str, float]]:
    """Apply the Corgi-like morphology.

    Returns (verts', before, after) with metrics measured in the same unit
    space (height-budgeted), so relative deltas isolate the morphology.
    """
    p = p or MorphParams()
    v = verts.astype(np.float64, copy=True)
    before = _measure(v)
    h = float(v[:, 1].max())
    y = v[:, 1]
    z = v[:, 2]
    x = v[:, 0]
    span_z = float(v[:, 2].max()) - float(v[:, 2].min())

    # Head/muzzle anchors (robust, geometry-driven).
    head_mask = y > _HEAD_FLOOR_Y * h
    head_idx = np.flatnonzero(head_mask)
    head_z = z[head_idx]
    head_max_z = float(head_z.max()) if head_idx.size else float(z.max())
    head_min_z = float(head_z.min()) if head_idx.size else float(z.min())
    if colors is not None and colors.shape[0] == v.shape[0]:
        eye_sel = np.linalg.norm(colors - _EYE_BLACK, axis=1) < 0.30
        eye_sel &= np.abs(x) > 0.02  # exclude the nose/black-muzzle region
        eye_z = float(z[eye_sel].mean()) if np.any(eye_sel) else head_min_z + 0.55 * (head_max_z - head_min_z)
    else:
        eye_z = head_min_z + 0.55 * (head_max_z - head_min_z)
    muzzle_back = eye_z + 0.12 * (head_max_z - head_min_z)

    # --- 1. legs: short legs (whole leg smoothly squashed toward the ground; ---
    # paws stay at y=0, the squash fades into the body floor so there is no seam) ---
    leg_trans = _smooth(y, _LEG_TOP_Y * h, _BODY_FLOOR_Y * h)

    y1 = y * (p.leg_height_scale + (1.0 - p.leg_height_scale) * leg_trans)

    # --- 2. body: long back + thicker trunk + wider chest ---
    torso_y = _smooth(y, _BODY_FLOOR_Y * h, _BODY_CEIL_Y * h)
    # long-back mask: 1 over the trunk/tail, fades to 0 before the chest so the
    # head and snout are NOT pushed forward by the length stretch (Corgi back
    # grows behind the shoulders, not in the face).
    back_mask = 1.0 - _smooth(z, 0.10 * span_z, 0.55 * span_z)
    z1 = z * (1.0 + (p.body_length_scale - 1.0) * torso_y * back_mask)
    y2 = y1 * (1.0 + (p.body_depth_scale - 1.0) * _smooth(y, _BODY_FLOOR_Y * h - 0.12 * h, _BODY_CEIL_Y * h))
    chest_x = _smooth(y, 0.08 * h, 0.45 * h) * _smooth(z, -0.28 * span_z, 0.28 * span_z)
    x1 = x * (1.0 + (p.chest_width_scale - 1.0) * chest_x)

    # --- 3. head/face: wider skull + shorter muzzle + fuller forehead ---
    head_ramp = _smooth(y, _HEAD_FLOOR_Y * h, 0.72 * h)
    x2 = x1 * (1.0 + (p.head_width_scale - 1.0) * head_ramp)
    # muzzle pull: scale the distance *from the muzzle root plane*.
    muzz_ramp = _smooth(z, muzzle_back, head_max_z) * head_ramp
    z2 = z1 - (z1 - muzzle_back) * (1.0 - p.muzzle_length_scale) * muzz_ramp
    # forehead rise: on the face top (in front of the ears), clipped under the cap.
    forehead = _smooth(z, head_min_z + 0.35 * span_z, head_max_z) * _smooth(y, 0.70 * h, 0.88 * h)
    y3 = y2 + p.forehead_raise * (head_max_z - head_min_z) * forehead

    # --- 4. ears: large upright pinna (x widen + modest y lift in the ear cap) ---
    ear_z = _smooth(1.0 - (z2 - head_min_z) / max(head_max_z - head_min_z, 1e-9), 0.5, 0.15)
    ear = _smooth(y3, max(_HEAD_FLOOR_Y * h, 0.72 * h), 0.92 * h) * ear_z
    x3 = x2 * (1.0 + (p.ear_width_scale - 1.0) * ear)
    # ear lift: push the ear tip up but keep the top under the height budget.
    cap = _smooth(y3, 0.82 * h, 0.98 * h) * ear_z
    y4 = y3 + (p.ear_raise_scale - 1.0) * cap * max(h - _BODY_CEIL_Y * h, 0.05)

    # --- 5. neck: short thick neck (z compression between shoulders and skull) ---
    neck = _smooth(y4, 0.74 * h, 0.88 * h) * _smooth(z2, -0.12 * span_z, 0.10 * span_z)
    z3 = z2 * (1.0 - (1.0 - p.neck_length_scale) * neck)

    # --- Height budget: y-only scale so the rig stays aligned (< ~2% off). ---
    max_y = float(y4.max())
    y_scale = min(1.0, p.height_budget / max(max_y, 1e-9))
    y5 = y4 * y_scale

    out = v.copy()
    out[:, 0] = x3
    out[:, 1] = y5 - float(y5.min())          # re-ground at y=0
    out[:, 2] = z3
    out[:, 0] -= float(out[:, 0].min() + out[:, 0].max()) / 2.0  # re-center x
    after = _measure(out)
    return out, before, after


def metrics_delta(before: dict[str, float], after: dict[str, float]) -> dict[str, float]:
    """Relative deltas for the manifest (deterministic record of the morph)."""
    out: dict[str, float] = {}
    for k in before:
        b = before[k]
        if abs(b) > 1e-9:
            out[k + "_delta"] = (after[k] - b) / abs(b)
    return out



