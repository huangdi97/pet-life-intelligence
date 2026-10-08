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


def require_uncropped_product_twin(path: Path, label: str) -> None:
    """Reject real screenshot evidence whose projected Twin leaves its canvas.

    The projected box comes from WebGL's camera and real GLB scene, never a
    placeholder or synthetic screenshot. This is a geometry gate, not a
    visual-quality score; Human Visual Acceptance remains PENDING.
    """
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    manifest = value.get("manifest", value)
    if not isinstance(manifest, dict) or manifest.get("manifestOrigin") != "RUNTIME":
        raise ValueError(f"missing live 3D manifest for {label}: {path}")
    bounds = manifest.get("projectedPetBounds")
    canvas = manifest.get("screenBounds")
    if not isinstance(bounds, dict) or not isinstance(canvas, dict):
        raise ValueError(f"missing real projected/canvas bounds for {label}")
    try:
        x, y, w, h = (float(bounds[key]) for key in ("x", "y", "width", "height"))
        cx, cy, cw, ch = (float(canvas[key]) for key in ("x", "y", "width", "height"))
    except (TypeError, ValueError, KeyError) as exc:
        raise ValueError(f"invalid runtime bounds for {label}: {exc}") from exc
    if min(w, h, cw, ch) <= 0:
        raise ValueError(f"invalid runtime dimensions for {label}")
    # 1% safety region with 1.5 CSS-px rounding tolerance. Canonical (unzoomed)
    # screenshot poses should never clip inside the WebView/Canvas itself.
    pad = 0.01
    eps = 1.5
    if (
        x < cx + cw * pad - eps
        or y < cy + ch * pad - eps
        or x + w > cx + cw * (1 - pad) + eps
        or y + h > cy + ch * (1 - pad) + eps
    ):
        raise ValueError(
            f"cropped 3D Twin {label}: projected={(x, y, w, h)}, canvas={(cx, cy, cw, ch)}"
        )


def validate_ci_twin_bounds(platform: str) -> None:
    if platform == "web":
        web, turn = FINAL / "web", FINAL / "turntable"
        for surface in ("today", "pet", "lifeview", "twinreview"):
            require_uncropped_product_twin(web / surface / "visual.json", f"web/{surface}")
        for pet, angles in (
            ("primary", ("front", "front-left", "side", "rear", "front-right")),
            ("secondary", ("front", "front-left", "side", "rear")),
        ):
            for angle in angles:
                require_uncropped_product_twin(turn / pet / f"{angle}.json", f"turntable/{pet}/{angle}")
    else:
        android = FINAL / "android"
        for surface in ("today", "pet", "lifeview", "twinreview"):
            require_uncropped_product_twin(android / surface / "3d.json", f"android/{surface}")
        require_uncropped_product_twin(android / "secondary-sanity" / "3d.json", "android/secondary-today")
        require_uncropped_product_twin(android / "secondary-review" / "3d.json", "android/secondary-review")
        for view in ("front", "side", "back"):
            require_uncropped_product_twin(
                android / "twinreview" / f"3d_view_{view}.json", f"android/primary/{view}"
            )
            require_uncropped_product_twin(
                android / "secondary-review" / f"3d_view_{view}.json", f"android/secondary/{view}"
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", required=True, choices=("web", "android"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    generated = build_web() if args.platform == "web" else build_android()
    validate_ci_twin_bounds(args.platform)
    capture_manifest_path = FINAL / args.platform / "capture-manifest.json"
    if not capture_manifest_path.exists():
        raise FileNotFoundError(f"required capture provenance missing: {capture_manifest_path}")
    capture_manifest = json.loads(capture_manifest_path.read_text(encoding="utf-8-sig"))
    if not capture_manifest.get("source_head"):
        raise ValueError(f"capture provenance has no source_head: {capture_manifest_path}")
    if args.platform == "web":
        turntable_manifest = json.loads(
            (FINAL / "turntable" / "capture-manifest.json").read_text(encoding="utf-8-sig")
        )
        if turntable_manifest.get("source_head") != capture_manifest.get("source_head"):
            raise ValueError("Web surface and turntable evidence were captured from different source heads")

    (OUT / f"{args.platform}-manifest.json").write_text(
        json.dumps(
            {
                "platform": args.platform,
                "source_head": capture_manifest.get("source_head"),
                "source_branch": capture_manifest.get("source_branch"),
                "checkout_head": capture_manifest.get("checkout_head"),
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
