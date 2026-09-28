"""build-r2p3d-r1-sheets.py — assemble R2P3D-R1 Android evidence contact sheets.

Reads artifacts/r2p3d-r1/android/screens/*.png, normalizes each to a cell
(360x800 crop, center), tiles into labeled contact sheets, and writes a small
HTML gallery for human visual review (HUMAN_VISUAL_ACCEPTANCE stays PENDING).
Run: python scripts/twin/build-r2p3d-r1-sheets.py
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
SCREENS = REPO / "artifacts" / "r2p3d-r1" / "android" / "screens"
OUT = REPO / "artifacts" / "r2p3d-r1" / "android"

CELL_W, CELL_H = 300, 668  # keep 1080x2400 aspect (~0.45)
COLS = 3

ORDER = [
    "01_today", "02_timeline", "03_pet", "04_lifeview_a", "15_lifeview_b",
    "05_assistant", "06_me", "07_quicklog", "08_health",
    "09_behavior", "10_training", "11_welfare", "12_social",
    "13_companion", "14_monitoring", "16_twinversion", "17_twincapture", "18_twinreview",
]


def cell(name: str) -> Image.Image:
    src = Image.open(SCREENS / f"{name}.png").convert("RGB")
    w, h = src.size
    # Center crop to 0.45 aspect then resize to cell.
    target_aspect = CELL_W / CELL_H
    ch = h
    cw = int(h * target_aspect)
    if cw > w:
        cw = w
        ch = int(w / target_aspect)
    x0 = (w - cw) // 2
    y0 = (h - ch) // 2
    return src.crop((x0, y0, x0 + cw, y0 + ch)).resize((CELL_W, CELL_H), Image.LANCZOS)


def build_sheet(title: str, names: list[str], out_name: str) -> None:
    rows = (len(names) + COLS - 1) // COLS
    W = COLS * CELL_W
    H = rows * (CELL_H + 26) + 40
    sheet = Image.new("RGB", (W, H), (23, 19, 16))
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), title, fill=(250, 246, 239))
    for i, name in enumerate(names):
        r, c = divmod(i, COLS)
        x = c * CELL_W
        y = 40 + r * (CELL_H + 26)
        sheet.paste(cell(name), (x, y))
        d.text((x + 6, y + CELL_H + 4), name, fill=(200, 190, 175))
    sheet.save(OUT / out_name)
    print(f"wrote {OUT / out_name} ({sheet.size})")


def main() -> int:
    if not SCREENS.exists():
        print("screens dir missing — run capture-android-evidence.ps1 first")
        return 2
    missing = [n for n in ORDER if not (SCREENS / f"{n}.png").exists()]
    if missing:
        print("missing screens:", missing)
        return 2

    build_sheet("PLI R2P3D-R1 — Android Full Evidence", ORDER, "PLI_R2P3D_R1_ANDROID_FINAL_CONTACT_SHEET.png")
    build_sheet("PLI R2P3D-R1 — Primary Pages", [n for n in ORDER if n in ("01_today", "02_timeline", "03_pet", "04_lifeview_a", "15_lifeview_b", "05_assistant", "06_me")], "PLI_R2P3D_R1_PRIMARY_PAGES_CONTACT_SHEET.png")
    build_sheet("PLI R2P3D-R1 — Secondary Pages", [n for n in ORDER if n in ("07_quicklog", "08_health", "09_behavior", "10_training", "11_welfare", "12_social", "13_companion", "14_monitoring")], "PLI_R2P3D_R1_SECONDARY_PAGES_CONTACT_SHEET.png")
    build_sheet("PLI R2P3D-R1 — Twin Flow", ["17_twincapture", "16_twinversion", "18_twinreview", "04_lifeview_a", "15_lifeview_b", "01_today"], "PLI_R2P3D_R1_TWIN_FLOW_CONTACT_SHEET.png")

    gallery = [
        "<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'>",
        "<title>PLI R2P3D-R1 — Android Evidence</title>",
        "<style>body{background:#171310;color:#FAF6EF;font-family:sans-serif;margin:0;padding:24px}",
        "h1{font-size:20px}h2{font-size:16px;color:#E8C79A;margin-top:24px}",
        "img{width:200px;border:1px solid #3A2E24;border-radius:8px;margin:4px}",
        ".row{display:flex;flex-wrap:wrap}</style></head><body>",
        "<h1>PLI R2P3D-R1 — Android Emulator Evidence（真实捕获）</h1>",
    ]
    for name in ORDER:
        gallery.append(f"<h2>{name}</h2><img src='screens/{name}.png'>")
    gallery.append("</body></html>")
    (OUT / "gallery.html").write_text("\n".join(gallery), encoding="utf-8")
    print("wrote gallery.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())