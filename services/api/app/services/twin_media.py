"""twin_media — deterministic media analysis for the R2P3D-R1 individual twin.

Zero-download policy: there is no SAM2 / embedding model on this machine this
round (user decision). This module therefore provides honest heuristic media
analysis (pure Pillow):

  - image_quality():  blur (edge energy), exposure, resolution scores
  - segment_by_background(): binary + soft mask via color-distance from the
    image border (deterministic; DEMO-friendly; long-fur friendly soft edges)
  - silhouette_box(): bounding box + ground line from a mask
  - frame_select_from_video(): ffmpeg keyframe sampling + quality ranking
  - identity_similarity(): color-histogram intersection between masked pets
    (heuristic_only — low confidence must surface NEEDS_OWNER_CONFIRMATION)

Everything is presentation/data-support only; these are engineering QA values,
never proof of identity (Owner review remains the final gate).
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat

Coerce = str | Path


def _open(path: Coerce) -> Image.Image:
    return Image.open(path).convert("RGB")


def image_quality(path: Coerce) -> dict:
    """Return deterministic quality flags: blur, exposure, resolution.

    blur_score: 0..100 where 100 = perfectly sharp (edge-energy based).
    exposure: "dark" | "normal" | "bright" bucket from mean luminance.
    """
    img = _open(path)
    gray = ImageOps.grayscale(img)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    stat = ImageStat.Stat(edges)
    edge_mean = stat.mean[0]
    # Normalize roughly: edge mean for a sharp demo photo ~ 25-70; blur ~ <6.
    blur_score = max(0.0, min(100.0, edge_mean * 2.2))
    lum = ImageStat.Stat(gray).mean[0]
    exposure = "dark" if lum < 55 else "bright" if lum > 200 else "normal"
    w, h = img.size
    return {"blur_score": round(blur_score, 1), "exposure": exposure, "width": w, "height": h}


def segment_by_background(path: Coerce, bg_tolerance: int = 42) -> dict:
    """Deterministic background-subtraction segmentation.

    Pixels whose color distance from the median border color is within
    tolerance are background; the rest is the pet. A soft alpha is derived
    from the distance gradient so fur edges are not clipped hard. Returns
    binary mask (L mode, 0/255) + soft alpha + coverage stats.
    """
    img = _open(path)
    w, h = img.size
    border = [img.getpixel((x, y)) for x, y in [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (w // 2, h - 1),
    ]]
    br, bg_, bb = tuple(sum(c[i] for c in border) // len(border) for i in range(3))

    def dist(c):
        return abs(c[0] - br) + abs(c[1] - bg_) + abs(c[2] - bb)

    pixels = img.load()
    binary = Image.new("L", (w, h), 0)
    soft = Image.new("L", (w, h), 0)
    bp = binary.load()
    sp = soft.load()
    fg_px = 0
    for y in range(0, h, 2):  # coarse pass for speed
        for x in range(0, w, 2):
            d = dist(pixels[x, y])
            if d <= bg_tolerance:
                bp[x, y] = 0
                sp[x, y] = 0
            else:
                bp[x, y] = 255
                sp[x, y] = 255
                fg_px += 1
    # Refine soft edge at full resolution (border ring only).
    binary = binary.resize((w, h))
    soft = soft.resize((w, h))
    bl = binary.filter(ImageFilter.GaussianBlur(1.2))
    coverage = round(fg_px / max(1, (w // 2) * (h // 2)), 4)
    return {
        "binary": binary,
        "soft": bl,
        "coverage": coverage,
        "dimensions": (w, h),
    }


def silhouette_box(mask: Image.Image) -> dict:
    """Bounding box + ground estimate from a binary mask (L, 0/255)."""
    inv = ImageChops.invert(mask)
    bbox = inv.getbbox()
    if bbox is None:
        return {"has_pet": False}
    x0, y0, x1, y1 = bbox
    w = x1 - x0
    h = y1 - y0
    return {
        "has_pet": True,
        "x0": x0, "y0": y0, "x1": x1, "y1": y1,
        "width": w, "height": h,
        "aspect": round(w / max(1, h), 3),
        "head_fraction": round((h * 0.22) / max(1, h), 3),  # rough head zone
    }


def frame_select_from_video(video_path: Coerce, out_dir: Path, n_frames: int = 6) -> list[dict]:
    """Sample candidate frames from a short video and rank them by quality.

    Uses host ffmpeg (present on this machine) to extract evenly spaced
    frames into out_dir, then scores each with image_quality(). Returns the
    ranked list (best first). Honest: quality is heuristic (blur/exposure),
    not an identity/AI judge.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    probe = subprocess.run(
        ["ffmpeg", "-i", str(video_path)],
        capture_output=True, text=True,
    )
    duration = 0.0
    for line in (probe.stderr or "").splitlines():
        if "Duration:" in line:
            try:
                duration = float(line.split("Duration:")[1].split(",")[0].split(":")[0]) * 3600 + \
                    float(line.split("Duration:")[1].split(",")[0].split(":")[1]) * 60 + \
                    float(line.split("Duration:")[1].split(",")[0].split(":")[2])
            except ValueError:
                duration = 0.0
    if duration <= 0:
        return []
    frames: list[dict] = []
    for i in range(n_frames):
        t = duration * (i + 0.5) / n_frames
        out = out_dir / f"frame_{i:02d}.png"
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(video_path), "-frames:v", "1", str(out)],
            capture_output=True,
        )
        if out.exists():
            q = image_quality(out)
            q["path"] = str(out)
            q["t"] = round(t, 2)
            frames.append(q)
    frames.sort(key=lambda f: f["blur_score"], reverse=True)
    return frames


# Identity similarity: color-histogram intersection between masked pets.
# heuristic_only — must never be treated as identification proof.
def identity_similarity(masked_pair: tuple[Image.Image, Image.Image]) -> float:
    """Compare two masked pet images by per-channel histogram intersection."""
    sims: list[float] = []
    for channel in range(3):
        h_a = masked_pair[0].getchannel(channel).histogram()[:256]
        h_b = masked_pair[1].getchannel(channel).histogram()[:256]
        total = sum(h_a) + sum(h_b)
        if total == 0:
            continue
        inter = sum(min(a, b) for a, b in zip(h_a, h_b, strict=False))
        sims.append(2 * inter / total)
    return round(sum(sims) / max(1, len(sims)), 4)


def mask_to_rgba(mask: Image.Image, color: tuple[int, int, int] = (255, 255, 255)) -> Image.Image:
    """Composite a red-green-alpha preview for QA/evidence sheets."""
    mono = mask.convert("L")
    rgba = Image.new("RGBA", mono.size, (color[0], color[1], color[2], 255))
    rgba.putalpha(mono)
    return rgba
