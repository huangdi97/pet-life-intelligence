"""contact_sheets_r4_2 — build R4.2 human-review contact sheets (PIL montage).

Deterministic image composition only; the agent never judges these images.

Integrity rules (R4.2 Phase J):
  - REQUIRED images must exist: a missing required source raises FileNotFoundError
    (the script FAILS — no silent grey placeholder ever).
  - OPTIONAL images may be absent but render as a labelled
    "MISSING OPTIONAL EVIDENCE" tile (never a plain grey box).
  - Display labels come from CLI --labels key=value pairs (never hard-coded
    owner content in this source).
  - Android sheets are REQUIRED sources: run with the default flow to generate
    everything; if the Android R4.2 runtime captures were not produced (e.g.
    emulator EXTERNAL_BLOCKED), the Android sheets FAIL loudly instead of being
    fabricated. The web sheets and turntables still render from real web
    RUNTIME camera-preset captures (capture-web-turntable.mjs).

Outputs (artifacts/r2p3d-r4-2/contact-sheets/):
  PLI_R4_2_WEB_HEROES.png
  PLI_R4_2_ANDROID_HEROES.png            (requires valid android captures)
  PLI_R4_1_VS_R4_2_WEB_HEROES.png
  PLI_R4_1_VS_R4_2_ANDROID_HEROES.png    (requires valid android captures)
  PLI_R3_VS_R4_VS_R4_1_VS_R4_2_{today,pet,lifeview,twinreview}.png
  TWIN_TURNTABLE_DOU_DOU_R4_2.png        (5 angles, web runtime camera presets)
  TWIN_TURNTABLE_MIMI_R4_2.png           (5 angles, web runtime camera presets)
  manifest.json                          (sources: path + sha256 + dimensions)

Usage:
  .venv\\Scripts\\python.exe scripts/r2p3d-r4-2/contact_sheets_r4_2.py \\
      --labels doudou=DOG-DEMO mimi=CAT-DEMO
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
R3 = ROOT / "artifacts/r2p3d-r3/web"
R4 = ROOT / "artifacts/r2p3d-r4/web"
R41_WEB = ROOT / "artifacts/r2p3d-r4-1/web"
R41_AND = ROOT / "artifacts/r2p3d-r4-1/android"
R42_WEB = ROOT / "artifacts/r2p3d-r4-2/web"
R42_AND = ROOT / "artifacts/r2p3d-r4-2/android"
TT = ROOT / "artifacts/r2p3d-r4-2/web/turntable"
OUT = ROOT / "artifacts/r2p3d-r4-2/contact-sheets"

THUMB = (270, 585)
LABEL_H = 26
WARN = (150, 120, 90)


def _label(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, text: str) -> None:
    draw.rectangle([x, y, x + w, y + LABEL_H], fill=(255, 255, 255))
    draw.text((x + 8, y + 5), text, fill=(40, 38, 34))


def _tile(label: str, path: Path, required: bool) -> Image.Image:
    """Load one tile; REQUIRED missing -> raise; OPTIONAL missing -> labelled tile."""
    if not path.exists():
        if required:
            raise FileNotFoundError(f"REQUIRED evidence missing: {path}")
        img = Image.new("RGB", THUMB, WARN)
        d = ImageDraw.Draw(img)
        d.text((12, THUMB[1] // 2 - 8), "MISSING OPTIONAL EVIDENCE", fill=(255, 255, 255))
        d.text((12, THUMB[1] // 2 + 10), str(path.name), fill=(255, 255, 255))
        return img
    img = Image.open(path).convert("RGB").resize(THUMB, Image.LANCZOS)
    return img


def _sheet(title: str, items: list[tuple[str, Path, bool]], dest: Path, cols: int = 4) -> dict:
    rows = (len(items) + cols - 1) // cols
    w = cols * THUMB[0]
    h = rows * (THUMB[1] + LABEL_H) + 48
    canvas = Image.new("RGB", (w, h), (242, 240, 235))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), title, fill=(40, 38, 34))
    for i, (name, path, required) in enumerate(items):
        col, row = i % cols, i // cols
        x = col * THUMB[0]
        y = 48 + row * (THUMB[1] + LABEL_H)
        canvas.paste(_tile(name, path, required), (x, y))
        _label(draw, x, y + THUMB[1], THUMB[0], name)
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    sources = [{"label": n, "path": str(p), "required": r} for n, p, r in items]
    print(f"wrote {dest.name} ({canvas.size[0]}x{canvas.size[1]})")
    return {"sheet": dest.name, "sources": sources}


def _two_column(tag_a: str, base_a: Path, tag_b: str, base_b: Path, hero: list[str], dest: Path, file_names: bool) -> dict:
    """Two-column comparison (A | B) per hero row."""
    rows = len(hero)
    w = 2 * THUMB[0]
    h = rows * (THUMB[1] + LABEL_H) + 48
    canvas = Image.new("RGB", (w, h), (242, 240, 235))
    draw = ImageDraw.Draw(canvas)
    srcs: list[dict] = []
    for i, hname in enumerate(hero):
        y = 48 + i * (THUMB[1] + LABEL_H)
        for col, (tag, base) in enumerate(((tag_a, base_a), (tag_b, base_b))):
            p = base / hname / (f"{hname}.png" if file_names else "screenshot.png")
            canvas.paste(_tile(f"{tag} {hname}", p, True), (col * THUMB[0], y))
            _label(draw, col * THUMB[0], y + THUMB[1], THUMB[0], f"{tag} {hname}")
            srcs.append({"label": f"{tag} {hname}", "path": str(p), "required": True})
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    print(f"wrote {dest.name}")
    return {"sheet": dest.name, "sources": srcs}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _manifest_entry(sheet: str, sources: list[dict]) -> dict:
    out: dict = {"sheet": sheet, "timestamp": datetime.now(timezone.utc).isoformat(), "sources": []}
    for s in sources:
        p = Path(s["path"])
        if p.exists():
            with Image.open(p) as im:
                dims = {"width": im.width, "height": im.height}
            out["sources"].append(
                {"label": s["label"], "path": str(p), "sha256": _sha256(p), "dimensions": dims, "required": s["required"]}
            )
        else:
            out["sources"].append(
                {"label": s["label"], "path": str(p), "sha256": None, "dimensions": None, "required": s["required"], "status": "missing"}
            )
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", nargs="*", default=[], help="key=value display labels (never hard-coded here)")
    ap.add_argument("--skip-android", action="store_true", help="do not require Android captures (mark EXTERNAL_BLOCKED)")
    args = ap.parse_args()
    labels = {k: v for k, v in (kv.split("=", 1) for kv in args.labels if "=" in kv)}
    dog = labels.get("doudou", "dog-demo")
    cat = labels.get("mimi", "cat-demo")
    hero = ["today", "pet", "lifeview", "twinreview"]

    entries: list[dict] = []

    # --- R4.2 web heroes (required) ---
    web_heroes = [(h, R42_WEB / h / "screenshot.png", True) for h in hero]
    entries.append(_sheet(f"PLI R4.2 — Web Heroes ({dog}, HIGH_FIDELITY_SKINNED)", web_heroes, OUT / "PLI_R4_2_WEB_HEROES.png"))

    # --- R4.2 android heroes (required) — FAILS loudly when captures absent ---
    if not args.skip_android:
        android_items = [(h, R42_AND / h / f"{h}.png", True) for h in hero]
        android_items += [
            (f"{dog} front", R42_AND / "twinreview/twin_front.png", True),
            (f"{dog} side", R42_AND / "twinreview/twin_side.png", True),
            (f"{dog} back", R42_AND / "twinreview/twin_back.png", True),
            (f"{cat} today", R42_AND / "mimi-sanity/mimi_today.png", True),
        ]
        entries.append(_sheet("PLI R4.2 — Android Heroes (API36 AVD)", android_items, OUT / "PLI_R4_2_ANDROID_HEROES.png", cols=4))

    # --- R4.1 vs R4.2 (web) ---
    entries.append(_two_column("R4.1", R41_WEB, "R4.2", R42_WEB, hero, OUT / "PLI_R4_1_VS_R4_2_WEB_HEROES.png", file_names=False))

    # --- R4.1 vs R4.2 (android) ---
    if not args.skip_android:
        entries.append(_two_column("R4.1", R41_AND, "R4.2", R42_AND, hero, OUT / "PLI_R4_1_VS_R4_2_ANDROID_HEROES.png", file_names=True))

    # --- R3 | R4 | R4.1 | R4.2 (web) per hero ---
    for hname in hero:
        w = 4 * THUMB[0]
        h = THUMB[1] + LABEL_H + 48
        canvas = Image.new("RGB", (w, h), (242, 240, 235))
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 10), f"PLI R3 vs R4 vs R4.1 vs R4.2 — {hname}", fill=(40, 38, 34))
        srcs: list[dict] = []
        for col, (tag, base) in enumerate((("R3", R3), ("R4", R4), ("R4.1", R41_WEB), ("R4.2", R42_WEB))):
            p = base / hname / "screenshot.png"
            canvas.paste(_tile(f"{tag} {hname}", p, True), (col * THUMB[0], 48))
            _label(draw, col * THUMB[0], 48 + THUMB[1], THUMB[0], f"{tag} {hname}")
            srcs.append({"label": f"{tag} {hname}", "path": str(p), "required": True})
        dest = OUT / f"PLI_R3_VS_R4_VS_R4_1_VS_R4_2_{hname}.png"
        canvas.save(dest)
        entries.append({"sheet": dest.name, "sources": srcs})
        print(f"wrote {dest.name}")

    # --- turntables (web RUNTIME camera presets — real yaw moves) ---
    doudou_angles = [
        (f"{dog} front (web runtime)", TT / "doudou/front.png", True),
        (f"{dog} front-left (web runtime)", TT / "doudou/front-left.png", True),
        (f"{dog} side (web runtime)", TT / "doudou/side.png", True),
        (f"{dog} rear (web runtime)", TT / "doudou/rear.png", True),
        (f"{dog} front-right (web runtime)", TT / "doudou/front-right.png", True),
    ]
    entries.append(_sheet(f"TWIN TURNTABLE — {dog} (R4.2 runtime)", doudou_angles, OUT / "TWIN_TURNTABLE_DOU_DOU_R4_2.png", cols=5))

    mimi_angles = [
        (f"{cat} front (web runtime)", TT / "mimi/front.png", True),
        (f"{cat} front-left (web runtime)", TT / "mimi/front-left.png", True),
        (f"{cat} side (web runtime)", TT / "mimi/side.png", True),
        (f"{cat} rear (web runtime)", TT / "mimi/rear.png", True),
        (f"{cat} front-right (web runtime)", TT / "mimi/front-right.png", True),
    ]
    entries.append(_sheet(f"TWIN TURNTABLE — {cat} (R4.2 runtime)", mimi_angles, OUT / "TWIN_TURNTABLE_MIMI_R4_2.png", cols=5))

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "android_captures": "SKIPPED_BLOCKED" if args.skip_android else "REQUIRED",
        "sheets": [_manifest_entry(e["sheet"], e["sources"]) for e in entries],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("manifest.json written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
