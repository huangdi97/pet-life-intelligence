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
        front_surface = _smooth(0.05, 0.55, float(nrm[2]))
        chest = chest_front * chest_center * max(ruff_y, lower_chest_y) * front_surface
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
    """Cat painter — neutral grey shorthair with readable tabby face details.

    This remains a DEMO_TEMPLATE painter. The goal is product readability at
    owner-Hero scale, not a claim about an individual real cat. Face marks are
    geometry-anchored and front-surface gated so they cannot leak onto the
    back of the head.
    """

    coat_mid = np.array([0.62, 0.64, 0.66])
    coat_dark = np.array([0.34, 0.36, 0.39])
    coat_light = np.array([0.78, 0.79, 0.79])
    white = np.array([0.94, 0.93, 0.90])
    ear_inner = np.array([0.78, 0.62, 0.62])
    iris = np.array([0.43, 0.56, 0.36])
    pupil = np.array([0.075, 0.070, 0.065])
    nose_color = np.array([0.57, 0.38, 0.40])

    def paint(pos: np.ndarray, nrm: np.ndarray, prior: np.ndarray) -> tuple[np.ndarray, bool]:
        lum = float(np.dot(prior, np.array([0.299, 0.587, 0.114])))
        # Keep the coat genuinely neutral under the warm stage. The previous
        # beige base became dark brown after lighting/tone mapping.
        base = coat_mid * (0.93 + 0.12 * lum)
        obs = _view_observed(pos, nrm, landmarks)
        y = float(pos[1])
        z = float(pos[2])
        x = float(pos[0])

        ey = float(landmarks.get("eye_y", 1e9))
        eye_dx = float(landmarks.get("eye_dx", 0.13))
        mz = float(landmarks.get("muzzle_z", 1e9))

        # Soft tabby stripes across the top/flanks. Keep their contrast modest:
        # the face/silhouette, not a noisy procedural pattern, should dominate.
        phi = ((x * 1.9 + z * 2.6) * math.pi) / (1.0 + float(nrm[1]) * 0.6)
        stripe = math.sin(phi * 2.0) * 0.5 + 0.5
        upper = max(0.0, float(nrm[1])) * _smooth(
            0.0, 0.18, y - float(landmarks.get("belly_y", 0.18))
        )
        stripe_mask = _smooth(0.34, 0.72, stripe) * upper
        base = _blend(base, coat_dark, stripe_mask * 0.46)

        # Slightly lighter cheek/face plane so the front remains readable after
        # downsampling on Today/Pet cards.
        if mz < 1e8:
            face_front = _smooth(mz - 0.34, mz - 0.06, z) * _smooth(0.02, 0.55, float(nrm[2]))
            face_height = _smooth(ey - 0.20, ey + 0.04, y) * (
                1.0 - _smooth(ey + 0.18, ey + 0.30, y)
            )
            face_center = 1.0 - _smooth(eye_dx * 1.25, eye_dx * 2.1, abs(x))
            base = _blend(base, coat_light, face_front * face_height * face_center * 0.36)

            # White muzzle/chin: front-only, centred below the eyes.
            muzzle_center = 1.0 - _smooth(eye_dx * 0.82, eye_dx * 1.60, abs(x))
            muzzle_low = _smooth(ey - 0.28, ey - 0.15, y)
            muzzle_high = 1.0 - _smooth(ey - 0.01, ey + 0.10, y)
            muzzle = face_front * muzzle_center * muzzle_low * muzzle_high
            base = _blend(base, white, muzzle * 0.88)

        # Chest + belly white remain broad enough to survive phone framing.
        front_surface = _smooth(0.04, 0.55, float(nrm[2]))
        chest = (
            (1.0 - _smooth(0.18, 0.42, abs(x)))
            * _smooth(0.22, 0.58, y)
            * (1.0 - _smooth(0.70, 0.90, y))
            * front_surface
        )
        base = _blend(base, white, chest * 0.60)
        belly = (
            (1.0 - _smooth(0.24, 0.48, y))
            * (1.0 - _smooth(0.28, 0.65, abs(x)))
            * (1.0 - _smooth(0.55, 0.92, abs(z)))
        )
        base = _blend(base, white, belly * 0.62)

        # Inner ears: a centred fill rather than the old annulus mask.
        ear_y = float(landmarks.get("ear_y", ey + 0.18))
        ear_dx = float(landmarks.get("ear_dx", max(0.14, eye_dx * 1.25)))
        for sx in (-1.0, 1.0):
            dx = (x - sx * ear_dx) / 0.11
            dy = (y - ear_y) / 0.13
            d2 = dx * dx + dy * dy
            ear = (1.0 - _smooth(0.34, 1.45, d2)) * _smooth(0.0, 0.6, float(nrm[2]))
            base = _blend(base, ear_inner, ear * 0.72)

        # Eyes: iris and a narrower pupil, restricted to the camera-facing
        # head surface. The previous increasing*smooth mask was zero at the
        # eye centre and painted rings instead of eyes.
        if ey < 1e8 and mz < 1e8:
            eye_front = _smooth(mz - 0.30, mz - 0.04, z) * _smooth(0.02, 0.55, float(nrm[2]))
            for sx in (-1.0, 1.0):
                dx = (x - sx * eye_dx) / 0.058
                dy = (y - ey) / 0.052
                d2 = dx * dx + dy * dy
                iris_mask = (1.0 - _smooth(0.36, 1.30, d2)) * eye_front
                base = _blend(base, iris, iris_mask * 0.94)

                pdx = (x - sx * eye_dx) / 0.020
                pdy = (y - ey) / 0.041
                pupil_d2 = pdx * pdx + pdy * pdy
                pupil_mask = (1.0 - _smooth(0.28, 1.10, pupil_d2)) * eye_front
                base = _blend(base, pupil, pupil_mask * 0.98)

        # Nose: a compact centred mask at the true front of the muzzle.
        nz = float(landmarks.get("nose_z", 1e9))
        ny = float(landmarks.get("nose_y", 1e9))
        if nz < 1e8 and ny < 1e8:
            d2 = (x / 0.050) ** 2 + ((y - ny) / 0.042) ** 2 + ((z - nz) / 0.055) ** 2
            nose = 1.0 - _smooth(0.28, 1.25, d2)
            base = _blend(base, nose_color, nose * 0.96)

        # White paw tips.
        socks = 1.0 - _smooth(0.07, 0.16, y)
        base = _blend(base, white, socks * 0.62)

        # Very subtle deterministic grain; avoid the muddy brown noise that the
        # earlier palette produced under warm lighting.
        g = (_grain(pos * 1.4) - 0.5) * 0.018
        base = base + g
        return np.clip(base, 0.0, 1.0), obs

    return paint
