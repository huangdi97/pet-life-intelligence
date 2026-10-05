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
    """Dog painter — breed-readable sable + cream Corgi demo coat.

    The native Gobkit Corgi source has a single flat material, so relying on
    the source Kd makes the product Twin read as one uniform tan shape. This
    painter deliberately introduces large, low-frequency breed-readable coat
    regions (blaze / muzzle / chest-ruff / belly / socks / ear contrast)
    anchored to geometry landmarks. It remains a DEMO_TEMPLATE: none of these
    markings are claims about a real pet.
    """

    sable = np.array([0.64, 0.31, 0.12])
    sable_light = np.array([0.78, 0.43, 0.16])
    sable_deep = np.array([0.34, 0.16, 0.07])
    cream = np.array([0.95, 0.87, 0.72])
    white = np.array([0.99, 0.96, 0.88])
    ear_inner = np.array([0.76, 0.48, 0.36])
    eye_dark = np.array([0.12, 0.075, 0.045])

    def paint(pos: np.ndarray, nrm: np.ndarray, prior: np.ndarray) -> tuple[np.ndarray, bool]:
        obs = _view_observed(pos, nrm, landmarks)
        y = float(pos[1])
        z = float(pos[2])
        x = float(pos[0])
        ax = abs(x)

        ex, ey, ez = landmarks.get("eye_center", (0.0, 1.02, 0.24))
        eye_dx = max(0.08, float(landmarks.get("eye_dx", 0.18)))
        mz = float(landmarks.get("muzzle_z", 0.42))
        cz = float(landmarks.get("chest_z", 0.30))
        cy = float(landmarks.get("chest_y", 0.48))

        # Main coat: saturated warm sable instead of the previous near-uniform
        # beige. Top-facing/back-facing fur gets a modest deeper saddle while
        # side/front planes stay warm enough to read under the cream stage.
        upper = _smooth(0.42, 1.10, y)
        top_facing = max(0.0, float(nrm[1]))
        rearward = _smooth(-0.55, 0.20, -z)
        saddle = min(1.0, 0.55 * upper * top_facing + 0.32 * upper * rearward)
        base = _blend(sable_light, sable, 0.62)
        base = _blend(base, sable_deep, saddle * 0.48)

        # Central forehead blaze: a high-contrast tapered white stripe that is
        # still readable at Today-card scale. Restrict it to the front/head
        # half so it cannot paint a white stripe down the back.
        head_front = _smooth(mz - 0.58, mz - 0.10, z)
        head_height = _smooth(ey - 0.05, ey + 0.20, y)
        center = 1.0 - _smooth(0.035, 0.105, ax)
        blaze = head_front * head_height * center
        base = _blend(base, white, min(1.0, blaze * 1.08))

        # Wide cream muzzle / lower mask. This is intentionally broader than
        # the old tiny analytic ellipse: the face must remain identifiable in
        # the small Today/Pet render.
        muzzle_front = _smooth(mz - 0.28, mz - 0.035, z)
        muzzle_center = 1.0 - _smooth(eye_dx * 0.82, eye_dx * 1.48, ax)
        muzzle_y_low = _smooth(ey - 0.28, ey - 0.14, y)
        muzzle_y_high = 1.0 - _smooth(ey + 0.00, ey + 0.12, y)
        muzzle = muzzle_front * muzzle_center * muzzle_y_low * muzzle_y_high
        base = _blend(base, white, min(1.0, muzzle * 1.15))

        # Cream neck/chest bib: front-centre ruff that remains separate from
        # the sable shoulder mass. A second lower chest term carries the white
        # region down toward the belly without whitening the whole torso.
        chest_front = _smooth(cz - 0.30, cz + 0.10, z)
        chest_center = 1.0 - _smooth(0.16, 0.38, ax)
        ruff_y = _smooth(0.54, 0.72, y) * (1.0 - _smooth(0.82, 0.98, y))
        lower_chest_y = _smooth(cy - 0.30, cy - 0.06, y) * (1.0 - _smooth(cy + 0.22, cy + 0.38, y))
        front_surface = _smooth(0.05, 0.55, float(nrm[2]))\n        chest = chest_front * chest_center * max(ruff_y, lower_chest_y) * front_surface
        base = _blend(base, cream, min(1.0, chest * 0.96))

        # Belly/underside cream is low and central. It helps side/rear views
        # read as a Corgi coat rather than a uniformly brown low-poly dog.
        belly_low = 1.0 - _smooth(0.22, 0.43, y)
        belly_center = 1.0 - _smooth(0.20, 0.48, ax)
        belly_long = 1.0 - _smooth(0.58, 0.90, abs(z))
        base = _blend(base, cream, belly_low * belly_center * belly_long * 0.88)

        # Cream socks. The old 0.10-unit threshold was too small to survive
        # normal phone framing; carry the sock up roughly the lower fifth.
        socks = 1.0 - _smooth(0.10, 0.24, y)
        base = _blend(base, white, socks * 0.90)

        # Ear contrast: deepen the outer tips and warm the inner/front-facing
        # pinna. This preserves the large upright-ear silhouette visually.
        ear_band = _smooth(ey + 0.06, ey + 0.25, y)
        ear_side = _smooth(eye_dx * 0.50, eye_dx * 1.55, ax)
        ear_tip = ear_band * ear_side
        base = _blend(base, sable_deep, ear_tip * 0.38)
        ear_front = max(0.0, float(nrm[2]))
        base = _blend(base, ear_inner, ear_tip * ear_front * 0.48)

        # Eyes: slightly larger high-contrast masks than R4.2 so facial
        # expression remains legible after down-sampling. These are cosmetic
        # template features, not observed identity landmarks.
        for sx in (-1.0, 1.0):
            dx = (x - sx * eye_dx) / 0.066
            dy = (y - ey) / 0.060
            dz = (z - ez) / 0.11
            d2 = dx * dx + dy * dy + 0.35 * dz * dz
            eye = 1.0 - _smooth(0.52, 1.30, d2)
            base = _blend(base, eye_dark, eye * 0.96)

        # Nose/front muzzle punctuation. Keep the mask small and front-only so
        # it cannot become a dark band across the cream muzzle.
        nose_dx = x / 0.075
        nose_dy = (y - (ey - 0.13)) / 0.065
        nose_dz = (z - mz) / 0.075
        nose_d2 = nose_dx * nose_dx + nose_dy * nose_dy + nose_dz * nose_dz
        nose = 1.0 - _smooth(0.45, 1.45, nose_d2)
        base = _blend(base, np.array([0.12, 0.075, 0.045]), nose * 0.96)

        # Very low-amplitude deterministic grain: enough to break perfectly
        # flat paint without turning the coat muddy/noisy.
        g = (_grain(pos * 1.7) - 0.5) * 0.018
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
