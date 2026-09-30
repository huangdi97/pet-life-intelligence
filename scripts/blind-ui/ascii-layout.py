"""ascii-layout.py — render a layout.json snapshot as an ASCII screen map.

Blind agents read this text instead of looking at pixels: element ids are
projected onto a character grid so structure/position/size are machine-human
readable without any vision model.

Usage:
  python scripts/blind-ui/ascii-layout.py <layout.json> [--cols 48] [--rows 24]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _token(elm_id: str) -> str:
    """Short stable token from a pli.* id: e.g. pli.today.pet-twin -> TPTW."""
    parts = [p for p in elm_id.split(".") if p not in ("pli", "today", "lifeview", "pet", "nav")]
    base = parts[-1] if parts else elm_id
    letters = "".join(c[0] for c in base.split("-") if c)
    return (letters[:4] or "??").upper()


def render(layout: dict, cols: int = 48, rows: int = 24) -> str:
    vw = int(layout.get("viewport", {}).get("width", 390) or 390)
    vh = int(layout.get("viewport", {}).get("height", 844) or 844)
    grid = [[" " for _ in range(cols)] for _ in range(rows)]

    def put(cx: int, cy: int, ch: str) -> None:
        if 0 <= cx < cols and 0 <= cy < rows:
            grid[cy][cx] = ch

    for el in layout.get("elements", []):
        if el.get("visible") is False:
            continue
        x, y, w, h = (int(el.get(k, 0)) for k in ("x", "y", "width", "height"))
        if w <= 0 or h <= 0:
            continue
        gx = int(x / vw * cols)
        gx2 = min(cols - 1, int((x + w) / vw * cols))
        gy = int(y / vh * rows)
        gy2 = min(rows - 1, int((y + h) / vh * rows))
        if gx2 <= gx or gy2 <= gy:
            put(gx, gy, ".")
            continue
        # border
        for cx in range(gx, gx2 + 1):
            put(cx, gy, "#")
            put(cx, gy2, "#")
        for cy in range(gy, gy2 + 1):
            put(gx, cy, "#")
            put(gx2, cy, "#")
        # interior label
        if gx2 - gx > 4:
            label = _token(el.get("id", ""))
            for i, ch in enumerate(label[: gx2 - gx - 1]):
                put(gx + 1 + i, (gy + gy2) // 2, ch)

    lines = []
    for row in grid:
        lines.append("│" + "".join(row) + "│")
    top = "┌" + "─" * cols + "┐"
    bottom = "└" + "─" * cols + "┘"
    return "\n".join([top] + lines + [bottom])


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="ASCII layout map")
    ap.add_argument("layout", type=Path)
    ap.add_argument("--cols", type=int, default=48)
    ap.add_argument("--rows", type=int, default=24)
    args = ap.parse_args(argv)
    layout = json.loads(args.layout.read_text(encoding="utf-8"))
    print(render(layout, args.cols, args.rows))
    return 0


if __name__ == "__main__":
    sys.exit(main())
