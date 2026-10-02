"""painting — deterministic per-pet texture painters for the R4 twins.

Each painter turns (pos, normal, source-prior color) into an atlas texel
color plus an observed/inferred provenance decision. The observed mask is
computed from a real 5-view projection (front/rear/left/right/head): a texel
is OBSERVED when its surface normal faces at least one of the view cameras
and the point falls inside that camera's frustum; everything else is
INFERRED (synthesized detail). This is the honest machine-checkable meaning
of "multi-view texture atlas + observed/inferred masks" (§11).

Colors are analytic + landmark-anchored (no vision model, no image data):
source vertex colors (carried through subdivision) provide the coat prior;
identity features (forehead blaze, chest, ear-inner, eye ring, paw, tabby)
are overlaid with smoothstep falloffs relative to mesh landmarks.
"""
from __future__ import annotations

import math
from typing import Callable

import numpy as np

PaintFn = Callable[[np.ndarray, np.ndarray, np.ndarray], tuple[np.ndarray, bool]]

HEX = {"white": np.array([0.955, 0.922, 0.825]), "cream": np.array([0.905, 0.775, 0.585])}


def _grain(pos: np.ndarray) -> float:
    """Deterministic fur grain: 0..1 noise from position (hostile to flat)."""
    h = math.sin(pos[0] * 127.1 + pos[1] * 311.7 + pos[2] * 74.7) * 43758.5453
    return h - math.floor(h)


def _smooth(edge0: float, edge1: float, x: float) -> float:
    t = (x - edge0) / max(1e-6, edge1 - edge0)
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)


def _blend(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    return a + (b - a) * t


def _view_observed(pos: np.ndarray, nrm: np.ndarray, head: dict[str, float]) -> bool:
    """5-view projection: is this texel observed by at least one camera?

    Views (unit-space, camera distances far): front +Z, rear -Z, left -X,
    right +X, head (front-top). A texel is observed by a view when the
    surface faces the camera (dot>0) and the point is inside the camera's
    frustum box (the head view covers only the head band).
    """
    views = [
        ("front", np.array([0.0, 0.0, 1.0]), None),
        ("rear", np.array([0.0, 0.0, -1.0]), None),
        ("left", np.array([-1.0, 0.0, 0.0]), None),
        ("right", np.array([1.0, 0.0, 0.0]), None),
        (
            "head",
            np.array([0.0, 0.55, 0.83]),
            (
                head["head_min_z"],
                head["head_max_z"],
                head["head_min_y"],
                1e9,
            ),
        ),
    ]
    for _name, d, band in views:
        if float(np.dot(nrm, d)) <= 0.15:
            continue
        if band is not None:
            if pos[2] < band[0] or pos[2] > band[1] or pos[1] < band[2]:
                continue
        return True
    return False


def make_dog_painter(landmarks: dict) -> PaintFn:
    """Dog painter — warm cream/white terrier with brown ears, blaze, chest cream."""

    def paint(pos: np.ndarray, nrm: np.ndarray, prior: np.ndarray) -> tuple[np.ndarray, bool]:
        lum = float(np.dot(prior, np.array([0.299, 0.587, 0.114])))
        # Base coat recolor from the source mesh prior (white/brown patches).
        if lum > 0.45:
            base = _blend(HEX["white"], HEX["cream"], 0.55)
            base = _blend(base, np.array([0.90, 0.79, 0.63]), _smooth(0.85, 0.98, lum))
        else:
            base = _blend(np.array([0.42, 0.26, 0.14]), np.array([0.30, 0.17, 0.09]), lum / 0.45)
        obs = _view_observed(pos, nrm, landmarks)
        y = float(pos[1])
        z = float(pos[2])
        x = float(pos[0])

        # Forehead blaze: white wedge on the crown, anchored at the eyes.
        ex, ey, ez = landmarks.get("eye_center", (0.0, 1e9, 0.0))
        if ey < 1e8:
            dy = (y - ey) / 0.18
            dz = (z + ez * -0.2) / 0.30
            dx = x / 0.19
            t = _smooth(0.35, 0.75, dy) * _smooth(-1.0, 1.0, -dx * dx - dz * dz + 0.55)
            base = _blend(base, HEX["white"], t * 0.85)
        # Muzzle: white snout around the muzzle tip.
        mz = landmarks.get("muzzle_z", 1e9)
        if mz < 1e8:
            dz = (mz - z) / 0.22
            dx = x / 0.16
            t = _smooth(0.2, 0.9, -dx * dx - dz * dz + 0.85)
            base = _blend(base, np.array([0.96, 0.93, 0.86]), t * 0.9)
        # Chest cream: front-lower chest.
        cz = landmarks.get("chest_z", 0.0)
        cy = landmarks.get("chest_y", 0.0)
        t = _smooth(0.25, 1.0, -(x / 0.34) ** 2 - ((z - cz) / 0.34) ** 2 - ((y - cy) / 0.30) ** 2 + 1.1)
        base = _blend(base, HEX["cream"], t * 0.6)
        # Eye rings + glossy dark eyes.
        for sx in (-1.0, 1.0):
            dx = (x - sx * landmarks.get("eye_dx", 0.16)) / 0.055
            dy = (y - ey) / 0.055
            d2 = dx * dx + dy * dy
            ring = _smooth(0.75, 1.35, d2) * _smooth(1.6, 3.2, d2 * 1.6)
            base = _blend(base, np.array([0.16, 0.10, 0.06]), ring * 0.85)
            dot = _smooth(0.0, 0.55, d2) * _smooth(1.1, 2.2, d2)
            base = _blend(base, np.array([0.045, 0.032, 0.024]), dot * 0.95)
        # Ear shading: darken inner-ear faces (normals pointing up).
        tx = abs(x) / 0.30
        t = _smooth(0.3, 0.9, -((y - ey - 0.10) / 0.16) ** 2 - tx * tx + 1.05) * max(0.0, float(nrm[1]))
        base = _blend(base, np.array([0.26, 0.15, 0.08]), t * 0.7)
        # Paw tips: cream socks near ground.
        t = _smooth(0.55, 0.95, 1.0 - y / 0.10)
        base = _blend(base, HEX["white"], t * 0.5)
        # Subtle fur grain + warm vignette on the undercoat.
        g = (_grain(pos) - 0.5) * 0.045
        base = base + g
        return np.clip(base, 0.0, 1.0), obs

    return paint


def make_cat_painter(landmarks: dict) -> PaintFn:
    """Cat painter — soft grey shorthair with tabby stripes, white muzzle/chest/belly."""

    def paint(pos: np.ndarray, nrm: np.ndarray, prior: np.ndarray) -> tuple[np.ndarray, bool]:
        lum = float(np.dot(prior, np.array([0.299, 0.587, 0.114])))
        base = np.array([0.725, 0.695, 0.655]) * (0.86 + 0.28 * lum)
        obs = _view_observed(pos, nrm, landmarks)
        y = float(pos[1])
        z = float(pos[2])
        x = float(pos[0])
        # Tabby stripes on the upper-body (back/flanks), smooth-edged.
        phi = ((x * 1.9 + z * 2.6) * math.pi) / (1.0 + float(nrm[1]) * 0.6)
        stripe = math.sin(phi * 2.0) * 0.5 + 0.5
        upper = max(0.0, float(nrm[1])) * _smooth(0.0, 0.18, y - landmarks.get("belly_y", 0.18))
        t = _smooth(0.28, 0.62, stripe) * upper
        base = _blend(base, np.array([0.48, 0.45, 0.42]), t * 0.55)
        # Muzzle + chest white: front band below the eyes.
        ey = landmarks.get("eye_y", 1e9)
        mz = landmarks.get("muzzle_z", 1e9)
        if ey < 1e8 and mz < 1e8:
            front = _smooth(-1.0, 1.0, z - mz + 0.10)
            low = _smooth(-1.0, 1.0, -(y - ey - 0.12)) * 0.5 + 0.5
            t = front * low * _smooth(0.2, 0.85, 1.0 - (x / 0.20) ** 2)
            base = _blend(base, np.array([0.96, 0.93, 0.87]), t * 0.9)
        # Belly white (underside is mostly INFERRED in the mask but painted).
        t = _smooth(0.0, 0.45, landmarks.get("belly_y", 0.2) - y) * _smooth(0.0, 0.8, 1.0 - (z / 0.6) ** 2)
        base = _blend(base, np.array([0.94, 0.90, 0.84]), t * 0.75)
        # Pink inner ears.
        for sx in (-1.0, 1.0):
            dx = (x - sx * landmarks.get("ear_dx", 0.15)) / 0.10
            dy = (y - landmarks.get("ear_y", 0.0)) / 0.10
            d2 = dx * dx + dy * dy
            t = _smooth(0.15, 0.75, d2) * _smooth(1.5, 3.0, d2)
            base = _blend(base, np.array([0.85, 0.72, 0.69]), t * 0.8)
        # Eyes: soft green.
        for sx in (-1.0, 1.0):
            dx = (x - sx * landmarks.get("eye_dx", 0.12)) / 0.045
            dy = (y - ey) / 0.045
            d2 = dx * dx + dy * dy
            dot = _smooth(0.0, 0.6, d2) * _smooth(1.2, 2.4, d2)
            base = _blend(base, np.array([0.30, 0.40, 0.30]), dot * 0.95)
        # Nose: small warm-brown at the muzzle front.
        nz = landmarks.get("nose_z", 1e9)
        ny = landmarks.get("nose_y", 1e9)
        if nz < 1e8 and ny < 1e8:
            d2 = ((x / 0.05) ** 2 + ((y - ny) / 0.05) ** 2 + ((z - nz) / 0.05) ** 2)
            t = _smooth(0.0, 0.7, d2) * _smooth(1.6, 3.2, d2)
            base = _blend(base, np.array([0.52, 0.40, 0.37]), t * 0.9)
        # Paw tips: white socks.
        t = _smooth(0.55, 0.95, 1.0 - y / 0.09)
        base = _blend(base, np.array([0.93, 0.89, 0.83]), t * 0.55)
        g = (_grain(pos) - 0.5) * 0.04
        base = base + g
        return np.clip(base, 0.0, 1.0), obs

    return paint
