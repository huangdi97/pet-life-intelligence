"""twin_individual — Standard Individual Twin pipeline (R2P3D-R1 §35/§36/§37).

Deterministic, zero-download build of an individual twin candidate from the
owner's captured media:

  1. QC/segment each photo (deterministic background-subtraction mask).
  2. frame candidates (from optional video via ffmpeg) ranked by quality.
  3. identity consistency (heuristic histogram similarity; low confidence ->
     NEEDS_OWNER_CONFIRMATION).
  4. shape fitting: morph params from silhouette aspects + owner metadata
     (species/breed as weak prior; breed is never treated as shape truth).
  5. multi-view texture projection: per-region base colors from masked photo
     pixels with view-angle weighting + exposure normalization; outputs
     baseColor + observed mask + inferred mask + coverage ratio.
  6. surface manifest: which regions are OBSERVED (from real media) vs
     INFERRED (template/default) — never the reverse.

Output is a JSON descriptor the pet-3d runtime consumes:
  { family, morph: {…}, texture: {observed: {…}, inferred: {…}},
    surface: {observed_regions, inferred_regions, coverage_ratio},
    identity: {consistency, confidence, gate} }

All numbers are engineering QA; Owner review stays the final identity gate.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.services.twin_media import (
    identity_similarity,
    image_quality,
    segment_by_background,
    silhouette_box,
)

# Region keys the runtime may colorize; template families in pet-3d share these.
OBSERVABLE_REGIONS = ("coat", "cream", "ear", "tail", "paw", "face")

# Breed -> (template family, morph priors). Breed is a WEAK prior only; the
# final shape is fitted from media silhouettes (R2P3D-R1 §29).
BREED_PRIOR = {
    "柯基": ("corgi-like", {"body_length": 1.5, "body_height": 0.82, "leg_length_front": 0.52}),
    "corgi": ("corgi-like", {"body_length": 1.5, "body_height": 0.82, "leg_length_front": 0.52}),
    "金毛": ("retriever-dog", {"body_length": 1.12, "body_height": 1.05}),
    "golden": ("retriever-dog", {"body_length": 1.12, "body_height": 1.05}),
    "柯基串": ("corgi-like", {"body_length": 1.4, "body_height": 0.85}),
    "田园": ("standard-dog", {}),
    "土狗": ("standard-dog", {}),
    "边牧": ("standard-dog", {}),
    "英短": ("standard-cat", {"body_width": 1.0, "tail_length": 1.2}),
    "美短": ("standard-cat", {}),
}

MORPH_KEYS = (
    "body_length", "body_height", "chest_width", "waist_width", "neck_length",
    "head_scale", "head_width", "muzzle_length", "ear_length", "ear_width",
    "ear_angle", "leg_length_front", "leg_length_back", "paw_scale",
    "tail_length", "tail_thickness", "tail_curve", "overall_scale",
)


# Keep backend descriptors aligned with the shared @pli/pet-3d template families.
# Media fitting may override these values, but an unobserved dimension must
# preserve its species/family prior instead of being silently reset to 1.0.
_TEMPLATE_BASE = {
    "body_length": 1.0, "body_height": 1.0, "chest_width": 1.0, "waist_width": 1.0,
    "neck_length": 1.0, "head_scale": 1.0, "head_width": 1.0, "muzzle_length": 1.0,
    "ear_length": 1.0, "ear_width": 1.0, "ear_angle": 0.0,
    "leg_length_front": 1.0, "leg_length_back": 1.0, "paw_scale": 1.0,
    "tail_length": 1.0, "tail_thickness": 1.0, "tail_curve": 0.0, "overall_scale": 1.0,
}


def _template_defaults(**overrides: float) -> dict[str, float]:
    return {**_TEMPLATE_BASE, **overrides}


TEMPLATE_MORPH_DEFAULTS: dict[str, dict[str, float]] = {
    "corgi-like": _template_defaults(
        body_length=1.5, body_height=0.82, chest_width=1.15, waist_width=0.95,
        neck_length=0.8, head_scale=1.05, head_width=1.18, muzzle_length=0.7,
        ear_length=0.85, ear_width=0.9, ear_angle=0.05,
        leg_length_front=0.52, leg_length_back=0.55, paw_scale=1.0,
        tail_length=0.45, tail_thickness=1.0, tail_curve=0.35,
    ),
    "standard-dog": _template_defaults(
        body_length=1.1, body_height=1.0, chest_width=1.0, waist_width=0.9,
        neck_length=1.15, head_scale=0.95, head_width=1.0, muzzle_length=1.1,
        ear_length=0.9, ear_width=0.9, ear_angle=0.12,
        leg_length_front=1.05, leg_length_back=1.05, paw_scale=1.0,
        tail_length=1.1, tail_thickness=0.9, tail_curve=0.2,
    ),
    "spitz-dog": _template_defaults(
        body_length=1.0, body_height=1.0, chest_width=1.05, waist_width=0.85,
        neck_length=1.0, head_scale=1.0, head_width=1.0, muzzle_length=0.9,
        ear_length=0.9, ear_width=0.8, ear_angle=0.1,
        leg_length_front=1.0, leg_length_back=1.0, paw_scale=1.0,
        tail_length=1.3, tail_thickness=1.1, tail_curve=0.45,
    ),
    "retriever-dog": _template_defaults(
        body_length=1.12, body_height=1.05, chest_width=1.18, waist_width=0.92,
        neck_length=1.05, head_scale=1.05, head_width=1.08, muzzle_length=1.15,
        ear_length=0.75, ear_width=0.85, ear_angle=0.28,
        leg_length_front=1.02, leg_length_back=1.02, paw_scale=1.05,
        tail_length=1.05, tail_thickness=0.95, tail_curve=0.18,
    ),
    "standard-cat": _template_defaults(
        body_length=1.15, body_height=0.92, chest_width=0.92, waist_width=0.8,
        neck_length=0.95, head_scale=0.95, head_width=0.95, muzzle_length=0.7,
        ear_length=1.0, ear_width=0.85, ear_angle=0.05,
        leg_length_front=0.95, leg_length_back=0.98, paw_scale=0.85,
        tail_length=1.4, tail_thickness=0.55, tail_curve=0.3,
    ),
}


def pick_template(species: str | None, breed: str | None) -> tuple[str, dict]:
    """Return (family, prior morph) — breed is only a weak prior."""
    species_l = (species or "").lower()
    breed_l = (breed or "").strip().lower()
    for key, val in BREED_PRIOR.items():
        if key.lower() in (breed_l or "") or (breed_l and key.lower() in breed_l):
            family, prior = val
            return family, dict(prior)
    if species_l == "cat":
        return "standard-cat", {}
    return "standard-dog", {}


def _hex(c: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(max(0, min(255, int(c[0]))), max(0, min(255, int(c[1]))), max(0, min(255, int(c[2]))))


def _region_color(img: Image.Image, mask: Image.Image) -> str | None:
    """Mean color of the masked (non-background) pixels, exposure-normalized."""
    rgb = img.convert("RGB")
    m = mask.convert("L").point(lambda v: 255 if v > 96 else 0)
    px = rgb.load()
    mp = m.load()
    w, h = rgb.size
    sums = [0.0, 0.0, 0.0]
    n = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if mp[x, y] > 128:
                c = px[x, y]
                for i in range(3):
                    sums[i] += c[i]
                n += 1
    if n == 0:
        return None
    mean = tuple(s / n for s in sums)
    # Soft exposure normalization toward mid-gray (avoid extremes from a
    # single over/under-exposed photo dominating the projection).
    lum = sum(mean) / 3
    if lum < 60 or lum > 200:
        scale = 128.0 / max(1.0, lum)
        mean = tuple(max(0, min(255, c * scale)) for c in mean)
    return _hex(mean)


def _region_color_zone(
    img: Image.Image,
    mask: Image.Image,
    silhouette: dict,
    rel_box: tuple[float, float, float, float],
) -> str | None:
    """Sample foreground color from a conservative silhouette-relative zone.

    This is deterministic spatial sampling, not semantic segmentation. It is
    only used when the owner explicitly supplied the matching camera angle.
    """
    if not silhouette.get("has_pet"):
        return None
    x0, y0, x1, y1 = (
        int(silhouette["x0"]), int(silhouette["y0"]),
        int(silhouette["x1"]), int(silhouette["y1"]),
    )
    width, height = max(1, x1 - x0), max(1, y1 - y0)
    rx0, ry0, rx1, ry1 = rel_box
    box = (
        max(x0, min(x1, int(x0 + width * rx0))),
        max(y0, min(y1, int(y0 + height * ry0))),
        max(x0, min(x1, int(x0 + width * rx1))),
        max(y0, min(y1, int(y0 + height * ry1))),
    )
    if box[2] <= box[0] or box[3] <= box[1]:
        return None
    zone = Image.new("L", mask.size, 0)
    zone.paste(mask.crop(box), (box[0], box[1]))
    return _region_color(img, zone)


def _fit_morph(
    silhouettes: list[dict],
    family: str,
    prior: dict,
    angle_map: dict[str, list[int]] | None = None,
) -> dict:
    """Fit observed proportions without destroying the template-family shape.

    Only BODY views influence body height / leg length. A head close-up is
    useful for surface color but must never make the pet appear stockier simply
    because a tightly cropped face has a large width/height ratio. Explicit
    left/right captures provide only a low-weight body-length correction.
    """
    morph: dict = dict(TEMPLATE_MORPH_DEFAULTS.get(family, TEMPLATE_MORPH_DEFAULTS["standard-dog"]))
    morph.update(prior)
    angle_map = angle_map or {}

    def valid_aspects(indices: list[int]) -> list[float]:
        values: list[float] = []
        for idx in indices:
            if 0 <= idx < len(silhouettes):
                sil = silhouettes[idx]
                if sil.get("has_pet") and float(sil.get("aspect") or 0) > 0:
                    values.append(float(sil["aspect"]))
        return values

    body_indices = sorted({
        idx
        for angle in ("front", "left", "right", "back", "full_body")
        for idx in (angle_map.get(angle) or [])
    })
    # Backward-compatible fallback for older captures with no semantic angle
    # bindings: use all silhouettes, but still prefer explicit body views when
    # present. New owner captures always persist angle_artifact_ids.
    body_aspects = valid_aspects(body_indices) if body_indices else [
        float(s["aspect"]) for s in silhouettes if s.get("has_pet") and float(s.get("aspect") or 0) > 0
    ]
    if body_aspects:
        ordered = sorted(body_aspects)
        median = ordered[len(ordered) // 2]
        base_height = morph["body_height"]
        base_front_leg = morph["leg_length_front"]
        base_back_leg = morph["leg_length_back"]
        # Keep family priors dominant: observed silhouette adjusts at most ~18%.
        height_factor = max(0.82, min(1.18, 1.0 + (0.9 - median) * 0.20))
        leg_factor = max(0.82, min(1.18, 1.0 + (0.95 - median) * 0.24))
        morph["body_height"] = round(base_height * height_factor, 3)
        morph["leg_length_front"] = round(base_front_leg * leg_factor, 3)
        morph["leg_length_back"] = round(base_back_leg * leg_factor, 3)

    side_indices = sorted({
        idx for angle in ("left", "right") for idx in (angle_map.get(angle) or [])
    })
    side_aspects = valid_aspects(side_indices)
    if side_aspects:
        ordered = sorted(side_aspects)
        side_median = ordered[len(ordered) // 2]
        # Side silhouette is the only deterministic 2D cue currently allowed
        # to nudge body length. Weight is deliberately small because framing
        # distance/crop are not metric-calibrated.
        length_factor = max(0.90, min(1.10, 1.0 + (side_median - 0.9) * 0.10))
        morph["body_length"] = round(morph["body_length"] * length_factor, 3)

    # Contract stays complete, but missing evidence retains the family template.
    for k in MORPH_KEYS:
        morph.setdefault(k, TEMPLATE_MORPH_DEFAULTS["standard-dog"][k])
    return morph


def _coverage_ratio(observed: set[str]) -> float:
    return round(len(observed) / len(OBSERVABLE_REGIONS), 3)


def build_individual_twin(
    photos: list[Path],
    *,
    species: str | None = None,
    breed: str | None = None,
    video_path: Path | None = None,
    angle_map: dict[str, list[int]] | None = None,
    tmp_dir: Path | None = None,
) -> dict:
    """Run the deterministic individual-twin pipeline over real media files.

    photos: paths to the owner's captured images (masked internally).
    video_path: optional short video used only for frame candidates.
    Returns the full twin descriptor + QA provenance dict (see module doc).
    """
    if not photos:
        raise ValueError("photos required (at least 1) to build an individual twin")
    family, prior = pick_template(species, breed)

    qc: list[dict] = []
    masks: list[Image.Image] = []
    binary_masks: list[Image.Image] = []
    silhouettes: list[dict] = []
    region_samples: dict[str, list[str]] = {r: [] for r in OBSERVABLE_REGIONS}

    frame_pool: list[dict] = []
    for p in photos:
        q = image_quality(p)
        seg = segment_by_background(p)
        sil = silhouette_box(seg["binary"])
        q.update({"path": p.name, "coverage": seg["coverage"], "has_pet": sil.get("has_pet", False)})
        qc.append(q)
        masks.append(seg["soft"])
        binary_masks.append(seg["binary"])
        silhouettes.append(sil)
        # Region color from the masked full image (view-angle weighting is
        # applied below by duplicating samples per covered angle).
        color = _region_color(_open(p), seg["binary"])
        if color:
            region_samples["coat"].append(color)

    if video_path and video_path.exists() and tmp_dir is not None:
        from app.services.twin_media import frame_select_from_video

        frame_pool = frame_select_from_video(video_path, tmp_dir, n_frames=4)

    # Identity consistency across the photo set (heuristic only).
    consistency: float | None = None
    if len(masks) >= 2:
        caps = [mask.convert("RGB") for mask in masks]
        scores = [identity_similarity((caps[i], caps[j])) for i in range(len(caps)) for j in range(i + 1, len(caps))]
        consistency = round(sum(scores) / max(1, len(scores)), 3)

    # View-angle weighting: photos labelled with more angles contribute more
    # samples of the observed coat color so the projection is not skewed.
    angle_map = angle_map or {}
    weighted_coat: list[str] = []
    for i in range(len(photos)):
        angles = [k for k, idxs in angle_map.items() if i in idxs]
        base = region_samples["coat"] and region_samples["coat"][min(i, len(region_samples["coat"]) - 1)]
        if base:
            weighted_coat.extend([base] * max(1, len(angles)))

    # Per-region observation is angle-gated. We only promote a surface region
    # when the owner supplied the camera view that can actually support it.
    observed: dict[str, str] = {}
    inferred: dict[str, str] = {}
    if weighted_coat:
        observed["coat"] = _median_hex(weighted_coat)

    def first_index(angle: str) -> int | None:
        values = angle_map.get(angle) or []
        idx = values[0] if values else None
        return idx if idx is not None and 0 <= idx < len(photos) else None

    head_idx = first_index("head")
    if head_idx is not None:
        img = _open(photos[head_idx])
        # Head close-up itself is explicit face evidence.
        face = _region_color(img, binary_masks[head_idx])
        if face:
            observed["face"] = face
        # Upper silhouette is the conservative ear zone for a head close-up.
        ear = _region_color_zone(
            img, binary_masks[head_idx], silhouettes[head_idx],
            (0.08, 0.00, 0.92, 0.40),
        )
        if ear:
            observed["ear"] = ear

    front_idx = first_index("front")
    full_idx = first_index("full_body")
    chest_idx = front_idx if front_idx is not None else full_idx
    if chest_idx is not None:
        img = _open(photos[chest_idx])
        cream = _region_color_zone(
            img, binary_masks[chest_idx], silhouettes[chest_idx],
            (0.28, 0.28, 0.72, 0.72),
        )
        if cream:
            observed["cream"] = cream

    if full_idx is not None:
        img = _open(photos[full_idx])
        paw = _region_color_zone(
            img, binary_masks[full_idx], silhouettes[full_idx],
            (0.08, 0.76, 0.92, 1.00),
        )
        if paw:
            observed["paw"] = paw

    # Tail stays inferred until we have a reliable tail-specific region/capture
    # rather than pretending the back/side body color is tail evidence.
    for r in OBSERVABLE_REGIONS:
        if r not in observed:
            inferred[r] = "template_default"

    morph = _fit_morph(silhouettes, family, prior, angle_map)
    observed_regions = sorted(observed)
    inferred_regions = sorted(r for r in OBSERVABLE_REGIONS if r not in observed)
    coverage_ratio = _coverage_ratio(set(observed_regions))

    # Identity gate: heuristic only, low confidence -> owner confirmation.
    identity_gate = "heuristic_only"
    if consistency is not None and consistency < 0.55:
        identity_gate = "NEEDS_OWNER_CONFIRMATION"

    return {
        "family": family,
        "morph": morph,
        "texture": {"observed": observed, "inferred": inferred},
        "surface": {
            "observed_regions": observed_regions,
            "inferred_regions": inferred_regions,
            "coverage_ratio": coverage_ratio,
        },
        "identity": {
            "consistency": consistency,
            "similarity_provider": "heuristic_histogram",
            "embedding_provider_available": False,
            "gate": identity_gate,
        },
        "qc": qc,
        "frame_candidates": frame_pool,
        "provenance": "DEMO_SYNTHETIC" if not _is_real_media(photos) else "OWNER_REPORTED",
    }


def _median_hex(samples: list[str]) -> str:
    """Median RGB across samples -> hex (simple, robust to outliers)."""
    if not samples:
        return "#E8C79A"
    from collections import defaultdict

    by = defaultdict(list)
    for s in samples:
        v = s.lstrip("#")
        by[0].append(int(v[0:2], 16))
        by[1].append(int(v[2:4], 16))
        by[2].append(int(v[4:6], 16))
    med = tuple(sorted(by[i])[len(by[i]) // 2] for i in range(3))
    return _hex(med)


def _open(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def _is_real_media(photos: list[Path]) -> bool:
    # The demo fixtures live under tests/fixtures/media; real uploads would
    # land in the configured upload dir. Provenance is honest either way.
    return any("fixtures" not in str(p) for p in photos)
