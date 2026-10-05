"""Build per-platform R5.6 human-review contact sheets in CI.

This script composes already-captured runtime screenshots only. It does not use
OCR, image captioning, CLIP/VLM, or any visual scoring model, and it never marks
Human Visual Acceptance PASS.

Usage:
    python scripts/r5-6/contact_sheets_ci.py --platform web
    python scripts/r5-6/contact_sheets_ci.py --platform android
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
FINAL = ROOT / "artifacts" / "r5-6-final"
OUT = FINAL / "contact-sheets-ci"
THUMB = (270, 585)
LABEL_H = 28
HEADER_H = 48


def require_image(path: Path) -> Image.Image:
    if not path.exists() or path.stat().st_size < 1024:
        raise FileNotFoundError(f"required runtime screenshot missing/invalid: {path}")
    image = Image.open(path).convert("RGB")
    if image.width < 100 or image.height < 100:
        raise ValueError(f"invalid runtime screenshot dimensions: {path} -> {image.size}")
    return image


def meta(label: str, path: Path) -> dict[str, object]:
    image = require_image(path)
    return {
        "label": label,
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "width": image.width,
        "height": image.height,
    }


def sheet(title: str, items: list[tuple[str, Path]], dest: Path, cols: int) -> dict[str, object]:
    rows = (len(items) + cols - 1) // cols
    canvas = Image.new("RGB", (cols * THUMB[0], HEADER_H + rows * (THUMB[1] + LABEL_H)), (244, 241, 235))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), title, fill=(43, 39, 35))
    sources = []
    for idx, (label, path) in enumerate(items):
        image = require_image(path).resize(THUMB, Image.Resampling.LANCZOS)
        col, row = idx % cols, idx // cols
        x, y = col * THUMB[0], HEADER_H + row * (THUMB[1] + LABEL_H)
        canvas.paste(image, (x, y))
        draw.rectangle((x, y + THUMB[1], x + THUMB[0], y + THUMB[1] + LABEL_H), fill=(255, 255, 255))
        draw.text((x + 8, y + THUMB[1] + 6), label, fill=(43, 39, 35))
        sources.append(meta(label, path))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    return {"sheet": dest.name, "sources": sources}


def build_web() -> list[dict[str, object]]:
    web = FINAL / "web"
    turn = FINAL / "turntable"
    owner = ("today", "timeline", "pet", "lifeview", "twinreview", "health", "assistant", "me")
    hero = ("today", "pet", "lifeview", "twinreview")
    states = ("empty", "attention", "offline", "notfound", "permission")
    primary = ("front", "front-left", "side", "rear", "front-right")
    secondary = ("front", "front-left", "side", "rear")
    return [
        sheet("PLI R5.6 Web — Owner surfaces", [(x, web / x / "screenshot.png") for x in owner], OUT / "PLI_R5_6_WEB_OWNER.png", 4),
        sheet("PLI R5.6 Web — Hero Human Gate", [(x, web / x / "screenshot.png") for x in hero], OUT / "PLI_R5_6_WEB_HERO.png", 4),
        sheet("PLI R5.6 Web — Product states", [(x, web / x / "screenshot.png") for x in states], OUT / "PLI_R5_6_WEB_STATES.png", 5),
        sheet("PLI R5.6 — Primary demo Twin turntable", [(x, turn / "primary" / f"{x}.png") for x in primary], OUT / "TWIN_PRIMARY_R5_6_WEB.png", 5),
        sheet("PLI R5.6 — Secondary demo Twin turntable", [(x, turn / "secondary" / f"{x}.png") for x in secondary], OUT / "TWIN_SECONDARY_R5_6_WEB.png", 4),
    ]


def build_android() -> list[dict[str, object]]:
    android = FINAL / "android"
    owner = ("today", "timeline", "pet", "lifeview", "twinreview", "health", "assistant", "me")
    hero = ("today", "pet", "lifeview", "twinreview")
    return [
        sheet("PLI R5.6 Android — Owner surfaces", [(x, android / x / f"{x}.png") for x in owner], OUT / "PLI_R5_6_ANDROID_OWNER.png", 4),
        sheet("PLI R5.6 Android — Hero Human Gate", [(x, android / x / f"{x}.png") for x in hero], OUT / "PLI_R5_6_ANDROID_HERO.png", 4),
        sheet(
            "PLI R5.6 Android — Secondary pet sanity",
            [
                ("secondary · Today", android / "secondary-sanity" / "secondary_today.png"),
                ("secondary · Review", android / "secondary-review" / "secondary_twinreview.png"),
                ("secondary · front", android / "secondary-review" / "secondary_front.png"),
                ("secondary · side", android / "secondary-review" / "secondary_side.png"),
                ("secondary · back", android / "secondary-review" / "secondary_back.png"),
            ],
            OUT / "PLI_R5_6_ANDROID_SECONDARY.png",
            5,
        ),
        sheet(
            "PLI R5.6 Android — Primary Review camera truth",
            [
                ("front", android / "twinreview" / "twin_front.png"),
                ("side", android / "twinreview" / "twin_side.png"),
                ("back", android / "twinreview" / "twin_back.png"),
            ],
            OUT / "PLI_R5_6_ANDROID_REVIEW.png",
            3,
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", required=True, choices=("web", "android"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    generated = build_web() if args.platform == "web" else build_android()
    (OUT / f"{args.platform}-manifest.json").write_text(
        json.dumps(
            {
                "platform": args.platform,
                "vision_model_used": False,
                "human_visual_acceptance": "PENDING",
                "sheets": generated,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"R5.6 {args.platform} contact sheets ready -> {OUT}")


if __name__ == "__main__":
    main()
