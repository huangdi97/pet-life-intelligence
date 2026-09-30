"""pixel_oracle.py — non-AI pixel statistics for blind UI acceptance.

Only classical image operators (PIL + numpy). Never a vision model.
Answers: warm/cool balance, white-card dominance, edge density, center
contrast, mean luma, and deterministic SSIM / pHash negative distance vs a
known-bad baseline. It never judges aesthetics.

Usage:
  python scripts/blind-ui/pixel_oracle.py <image.png> [--baseline <known-bad.png>]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

WARM_CREAM = np.array([0xF9, 0xF2, 0xE4], dtype=np.float64)
WARM_NEUTRAL = np.array([0xED, 0xE1, 0xCC], dtype=np.float64)
WARM_CHARCOAL = np.array([0x17, 0x13, 0x10], dtype=np.float64)
TWIN_ACCENT = np.array([0xBF, 0xE6, 0xEC], dtype=np.float64)


def _to_rgb(img: Image.Image) -> np.ndarray:
    if img.mode != "RGB":
        img = img.convert("RGB")
    return np.asarray(img, dtype=np.float64)


def _luma(rgb: np.ndarray) -> np.ndarray:
    return (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]) / 255.0


def _warm_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    ratio_warm = (r - b) / (r + 1.0) > 0.03
    cream = (np.abs(r - WARM_CREAM[0]) + np.abs(g - WARM_CREAM[1]) + np.abs(b - WARM_CREAM[2])) < 24
    neutral = (np.abs(r - WARM_NEUTRAL[0]) + np.abs(g - WARM_NEUTRAL[1]) + np.abs(b - WARM_NEUTRAL[2])) < 24
    charcoal = (np.abs(r - WARM_CHARCOAL[0]) + np.abs(g - WARM_CHARCOAL[1]) + np.abs(b - WARM_CHARCOAL[2])) < 40
    return (ratio_warm | cream | neutral | charcoal).astype(bool)


def _cool_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cool = (b > r) & ((b - r) / (b + 1.0) > 0.05)
    accent = (np.abs(r - TWIN_ACCENT[0]) + np.abs(g - TWIN_ACCENT[1]) + np.abs(b - TWIN_ACCENT[2])) < 60
    return (cool | accent).astype(bool)


def _light_card_mask(rgb: np.ndarray) -> np.ndarray:
    """Near-pure-white surfaces (cards): every channel > 245 with low saturation."""
    mx = rgb.max(axis=-1) / 255.0
    mn = rgb.min(axis=-1) / 255.0
    sat = np.where(mx + 1e-9 > 0, (mx - mn) / (mx + 1e-9), 0)
    return ((mn > 245.0 / 255.0) & (sat < 0.08)).astype(bool)


def _sobel_magnitude(gray: np.ndarray) -> np.ndarray:
    gy, gx = np.gradient(gray)
    return np.sqrt(gx * gx + gy * gy)


def compute_pixel_stats(path: Path) -> dict:
    img = Image.open(path)
    rgb = _to_rgb(img)
    h, w = rgb.shape[:2]
    lum = _luma(rgb)
    warm = _warm_mask(rgb)
    cool = _cool_mask(rgb)
    light = _light_card_mask(rgb)
    edges = _sobel_magnitude(lum)
    edge_density = float(np.mean(edges > 0.12))
    center = rgb[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4]
    center_lum = _luma(center)
    center_contrast = float(np.std(center_lum) / (np.mean(center_lum) + 1e-9))
    return {
        "width": w,
        "height": h,
        "mean_luma": round(float(lum.mean()), 4),
        "warm_pixel_ratio": round(float(warm.mean()), 4),
        "cool_accent_ratio": round(float(cool.mean()), 4),
        "white_surface_ratio": round(float(light.mean()), 4),
        "dark_surface_ratio": round(float((lum < 0.18).mean()), 4),
        "edge_density": round(edge_density, 4),
        "center_contrast": round(center_contrast, 4),
        "phash": _phash(img),
        "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16],
    }


def _phash(img: Image.Image, size: int = 16) -> str:
    small = img.convert("L").resize((size, size), Image.LANCZOS)
    arr = np.asarray(small, dtype=np.float64)
    arr -= arr.mean()
    dct = np.fft.fft2(arr)
    dct = np.real(dct)[:8, :8]
    med = np.median(dct)
    bits = (dct > med).astype(int).flatten()
    return "".join(str(b) for b in bits)


def hamming(a: str, b: str) -> int:
    return sum(x != y for x, y in zip(a, b, strict=True))


def ssim(a: np.ndarray, b: np.ndarray) -> float:
    """SSIM on luma inputs in [0,1]; data range L = 1."""
    if a.shape != b.shape:
        return 0.0
    c1, c2 = 0.01**2, 0.03**2
    mu1, mu2 = a.mean(), b.mean()
    s1, s2 = a.var(), b.var()
    s12 = ((a - mu1) * (b - mu2)).mean()
    return float((2 * mu1 * mu2 + c1) * (2 * s12 + c2) / ((mu1**2 + mu2**2 + c1) * (s1 + s2 + c2) + 1e-9))


def negative_distance(candidate: Path, baseline: Path) -> dict:
    ca = _to_rgb(Image.open(candidate))
    ba = _to_rgb(Image.open(baseline))
    if ca.shape != ba.shape:
        ba = np.asarray(Image.open(baseline).resize((ca.shape[1], ca.shape[0]), Image.LANCZOS), dtype=np.float64)
    sc = _luma(ca)
    sb = _luma(ba)
    return {
        "ssim": round(ssim(sc, sb), 4),
        "phash_hamming": hamming(_phash(Image.open(candidate)), _phash(Image.open(baseline))),
        "mse": round(float(np.mean((sc - sb) ** 2)), 4),
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="non-AI pixel statistics")
    ap.add_argument("image", type=Path)
    ap.add_argument("--baseline", type=Path, default=None)
    ap.add_argument("--out", type=Path, default=None)
    args = ap.parse_args(argv)
    stats = compute_pixel_stats(args.image)
    if args.baseline:
        stats["negative_distance"] = negative_distance(args.image, args.baseline)
    text = json.dumps(stats, ensure_ascii=False, indent=2)
    if args.out:
        args.out.write_text(text, encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
