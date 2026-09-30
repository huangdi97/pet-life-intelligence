"""contact-sheets.py — build montage contact sheets for human visual review.

The agent does NOT look at these images; they are deliverables for the user
(PIL montage only, no vision model involved in their generation or review).

Usage:
  python scripts/blind-ui/contact-sheets.py --dir artifacts/blind-ui/android --out artifacts/blind-ui/contact-sheets
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

THUMB = (270, 585)  # ~ phone aspect
COLS = 4
LABEL_H = 22


def _sheet(title: str, images: list[tuple[str, Path]], out: Path) -> None:
    rows = (len(images) + COLS - 1) // COLS
    w = COLS * THUMB[0]
    h = rows * (THUMB[1] + LABEL_H) + 40
    canvas = Image.new("RGB", (w, h), (240, 238, 232))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), title, fill=(40, 38, 34))
    for i, (name, path) in enumerate(images):
        col = i % COLS
        row = i // COLS
        x = col * THUMB[0]
        y = 40 + row * (THUMB[1] + LABEL_H)
        try:
            img = Image.open(path)
            img = img.resize(THUMB, Image.LANCZOS)
        except Exception:
            img = Image.new("RGB", THUMB, (120, 120, 120))
        canvas.paste(img, (x, y))
        draw.rectangle([x, y + THUMB[1], x + THUMB[0], y + THUMB[1] + LABEL_H], fill=(255, 255, 255))
        draw.text((x + 6, y + THUMB[1] + 4), name, fill=(60, 56, 50))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)
    print(f"wrote {out.name} ({len(images)} thumbs)")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="contact sheets")
    ap.add_argument("--dir", type=Path, required=True, help="capture dir containing <screen>/<screen>.png")
    ap.add_argument("--out", type=Path, default=Path("artifacts/blind-ui/contact-sheets"))
    args = ap.parse_args(argv)

    pngs: list[tuple[str, Path]] = []
    for d in sorted(args.dir.iterdir()):
        if not d.is_dir():
            continue
        # Android writes <dir>/<dir>.png; web writes <dir>/screenshot.png.
        shot = d / f"{d.name}.png"
        if not shot.exists():
            shot = d / "screenshot.png"
        if shot.exists():
            pngs.append((d.name, shot))

    order = ["today", "timeline", "pet", "lifeview", "assistant", "me", "quicklog",
             "health", "behavior", "training", "welfare", "social", "companion",
             "monitoring", "twinversion", "twincapture", "twinreview",
             "lifeview_b", "empty", "attention", "offline", "multipet"]
    key = {name: i for i, name in enumerate(order)}
    pngs.sort(key=lambda t: key.get(t[0], 99))

    _sheet("PLI Blind UI — Primary pages", [p for p in pngs if p[0] in ("today", "pet", "lifeview", "assistant", "me", "timeline")], args.out / "PLI_BLIND_UI_PRIMARY_CONTACT_SHEET.png")
    _sheet("PLI Blind UI — Secondary pages", [p for p in pngs if p[0] in ("health", "behavior", "training", "welfare", "social", "companion", "monitoring", "quicklog")], args.out / "PLI_BLIND_UI_SECONDARY_CONTACT_SHEET.png")
    _sheet("PLI Blind UI — Twin chain", [p for p in pngs if p[0] in ("twinversion", "twincapture", "twinreview", "lifeview", "lifeview_b")], args.out / "PLI_BLIND_UI_TWIN_CONTACT_SHEET.png")
    _sheet("PLI Blind UI — Special states", [p for p in pngs if p[0] in ("empty", "attention", "offline", "multipet", "today")], args.out / "PLI_BLIND_UI_SPECIAL_STATES_CONTACT_SHEET.png")
    _sheet("PLI Blind UI — ALL screens", pngs, args.out / "PLI_BLIND_UI_ALL_CONTACT_SHEET.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
