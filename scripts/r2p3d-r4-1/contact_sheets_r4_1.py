"""contact_sheets_r4_1 — build R4.1 human-review contact sheets (PIL montage).

Deterministic image composition only; the agent never judges these images.
Deliverables for the user's HUMAN visual review:
  - PLI_R4_1_WEB_HEROES.png / PLI_R4_1_ANDROID_HEROES.png
  - PLI_R4_VS_R4_1_WEB_HEROES.png (R4 | R4.1)
  - PLI_R3_VS_R4_VS_R4_1_{today,pet,lifeview,twinreview}.png
  - TWIN_TURNTABLE_DOU_DOU.png / TWIN_TURNTABLE_MIMI.png

Run:  .venv\\Scripts\\python.exe scripts/r2p3d-r4-1/contact_sheets_r4_1.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "artifacts/r2p3d-r4-1/web"
AND = ROOT / "artifacts/r2p3d-r4-1/android"
R4 = ROOT / "artifacts/r2p3d-r4/web"
R3 = ROOT / "artifacts/r2p3d-r3/web"
OUT = ROOT / "artifacts/r2p3d-r4-1/contact-sheets"

THUMB = (270, 585)
LABEL_H = 24


def _open(path: Path) -> Image.Image:
    try:
        img = Image.open(path).convert("RGB")
        return img.resize(THUMB, Image.LANCZOS)
    except Exception:
        return Image.new("RGB", THUMB, (140, 140, 140))


def _label(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, text: str) -> None:
    draw.rectangle([x, y, x + w, y + LABEL_H], fill=(255, 255, 255))
    draw.text((x + 8, y + 4), text, fill=(40, 38, 34))


def sheet(title: str, items: list[tuple[str, Path]], dest: Path, cols: int = 4) -> None:
    rows = (len(items) + cols - 1) // cols
    w = cols * THUMB[0]
    h = rows * (THUMB[1] + LABEL_H) + 44
    canvas = Image.new("RGB", (w, h), (240, 238, 232))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), title, fill=(40, 38, 34))
    for i, (name, path) in enumerate(items):
        col = i % cols
        row = i // cols
        x = col * THUMB[0]
        y = 44 + row * (THUMB[1] + LABEL_H)
        canvas.paste(_open(path), (x, y))
        _label(draw, x, y + THUMB[1], THUMB[0], name)
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    print(f"wrote {dest.name} ({canvas.size[0]}x{canvas.size[1]})")


def compare3(title: str, r3: Path, r4: Path, r41: Path, dest: Path) -> None:
    """Three-column (R3 | R4 | R4.1) comparison for one hero."""
    w = 3 * THUMB[0]
    h = THUMB[1] + LABEL_H + 44
    canvas = Image.new("RGB", (w, h), (240, 238, 232))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), title, fill=(40, 38, 34))
    for i, (label, p) in enumerate((("R3", r3), ("R4", r4), ("R4.1", r41))):
        x = i * THUMB[0]
        y = 44
        canvas.paste(_open(p), (x, y))
        _label(draw, x, y + THUMB[1], THUMB[0], label)
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    print(f"wrote {dest.name} ({canvas.size[0]}x{canvas.size[1]})")


def main() -> None:
    hero = ["today", "pet", "lifeview", "twinreview"]

    web_heroes = [(h, WEB / h / "screenshot.png") for h in hero]
    sheet("PLI R4.1 — Web Heroes (dog-demo, HIGH_FIDELITY_SKINNED)", web_heroes, OUT / "PLI_R4_1_WEB_HEROES.png")

    android_items = [(h, AND / h / "screenshot.png") for h in hero]
    android_items += [("twin_front", AND / "twinreview/twin_front.png"), ("twin_side", AND / "twinreview/twin_side.png"), ("twin_back", AND / "twinreview/twin_back.png"), ("mimi", AND / "mimi-sanity/mimi_today.png")]
    sheet("PLI R4.1 — Android Heroes (API36 AVD)", android_items, OUT / "PLI_R4_1_ANDROID_HEROES.png")

    # R4 | R4.1 (same web viewport) comparison per hero row.
    rows = len(hero)
    w = 2 * THUMB[0]
    h = rows * (THUMB[1] + LABEL_H) + 44
    canvas = Image.new("RGB", (w, h), (240, 238, 232))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), "PLI R4 vs R4.1 — Web Heroes", fill=(40, 38, 34))
    for i, h in enumerate(hero):
        y = 44 + i * (THUMB[1] + LABEL_H)
        canvas.paste(_open(R4 / h / "screenshot.png"), (0, y))
        _label(draw, 0, y + THUMB[1], THUMB[0], f"R4 {h}")
        canvas.paste(_open(WEB / h / "screenshot.png"), (THUMB[0], y))
        _label(draw, THUMB[0], y + THUMB[1], THUMB[0], f"R4.1 {h}")
    OUT.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT / "PLI_R4_VS_R4_1_WEB_HEROES.png")
    print("wrote PLI_R4_VS_R4_1_WEB_HEROES.png")

    for h in hero:
        compare3(
            f"PLI R3 vs R4 vs R4.1 — {h}",
            R3 / h / "screenshot.png",
            R4 / h / "screenshot.png",
            WEB / h / "screenshot.png",
            OUT / f"PLI_R3_VS_R4_VS_R4_1_{h}.png",
        )

    # Twin turntables (angles from real runtime captures; labelled honestly).
    doudou_angles = [
        ("front (twinreview)", AND / "twinreview/twin_front.png"),
        ("front-left (lifeview)", AND / "lifeview/lifeview_b.png"),
        ("side (twinreview)", AND / "twinreview/twin_side.png"),
        ("rear (twinreview)", AND / "twinreview/twin_back.png"),
        ("today hero (web)", WEB / "today/screenshot.png"),
    ]
    sheet("TWIN TURNTABLE — dog-demo (demo corgi-like, runtime captures)", doudou_angles, OUT / "TWIN_TURNTABLE_DOU_DOU.png", cols=5)
    mimi_angles = [("mimi today (android)", AND / "mimi-sanity/mimi_today.png"), ("mimi today (android b)", AND / "mimi-sanity/screenshot.png")]
    sheet("TWIN TURNTABLE — cat-demo (runtime capture)", mimi_angles, OUT / "TWIN_TURNTABLE_MIMI.png")


if __name__ == "__main__":
    main()
