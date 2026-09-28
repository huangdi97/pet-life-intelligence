"""build-r2p3d-r1-before-after.py — v0.2.1 vs R2P3D-R1 comparison sheet.

Left column: the approved v0.2.1-era web baselines (artifacts/visual-v3-approved,
warm living holographic UI); right column: the new R2P3D-R1 Android emulator
captures. Honest pairing: web 390px baseline vs Android 1080x2400 capture are
different form factors, so the sheet labels each source and compares the page
direction, not pixel equality.

Run: python scripts/twin/build-r2p3d-r1-before-after.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
BEFORE = REPO / "artifacts" / "visual-v3-approved"
AFTER = REPO / "artifacts" / "r2p3d-r1" / "android" / "screens"
OUT = REPO / "artifacts" / "r2p3d-r1" / "android"

PAIRS = [
    ("today", "today-390.png", "01_today.png"),
    ("pet", "pet-390.png", "03_pet.png"),
    ("life-view", "life-view-390.png", "04_lifeview_a.png"),
]

CELL_W, CELL_H = 320, 700
COLS = 2
HEADER = 64


def fit(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    im.thumbnail((CELL_W, CELL_H), Image.LANCZOS)
    bg = Image.new("RGB", (CELL_W, CELL_H), (23, 19, 16))
    x = (CELL_W - im.width) // 2
    y = (CELL_H - im.height) // 2
    bg.paste(im, (x, y))
    return bg


def main() -> int:
    W = COLS * CELL_W
    H = HEADER + len(PAIRS) * (CELL_H + 30)
    sheet = Image.new("RGB", (W, H), (23, 19, 16))
    d = ImageDraw.Draw(sheet)
    d.text((12, 12), "v0.2.1 vs R2P3D-R1 — 视觉方向对比（左=已批准 v0.2.1 基线(web)，右=R2P3D-R1 Android 捕获）", fill=(250, 246, 239))
    d.text((CELL_W + 12, 34), "R2P3D-R1 (Android emulator, 真实捕获)", fill=(200, 190, 175))
    for i, (label, before, after) in enumerate(PAIRS):
        y = HEADER + i * (CELL_H + 30)
        sheet.paste(fit(BEFORE / before), (0, y))
        sheet.paste(fit(AFTER / after), (CELL_W, y))
        d.text((12, y + CELL_H + 4), f"{label} — v0.2.1 baseline", fill=(200, 190, 175))
        d.text((CELL_W + 12, y + CELL_H + 4), f"{label} — R2P3D-R1", fill=(200, 190, 175))
    out = OUT / "v0.2.1_vs_R2P3D_R1.png"
    sheet.save(out)
    print(f"wrote {out} ({sheet.size})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())