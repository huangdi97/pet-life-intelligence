"""Build the R5.6 final human-review package without any vision model.

Required runtime inputs:
- Web: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me
- Android: the same eight owner surfaces
- Mini: Today / Timeline / Pet / Health / Assistant / Me
- Primary demo Twin: five real runtime angles
- Secondary demo Twin: four real runtime angles

A missing required image is a hard failure. There are no silent placeholder
tiles. The generated manifest records source path, SHA-256 and dimensions so a
contact sheet can be traced back to its exact runtime evidence.

This script composes evidence only. It never judges visual quality.

Usage:
    python scripts/r5-6/contact_sheets_final.py
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
FINAL = ROOT / "artifacts" / "r5-6-final"
WEB = FINAL / "web"
ANDROID = FINAL / "android"
MINI = FINAL / "mini"
TURNTABLE = FINAL / "turntable"
OUT = FINAL / "contact-sheets"

WEB_SURFACES = ("today", "timeline", "pet", "lifeview", "twinreview", "health", "assistant", "me")
ANDROID_SURFACES = WEB_SURFACES
MINI_SURFACES = ("today", "timeline", "pet", "health", "assistant", "me")

THUMB = (270, 585)
LABEL_H = 28
HEADER_H = 48


def required_image(path: Path) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"required runtime evidence missing: {path}")
    image = Image.open(path).convert("RGB")
    if image.width < 100 or image.height < 100:
        raise ValueError(f"invalid runtime evidence dimensions: {path} -> {image.size}")
    return image


def source_meta(label: str, path: Path) -> dict[str, object]:
    image = required_image(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {
        "label": label,
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": digest,
        "width": image.width,
        "height": image.height,
    }


def tile(path: Path) -> Image.Image:
    image = required_image(path)
    return image.resize(THUMB, Image.Resampling.LANCZOS)


def sheet(
    title: str,
    items: list[tuple[str, Path]],
    destination: Path,
    *,
    cols: int = 4,
) -> dict[str, object]:
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new(
        "RGB",
        (cols * THUMB[0], HEADER_H + rows * (THUMB[1] + LABEL_H)),
        (244, 241, 235),
    )
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), title, fill=(43, 39, 35))

    sources: list[dict[str, object]] = []
    for index, (label, path) in enumerate(items):
        col = index % cols
        row = index // cols
        x = col * THUMB[0]
        y = HEADER_H + row * (THUMB[1] + LABEL_H)
        canvas.paste(tile(path), (x, y))
        draw.rectangle((x, y + THUMB[1], x + THUMB[0], y + THUMB[1] + LABEL_H), fill=(255, 255, 255))
        draw.text((x + 8, y + THUMB[1] + 6), label, fill=(43, 39, 35))
        sources.append(source_meta(label, path))

    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)
    return {
        "sheet": destination.name,
        "width": canvas.width,
        "height": canvas.height,
        "sources": sources,
    }


def web_path(surface: str) -> Path:
    return WEB / surface / "screenshot.png"


def android_path(surface: str) -> Path:
    return ANDROID / surface / f"{surface}.png"


def mini_path(surface: str) -> Path:
    return MINI / f"{surface}.png"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    generated: list[dict[str, object]] = []

    generated.append(
        sheet(
            "PLI R5.6 — Web final owner surfaces",
            [(surface, web_path(surface)) for surface in WEB_SURFACES],
            OUT / "PLI_R5_6_WEB_FINAL.png",
        )
    )
    generated.append(
        sheet(
            "PLI R5.6 — Android final owner surfaces",
            [(surface, android_path(surface)) for surface in ANDROID_SURFACES],
            OUT / "PLI_R5_6_ANDROID_FINAL.png",
        )
    )
    generated.append(
        sheet(
            "PLI R5.6 — Mini final owner surfaces",
            [(surface, mini_path(surface)) for surface in MINI_SURFACES],
            OUT / "PLI_R5_6_MINI_FINAL.png",
            cols=3,
        )
    )

    hero = ("today", "pet", "lifeview", "twinreview")
    comparison: list[tuple[str, Path]] = []
    for surface in hero:
        comparison.extend(
            [
                (f"web · {surface}", web_path(surface)),
                (f"android · {surface}", android_path(surface)),
            ]
        )
    generated.append(
        sheet(
            "PLI R5.6 — Web / Android Hero parity",
            comparison,
            OUT / "PLI_R5_6_WEB_ANDROID_HERO_PARITY.png",
            cols=2,
        )
    )

    primary_angles = ("front", "front-left", "side", "rear", "front-right")
    secondary_angles = ("front", "front-left", "side", "rear")
    generated.append(
        sheet(
            "PLI R5.6 — Primary demo Twin runtime turntable",
            [(angle, TURNTABLE / "primary" / f"{angle}.png") for angle in primary_angles],
            OUT / "TWIN_PRIMARY_R5_6.png",
            cols=5,
        )
    )
    generated.append(
        sheet(
            "PLI R5.6 — Secondary demo Twin runtime turntable",
            [(angle, TURNTABLE / "secondary" / f"{angle}.png") for angle in secondary_angles],
            OUT / "TWIN_SECONDARY_R5_6.png",
            cols=4,
        )
    )

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": {
            "vision_model_used": False,
            "missing_required_source": "hard_fail",
            "human_visual_acceptance": "PENDING",
            "baseline_promotion": "FORBIDDEN_BEFORE_HUMAN_APPROVAL",
        },
        "sheets": generated,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
