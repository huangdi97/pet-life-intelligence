"""build_twins — assemble the final R4 twin GLBs from baked intermediates.

For each identity (doudou / mimi): reads the bake meta + weights, assembles
the skinned GLB (mesh + texture + PLI rig + 12 clips) and writes a sidecar
manifest with all Blind Contract V3 asset fields.

Run:  .venv\\Scripts\\python.exe scripts/r2p3d-r4/build_twins.py [--identity dog|cat]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from glbwriter import build_glb
from PIL import Image

OUT = Path("packages/pet-3d/assets/twins")

CONFIG = {
    "dog": {"pet_id": "doudou", "height": 1.35, "proc_height": 1.35},
    "cat": {"pet_id": "mimi", "height": 1.0, "proc_height": 1.15},
}


def build(identity: str) -> Path:
    cfg = CONFIG[identity]
    pet = cfg["pet_id"]
    meta = json.loads((OUT / f"{pet}_meta.json").read_text(encoding="utf-8"))
    weights = json.loads((OUT / f"{pet}_weights.json").read_text(encoding="utf-8"))["weights"]
    atlas = OUT / f"{pet}_baseColor.png"
    res = Image.open(atlas).size[0]
    bone_scale = cfg["height"] / cfg["proc_height"]
    dest = OUT / f"{pet}.glb"
    manifest = build_glb(OUT / f"{pet}_base.obj", atlas, weights, bone_scale, dest, dict(meta))
    manifest["baseColorTextureResolution"] = res
    sidecar = OUT / f"{pet}.glb.manifest.json"
    sidecar.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    kb = dest.stat().st_size / 1024
    print(f"[glb:{pet}] size={kb:.0f} KB tris={manifest['triangleCount']} joints={manifest['jointCount']} "
          f"clips={len(manifest['animationClips'])} texRes={res}")
    return dest


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--identity", choices=["dog", "cat"], default=None)
    args = ap.parse_args()
    targets = [args.identity] if args.identity else ["dog", "cat"]
    for t in targets:
        build(t)


if __name__ == "__main__":
    main()
