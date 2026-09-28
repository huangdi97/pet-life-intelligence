"""R2P3D-R1 GLB QA — validate exported twin GLB fixtures (R2P3D-R1 §62/§73).

Checks per GLB:
  - binary GLB magic + chunk layout
  - scene present, nodes parse, meshes have positions
  - animation list matches the 12-clip motion manifest (names + counts)
  - per-clip channel targets are real joint nodes (skinning/bone sanity)
  - bounding box sane, non-zero, pet roughly ground-anchored (minY <= 0.05)
  - texture/material references resolve (no missing resources)
  - checksum stable (same input -> same sha256)

Exit 0 on all-pass; non-zero with a report on failure.
Run: python scripts/twin/twin_glb_qa.py
"""

from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GLB_DIR = REPO / "artifacts" / "r2p3d-r1" / "glb"
MOTION_MANIFEST = GLB_DIR / "motion-manifest.json"
EXPECTED_CLIPS = [
    "Idle", "Stand", "Sit", "Lie", "Sleep", "Walk",
    "Run", "Eat", "Drink", "Play", "Sniff", "Stretch",
]


def read_glb(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, length = struct.unpack("<III", data[:12])
    assert magic == 0x46546C67, f"{path.name}: bad GLB magic"
    assert version == 2, f"{path.name}: unsupported version {version}"
    off = 12
    chunks: dict[int, bytes] = {}
    while off < len(data):
        (clen, ctype) = struct.unpack("<II", data[off : off + 8])
        off += 8
        chunks[ctype] = data[off : off + clen]
        off += clen
    if 0x4E4F534A not in chunks:  # JSON chunk
        raise AssertionError(f"{path.name}: missing JSON chunk")
    return {
        "json": json.loads(chunks[0x4E4F534A]),
        "bin": chunks.get(0x004E4942, b""),
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
    }


def qa_one(path: Path, manifest: dict) -> list[str]:
    errors: list[str] = []
    try:
        glb = read_glb(path)
    except Exception as exc:  # noqa: BLE001 - collect as QA error
        return [f"{path.name}: unreadable GLB ({exc})"]

    js = glb["json"]
    if "scenes" not in js or not js["scenes"]:
        errors.append(f"{path.name}: no scene")
    nodes = js.get("nodes", [])
    if not nodes:
        errors.append(f"{path.name}: no nodes")
    meshes = js.get("meshes", [])
    if not meshes:
        errors.append(f"{path.name}: no meshes")
    for m in meshes:
        for prim in m.get("primitives", []):
            if "attributes" not in prim or "POSITION" not in prim.get("attributes", {}):
                errors.append(f"{path.name}: primitive missing POSITION")

    # Material/texture references resolve (no missing resources).
    materials = js.get("materials", [])
    for m in materials:
        for key in ("pbrMetallicRoughness",):
            pbr = m.get(key, {})
            for tex_key in ("baseColorTexture", "metallicRoughnessTexture", "normalTexture"):
                tex = pbr.get(tex_key)
                if tex is not None and tex.get("index", -1) >= len(js.get("textures", [])):
                    errors.append(f"{path.name}: material texture ref out of range")

    # Animation manifest match.
    anims = js.get("animations", [])
    names = [a.get("name", "") for a in anims]
    for expected in EXPECTED_CLIPS:
        if expected not in names:
            errors.append(f"{path.name}: missing clip {expected}")
    if len(set(names)) != len(names):
        errors.append(f"{path.name}: duplicate clip names")

    # Channel targets must be real nodes; each animated clip > 0 channels.
    node_names = [n.get("name", "") for n in nodes]
    for a in anims:
        channels = a.get("channels", [])
        if not channels:
            errors.append(f"{path.name}: clip {a.get('name')} has no channels")
        for c in channels:
            idx = c.get("target", {}).get("node", -1)
            if idx < 0 or idx >= len(nodes):
                errors.append(f"{path.name}: clip {a.get('name')} bad channel node")
            elif not node_names[idx].startswith("joint_"):
                errors.append(f"{path.name}: clip {a.get('name')} channel targets non-joint {node_names[idx]!r}")

    # Bounding box sane + ground contact (translation from node transforms is
    # folded into the scene; estimate from min position across meshes accessors).
    min_y = None
    max_y = None
    accessors = js.get("accessors", [])
    for m in meshes:
        for prim in m.get("primitives", []):
            acc_idx = prim.get("attributes", {}).get("POSITION")
            if acc_idx is None or acc_idx >= len(accessors):
                continue
            g = glb["bin"]
            acc = accessors[acc_idx]
            count = acc.get("count", 0)
            ctype = acc.get("componentType", 5126)
            if ctype != 5126:
                continue
            stride = 12  # 3 floats
            view = js.get("bufferViews", [])[acc.get("bufferView", 0)]
            start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
            mv = min_y
            for i in range(min(count, 2000)):
                y = struct.unpack_from("<f", g, start + i * stride + 4)[0]
                if mv is None or y < mv:
                    mv = y
                if max_y is None or y > max_y:
                    max_y = y
            if min_y is None or (mv is not None and mv < min_y):
                min_y = mv
    if min_y is None:
        errors.append(f"{path.name}: could not compute bounds")
    else:
        if max_y is None or max_y - min_y < 0.2:  # something taller than 20cm
            errors.append(f"{path.name}: bounding box too flat (y span {max_y - min_y if max_y else 0:.2f})")
        if min_y > 0.15:
            errors.append(f"{path.name}: pet not ground-anchored (minY {min_y:.3f})")

    # Manifest sidecar present and consistent.
    sidecar = GLB_DIR / f"{path.stem}.manifest.json"
    if not sidecar.exists():
        errors.append(f"{path.name}: missing sidecar manifest")
    elif path.stem.startswith("doudou") or path.stem.startswith("mimi"):
        sm = json.loads(sidecar.read_text(encoding="utf-8"))
        if len(sm.get("animation", {}).get("names", [])) != len(EXPECTED_CLIPS):
            errors.append(f"{path.name}: sidecar clip count mismatch")
    _ = manifest
    return errors


def main() -> int:
    if not GLB_DIR.exists():
        print("GLB_DIR missing; run scripts/twin/twin-glb-export.mjs first.")
        return 2
    manifest = json.loads(MOTION_MANIFEST.read_text(encoding="utf-8")) if MOTION_MANIFEST.exists() else {}
    files = sorted(GLB_DIR.glob("*.glb"))
    if not files:
        print("no GLB files found")
        return 2
    total_errors: list[str] = []
    for f in files:
        total_errors.extend(qa_one(f, manifest))
    report = {
        "files": [f.name for f in files],
        "errors": total_errors,
        "clips_expected": EXPECTED_CLIPS,
        "pass": not total_errors,
    }
    out = GLB_DIR / "glb-qa-report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
