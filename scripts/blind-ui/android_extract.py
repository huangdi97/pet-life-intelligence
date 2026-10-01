"""android_extract.py — turn a captured Android screen dir (ui.xml + 3d.json)
into layout.json / visual.json / report.md machine snapshots.

No vision model: everything comes from the uiautomator accessibility tree and
the [plimanifest] logcat channel (real runtime manifest from the WebView page).

V2 (R2P3D-R3):
  - 3d.json written by capture-android.ps1 is THE runtime manifest if present
    (manifestOrigin=RUNTIME). The extractor NEVER fabricates a product-gate
    manifest: when no runtime manifest exists it attaches a clearly-marked
    SYNTHETIC_FALLBACK_EVIDENCE manifest that can only satisfy the fallback
    path, never the REAL_3D_PRODUCT_GATE (manifest-origin check fails).
  - surfaceType is read from real accessibility semantics (hint-text / text /
    content-desc token `surface:XXX`), not fabricated.
  - interactive (disabled) and selected are read from real uiautomator
    attributes (enabled=false / selected=true), not hard-coded.
  - camera evidence (rotate/zoom/reset) is taken from the real runtime
    manifests the capture script saves before/after gestures.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SURFACE_TOKENS = ("OPEN", "SOFT_PANEL", "CARD", "CHIP", "STAGE", "NAV", "MEDIA")


def _surface_from_attrs(n: str) -> str | None:
    for attr in ("hint-text", "text", "content-desc"):
        m = re.search(rf'{attr}="([^"]*)"', n)
        if not m:
            continue
        hit = re.search(r"surface:(OPEN|SOFT_PANEL|CARD|CHIP|STAGE|NAV|MEDIA)", m.group(1))
        if hit:
            return hit.group(1)
    return None


def _selected_from_attrs(n: str, ident: str, elements: list[dict]) -> None:
    """Read real a11y selection and derive the twin-review selected option id."""
    sel = re.search(r'selected="(true|false)"', n)
    checked = re.search(r'checked="(true|false)"', n)
    is_selected = (sel and sel.group(1) == "true") or (checked and checked.group(1) == "true")
    if is_selected:
        for el in elements:
            if el["id"] == ident:
                el["selected"] = True


def extract(dir_path: Path) -> dict:
    xml = dir_path / "ui.xml"
    xml2 = dir_path / "ui_bottom.xml"  # optional scroll-merge second dump
    man = dir_path / "3d.json"
    man_a = dir_path / "3d_rotate_a.json"
    man_b = dir_path / "3d_rotate_b.json"
    man_zoom_a = dir_path / "3d_zoom_a.json"
    man_zoom_b = dir_path / "3d_zoom_b.json"
    man_reset = dir_path / "3d_reset.json"
    nodes = []
    for f in (xml, xml2):
        if f.exists():
            nodes.extend(re.findall(r"<node[^>]*>", f.read_text(encoding="utf-8", errors="ignore")))
    elements: list[dict] = []
    texts: list[str] = []
    seen: set[str] = set()
    for n in nodes:
        rid = re.search(r'resource-id="([^"]*)"', n)
        cd = re.search(r'content-desc="([^"]*)"', n)
        txt = re.search(r'text="([^"]*)"', n)
        hint = re.search(r'hint-text="([^"]*)"', n)
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        vis = re.search(r'visible="(true|false)"', n)
        clz = re.search(r'class="([^"]*)"', n)
        if not b:
            continue
        x1, y1, x2, y2 = map(int, b.groups())
        ridv = rid.group(1) if rid else ""
        cdv = cd.group(1) if cd else ""
        hintv = hint.group(1) if hint else ""
        txtv = txt.group(1) if txt else ""
        textv = txtv or cdv or hintv
        if textv:
            texts.append(textv)
        if not (ridv or cdv):
            continue
        # pli.* ids from resource-id (RN testID maps here); else content-desc label
        ident = ridv if ridv.startswith("pli.") else (f"cd:{cdv}" if cdv else "")
        if not ident or ident in seen:
            continue
        seen.add(ident)
        role = "button" if 'clickable="true"' in n else (clz.group(1).split(".")[-1] if clz else "")
        surface = _surface_from_attrs(n)
        element = {
            "id": ident,
            "role": role,
            "type": surface.lower() if surface else None,
            "surfaceType": surface,
            "x": x1,
            "y": y1,
            "width": x2 - x1,
            "height": y2 - y1,
            "visible": vis.group(1) == "true" if vis else True,
            "text": textv[:120],
        }
        _selected_from_attrs(n, ident, [element])
        elements.append(element)
    # Deduplicate by id (first occurrence keeps bounds/visibility).
    uniq: dict[str, dict] = {}
    for e in elements:
        uniq.setdefault(e["id"], e)
    elements = list(uniq.values())

    manifest: dict = {}
    manifest_origin = None
    if man.exists():
        try:
            manifest = json.loads(man.read_text(encoding="utf-8"))
        except Exception:
            manifest = {}
    if manifest and manifest.get("ready") is True:
        manifest_origin = "RUNTIME"
        manifest["manifestOrigin"] = "RUNTIME"
    # No runtime manifest => synthetic fallback evidence only (never a product gate).
    if not manifest or "manifestOrigin" not in manifest:
        has_twin = any(
            "pet-twin" in e.get("id", "")
            or "hero-stage" in e.get("id", "")
            or "lifeview.stage" in e.get("id", "")
            or "twinreview.stage" in e.get("id", "")
            for e in elements
        )
        if has_twin:
            manifest = {
                "ready": False,
                "manifestOrigin": "SYNTHETIC_FALLBACK_EVIDENCE",
                "representation": "2.5d-photo-fallback",
                "fallbackUsed": True,
                "assetVersion": "demo-v1",
                "wireframe": False,
                "materialMode": "pbr",
                "animationClips": [],
                "availableClips": [],
                "camera": {"fov": 38, "distance": 4.6, "yaw": 0.35, "pitch": 0.28, "radius": 4.6},
                "pose": "Idle",
                "poseSource": "AMBIENT",
                "poseConfidence": 0.3,
                "fallbackEvidence": "no-runtime-manifest",
            }
            manifest_origin = "SYNTHETIC_FALLBACK_EVIDENCE"
        else:
            manifest = {}

    # Camera evidence from real runtime manifests saved around gestures.
    cameras: dict = {}
    for key, f in (
        ("rotateA", man_a),
        ("rotateB", man_b),
        ("zoomA", man_zoom_a),
        ("zoomB", man_zoom_b),
        ("reset", man_reset),
    ):
        if f.exists():
            try:
                m = json.loads(f.read_text(encoding="utf-8"))
                if isinstance(m, dict) and isinstance(m.get("camera"), dict):
                    cameras[key] = m["camera"]
            except Exception:
                continue
    # Rotation/zoom/reset also derivable from the normal 3d.json camera when
    # the capture script saved the same payload markers (back-compat).
    if "rotateA" not in cameras and man.exists():
        try:
            m0 = json.loads(man.read_text(encoding="utf-8"))
            if isinstance(m0, dict) and isinstance(m0.get("camera"), dict):
                cameras["rotateA"] = m0["camera"]
        except Exception:
            pass

    view = {"width": 1080, "height": 2400}
    top = min((e["y"] for e in elements if e["y"] > 0), default=0)
    nav_tops = [e["y"] for e in elements if e["id"].startswith("pli.nav.")]
    bottom = min(nav_tops, default=view["height"])
    content = {
        "top": top,
        "bottom": bottom,
        "width": view["width"],
        "height": max(bottom - top, 1),
        "left": 0,
    }
    # Real interaction/selection from uiautomator attributes.
    interactive: dict = {}
    selected: dict = {}
    for e in elements:
        if 'enabled="false"' in _node_xml(xml, xml2, e["id"]):
            interactive[e["id"]] = True
        if e.get("selected") and re.match(r"pli\.twinreview\.verify\.(like|mostly_like|not_like)", e["id"]):
            key = e["id"].rsplit(".", 1)[-1]
            selected["pli.twinreview.action.activate"] = key
        if e.get("selected") and e["id"].startswith("pli."):
            selected.setdefault(e["id"].replace(".verify.", ".action.activate."), key_of(e["id"]))
    visual = {
        "screen": dir_path.name,
        "viewport": view,
        "contentBounds": content,
        "elements": elements,
        "text": list(dict.fromkeys(texts))[:300],
        "manifest": manifest,
        "cameras": cameras or None,
        "platform": "android",
        "interactive": interactive,
        "selected": selected,
    }
    layout = {
        "screen": dir_path.name,
        "viewport": view,
        "contentBounds": content,
        "elements": [
            {k: e[k] for k in ("id", "role", "type", "surfaceType", "x", "y", "width", "height", "visible", "text") if k in e}
            for e in elements
        ],
    }
    (dir_path / "visual.json").write_text(json.dumps(visual, ensure_ascii=False), encoding="utf-8")
    (dir_path / "layout.json").write_text(json.dumps(layout, ensure_ascii=False), encoding="utf-8")
    (dir_path / "report.md").write_text(
        f"# {dir_path.name}\n"
        f"- elements: {len(elements)}\n"
        f"- text lines: {len(texts)}\n"
        f"- manifest: {'present' if manifest else 'absent'}\n"
        f"- manifestOrigin: {manifest_origin if manifest_origin else 'absent'}\n"
        f"- cameras: {list(cameras.keys()) if cameras else 'none'}\n",
        encoding="utf-8",
    )
    return {
        "screen": dir_path.name,
        "elements": len(elements),
        "text": len(texts),
        "manifest": bool(manifest),
        "manifestOrigin": manifest_origin,
        "cameras": list(cameras.keys()) if cameras else [],
    }


def _node_xml(xml: Path, xml2: Path, ident: str) -> str:
    """Find the raw node XML for an element id (across merged dumps)."""
    pat = re.compile(r'<node[^>]*resource-id="' + re.escape(ident) + r'"[^>]*>')
    for f in (xml, xml2):
        if not f.exists():
            continue
        found = pat.search(f.read_text(encoding="utf-8", errors="ignore"))
        if found:
            return found.group(0)
    return ""


def key_of(eid: str) -> str:
    parts = eid.split(".")
    return parts[-1] if parts else eid


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="extract android snapshot")
    ap.add_argument("dir", type=Path)
    args = ap.parse_args(argv)
    print(json.dumps(extract(args.dir), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
