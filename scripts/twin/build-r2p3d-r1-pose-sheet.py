"""build-r2p3d-r1-pose-sheet.py — composite web 3D pose evidence onto the stage.

The web captures are RGBA (transparent outside the pet). PLI composites the
WebView over the warm dark stage (packages/pet-3d palette STAGE.base #171310),
so this script composites each pose onto that exact background and tiles them
into the required POSE contact sheet (same twin across all poses).

Run: python scripts/twin/build-r2p3d-r1-pose-sheet.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
POSES = REPO / "artifacts" / "r2p3d-r1" / "web" / "poses"
OUT = REPO / "artifacts" / "r2p3d-r1" / "web"

STAGE_BASE = (23, 19, 16)  # #171310
STAGE_GLOW = (58, 46, 36)  # #3A2E24

POSE_ORDER = [
    "pose_Idle", "pose_Stand", "pose_Sit", "pose_Lie", "pose_Sleep",
    "pose_Walk", "pose_Run", "pose_Eat", "pose_Drink", "pose_Play",
    "pose_Sniff", "pose_Stretch", "twin_front", "twin_stand_front",
]

CELL_W, CELL_H = 300, 560
COLS = 3


def composite(name: str) -> Image.Image:
    src = Image.open(POSES / f"{name}.png").convert("RGBA")
    w, h = src.size
    # Fit into cell preserving aspect.
    scale = min(CELL_W / w, CELL_H / h)
    nw, nh = int(w * scale), int(h * scale)
    src = src.resize((nw, nh), Image.LANCZOS)
    bg = Image.new("RGBA", (CELL_W, CELL_H), (*STAGE_BASE, 255))
    # Warm glow behind the pet.
    glow = Image.new("RGBA", (CELL_W, CELL_H), (*STAGE_GLOW, 255))
    mask = Image.new("L", (CELL_W, CELL_H), 0)
    from PIL import ImageDraw as _d

    _d.Draw(mask).ellipse((CELL_W * 0.15, CELL_H * 0.18, CELL_W * 0.85, CELL_H * 0.85), fill=180)
    glow.putalpha(mask)
    bg = Image.alpha_composite(bg, glow)
    x = (CELL_W - nw) // 2
    y = (CELL_H - nh) // 2
    bg.alpha_composite(src, (x, y))
    return bg.convert("RGB")


def main() -> int:
    if not POSES.exists():
        print("poses dir missing — run web-twin-pose-evidence.mjs first")
        return 2
    missing = [n for n in POSE_ORDER if not (POSES / f"{n}.png").exists()]
    if missing:
        print("missing poses:", missing)
        return 2

    rows = (len(POSE_ORDER) + COLS - 1) // COLS
    W = COLS * CELL_W
    H = rows * (CELL_H + 26) + 40
    sheet = Image.new("RGB", (W, H), STAGE_BASE)
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), "PLI R2P3D-R1 — Pose Contact Sheet (same DEMO_SYNTHETIC twin, real WebGL)", fill=(250, 246, 239))
    for i, name in enumerate(POSE_ORDER):
        r, c = divmod(i, COLS)
        x = c * CELL_W
        y = 40 + r * (CELL_H + 26)
        sheet.paste(composite(name), (x, y))
        d.text((x + 6, y + CELL_H + 4), name.replace("pose_", ""), fill=(200, 190, 175))
    out = OUT / "PLI_R2P3D_R1_POSE_CONTACT_SHEET.png"
    sheet.save(out)
    print(f"wrote {out} ({sheet.size})")

    # Twin flow web sheet (review framing).
    flow_names = ["twin_front", "twin_stand_front", "pose_Sit", "pose_Walk", "pose_Eat", "pose_Sleep"]
    rows2 = (len(flow_names) + COLS - 1) // COLS
    W2 = COLS * CELL_W
    H2 = rows2 * (CELL_H + 26) + 40
    sheet2 = Image.new("RGB", (W2, H2), STAGE_BASE)
    d2 = ImageDraw.Draw(sheet2)
    d2.text((12, 10), "PLI R2P3D-R1 — Twin 3D Review Framing (real WebGL)", fill=(250, 246, 239))
    for i, name in enumerate(flow_names):
        r, c = divmod(i, COLS)
        x = c * CELL_W
        y = 40 + r * (CELL_H + 26)
        sheet2.paste(composite(name), (x, y))
        d2.text((x + 6, y + CELL_H + 4), name.replace("pose_", ""), fill=(200, 190, 175))
    out2 = OUT / "PLI_R2P3D_R1_TWIN_3D_REVIEW_CONTACT_SHEET.png"
    sheet2.save(out2)
    print(f"wrote {out2} ({sheet2.size})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
