"""gen_demo_media — generate license-safe DEMO_SYNTHETIC pet photos (R2P3D-R1 §50).

The repo contains no real pet photos this round (REAL_PETS = 0). To exercise
the individual-twin pipeline, we generate deterministic, self-authored SAMPLE
images: stylized corgi-like dog + standard cat, drawn with Pillow at the six
capture angles (front/left/right/back/full_body/head). These are clearly
DEMO_SYNTHETIC and must never be presented as real-pet identity validation.

Output: tests/fixtures/media/<id>/<angle>.png (+ README provenance).
Run: python scripts/twin/gen_demo_media.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
OUT_ROOT = REPO / "tests" / "fixtures" / "media"

W, H = 480, 520
BG = (196, 198, 186)  # neutral grey "indoor wall" so segmentation has a real bg

ANGLES = ("front", "left", "right", "back", "full_body", "head")


def _base() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), BG)
    return img, ImageDraw.Draw(img)


def _ellipse(d: ImageDraw.ImageDraw, cx, cy, rx, ry, fill, outline=None, width=2):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill, outline=outline, width=width)


def draw_dog(angle: str) -> Image.Image:
    img, d = _base()
    coat = (232, 199, 154)
    coat_dark = (217, 169, 104)
    cream = (251, 246, 235)
    if angle == "head":
        cx, cy = W // 2, H // 2
        _ellipse(d, cx, cy, 120, 100, coat)
        _ellipse(d, cx - 55, cy - 95, 30, 55, coat_dark)  # ears
        _ellipse(d, cx + 55, cy - 95, 30, 55, coat_dark)
        d.ellipse([cx - 32, cy - 40, cx + 32, cy + 28], fill=cream)
        d.ellipse([cx - 8, cy - 14, cx + 8, cy + 10], fill=(74, 58, 44))
        d.ellipse([cx - 55, cy - 20, cx - 28, cy + 6], fill=(51, 36, 28))
        d.ellipse([cx + 28, cy - 20, cx + 55, cy + 6], fill=(51, 36, 28))
        return img
    # Body proportions: corgi-like = long body, short legs.
    body_w, body_h = 150, 120
    cx, cy = W // 2, 250
    _ellipse(d, cx, cy, body_w, body_h, coat)
    _ellipse(d, cx, cy + 14, 220, 120, cream, width=0)  # cream belly band
    _ellipse(d, cx - 110, cy - 60, 80, 70, coat)  # chest
    _ellipse(d, cx + 90, cy - 70, 110, 95, coat)  # rear
    # legs (short, stubby)
    for lx in (cx - 105, cx - 40, cx + 40, cx + 105):
        d.rounded_rectangle([lx - 16, cy + 90, lx + 16, cy + 175], 12, fill=coat_dark)
        _ellipse(d, lx, cy + 178, 20, 10, (242, 217, 173))
    # head on the side
    hx = cx - 175 if angle in ("left",) else cx + 175
    _ellipse(d, hx, cy - 105, 70, 60, coat)
    d.ellipse([hx - 16, cy - 90, hx + 15, cy - 65], fill=cream)  # muzzle side
    if angle in ("left", "front", "full_body"):
        _ellipse(d, hx - 22, cy - 150, 16, 30, coat_dark)  # ear
        _ellipse(d, hx + 22, cy - 150, 16, 30, coat_dark)
    # tail
    _ellipse(d, cx - 175 if angle not in ("left", "back") else cx + 175, cy - 20, 60, 22, cream)
    if angle == "back":
        _ellipse(d, cx, cy, 130, 110, coat_dark)
        d.line([cx - 0, cy - 120, cx - 0, cy - 130], fill=coat_dark, width=26)
    return img


def draw_cat(angle: str) -> Image.Image:
    img, d = _base()
    coat = (201, 191, 178)
    coat_dark = (169, 156, 141)
    cream = (239, 230, 218)
    if angle == "head":
        cx, cy = W // 2, H // 2
        _ellipse(d, cx, cy, 105, 95, coat)
        d.polygon([(cx - 92, cy - 30), (cx - 40, cy - 145), (cx - 8, cy - 60)], fill=coat_dark)
        d.polygon([(cx + 92, cy - 30), (cx + 40, cy - 145), (cx + 8, cy - 60)], fill=coat_dark)
        d.ellipse([cx - 34, cy - 40, cx + 34, cy + 30], fill=cream)
        d.ellipse([cx - 8, cy - 16, cx + 8, cy + 12], fill=(138, 111, 99))
        d.ellipse([cx - 52, cy - 18, cx - 26, cy + 6], fill=(92, 107, 76))
        d.ellipse([cx + 26, cy - 18, cx + 52, cy + 6], fill=(92, 107, 76))
        return img
    cx, cy = W // 2, 255
    _ellipse(d, cx, cy, 140, 115, coat)
    _ellipse(d, cx, cy + 10, 205, 110, cream, width=0)
    _ellipse(d, cx - 100, cy - 55, 78, 65, coat)
    _ellipse(d, cx + 95, cy - 65, 105, 92, coat)
    for lx in (cx - 98, cx - 35, cx + 35, cx + 98):
        d.rounded_rectangle([lx - 13, cy + 95, lx + 13, cy + 168], 10, fill=coat_dark)
        _ellipse(d, lx, cy + 172, 17, 9, (217, 207, 194))
    hx = cx - 170 if angle in ("left",) else cx + 170
    _ellipse(d, hx, cy - 100, 58, 52, coat)
    d.polygon([(hx - 55, cy - 105), (hx - 30, cy - 160), (hx - 8, cy - 100)], fill=coat_dark)
    d.polygon([(hx + 55, cy - 105), (hx + 30, cy - 160), (hx + 8, cy - 100)], fill=coat_dark)
    # long tail
    d.arc([cx - 70, cy - 240, cx + 70, cy + 80], 200, 330, fill=coat_dark, width=16)
    if angle == "back":
        _ellipse(d, cx, cy, 120, 105, coat_dark)
    return img


def main() -> int:
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    for pet_id, fn in (("doudou-demo-dog", draw_dog), ("mimi-demo-cat", draw_cat)):
        pet_dir = OUT_ROOT / pet_id
        pet_dir.mkdir(parents=True, exist_ok=True)
        for angle in ANGLES:
            img = fn(angle)
            img.save(pet_dir / f"{angle}.png")
    readme = OUT_ROOT / "README.md"
    readme.write_text(
        "# Demo pet media (DEMO_SYNTHETIC)\n\n"
        "Deterministically generated Pillow illustrations of the PLI demo pets "
        "（豆豆 corgi-like dog / 咪咪 standard cat) at the six capture angles. "
        "License: self-authored (MIT, in-repo). They are NOT real photos and "
        "must never be presented as real-pet identity validation "
        "`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`.\n",
        encoding="utf-8",
    )
    print(f"wrote demo media under {OUT_ROOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
