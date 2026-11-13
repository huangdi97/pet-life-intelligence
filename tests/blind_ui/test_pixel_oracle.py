"""Pixel oracle: classical statistics only. Synthetic images prove the
classifier thresholds and the SSIM distance functions."""
from __future__ import annotations

import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from pixel_oracle import compute_pixel_stats, near_identical, negative_distance, pixel_regions, ssim


def _make(size: tuple[int, int], color: tuple[int, int, int]) -> Path:
    img = Image.new("RGB", size, color)
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name)
    return Path(tmp.name)


def test_warm_cream_image_is_warm() -> None:
    stats = compute_pixel_stats(_make((120, 120), (0xF6, 0xF1, 0xE9)))
    assert stats["warm_pixel_ratio"] >= 0.95
    assert stats["cool_accent_ratio"] < 0.05
    assert stats["white_surface_ratio"] < 0.5


def test_cool_blue_image_is_cool() -> None:
    stats = compute_pixel_stats(_make((120, 120), (0x4A, 0x90, 0xC0)))
    assert stats["cool_accent_ratio"] > 0.9


def test_white_image_is_light_card() -> None:
    stats = compute_pixel_stats(_make((120, 120), (0xFF, 0xFF, 0xFF)))
    assert stats["white_surface_ratio"] > 0.9


def test_ssim_identical_is_one() -> None:
    a = np.full((16, 16), 0.5)
    assert ssim(a, a) > 0.999


def test_ssim_different_is_lower() -> None:
    a = np.full((16, 16), 0.1)
    b = np.full((16, 16), 0.9)
    assert ssim(a, b) < 0.4


def test_negative_distance_identical_zero() -> None:
    p = _make((64, 64), (0xF6, 0xF1, 0xE9))
    d = negative_distance(p, p)
    assert d["mse"] == 0.0
    assert d["phash_hamming"] == 0
    assert d["ssim"] > 0.999


def test_negative_distance_different_large() -> None:
    a = _make((64, 64), (0xF6, 0xF1, 0xE9))
    b = _make((64, 64), (0x17, 0x13, 0x10))
    d = negative_distance(a, b)
    assert d["mse"] > 0.1
    assert d["ssim"] < 0.6


def test_pixel_regions_stage_luma() -> None:
    """Stage region luma: warm cream region is bright, dark region is dark."""
    img = Image.new("RGB", (200, 200), (0xF6, 0xF1, 0xE9))
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    img.save(tmp.name)
    p = Path(tmp.name)
    r = pixel_regions(p, (0, 0, 200, 200))
    assert r["region_mean_luma"] > 0.8
    dark = Image.new("RGB", (200, 200), (0x17, 0x13, 0x10))
    tmp2 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    dark.save(tmp2.name)
    r2 = pixel_regions(Path(tmp2.name), (0, 0, 200, 200))
    assert r2["region_dark_ratio"] > 0.9


def test_near_identical_blocks_when_unchanged() -> None:
    """V2 Negative-Distance Gate: a candidate that barely changed from a
    known-bad baseline must be flagged BLOCKED (B3: near-identity is a
    blocker, not just a log line)."""
    p = _make((64, 64), (0xF6, 0xF1, 0xE9))
    gate = near_identical(p, p)
    assert gate["blocked"] is True, "identical candidate must be blocked"


def test_near_identical_passes_when_changed() -> None:
    a = _make((64, 64), (0xF6, 0xF1, 0xE9))
    b = _make((64, 64), (0x17, 0x13, 0x10))
    gate = near_identical(a, b)
    assert gate["blocked"] is False, "changed candidate is not blocked"
