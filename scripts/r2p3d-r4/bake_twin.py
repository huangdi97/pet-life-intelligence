"""bake_twin — R4 twin asset pipeline driver.

Pipeline per identity (§78 step 4-5):
  parse source OBJ (+MTL)
  -> per-vertex prior colors from material Kd
  -> Loop subdivision x N (colors carried)      [continuous high-res mesh]
  -> normalize (ground / center / height / axis)
  -> smooth vertex normals
  -> smart UV unwrap + atlas packing             [real UV atlas]
  -> 5-view projection painter                   [baseColor + observed/inferred]
  -> skin weights on the PLI rig                 [bind for animation]
  -> outputs:  base.obj (+uv/normal), baseColor/observed/inferred PNGs,
               weights.json, meta.json, SHA256SUMS.txt

Run:  .venv\\Scripts\\python.exe scripts/r2p3d-r4/bake_twin.py --identity dog
      .venv\\Scripts\\python.exe scripts/r2p3d-r4/bake_twin.py --identity cat --write-sums
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from corgi_morph import MorphParams, corgi_morph, measure_metrics, metrics_delta
from meshops import (
    face_normals,
    linear_subdivide,
    loop_subdivide,
    material_region_centroids,
    normalize_mesh,
    vertex_normals,
)
from objio import parse_mtl, parse_obj, write_obj
from painting import make_cat_painter, make_dog_painter
from PIL import Image
from skinweights import JOINT_NAMES, compute_weights, write_weights_json
from unwrap import paint_atlas, unwrap

ROOT = Path(__file__).resolve().parent
SRC = Path("artifacts/r2p3d-r4/twin-sources")
R5_SRC = Path("artifacts/r2p3d-r5/twin-sources")
OUT = Path("packages/pet-3d/assets/twins")
ATLAS_RES = 2048


def _hex(rgb: np.ndarray) -> str:
    return "#%02X%02X%02X" % (int(round(rgb[0] * 255)), int(round(rgb[1] * 255)), int(round(rgb[2] * 255)))


def _vertex_colors(faces, face_mat, mat_colors, verts, vcount):
    """Per-vertex color: average Kd of incident faces (area-weighted)."""
    fn = face_normals(verts, faces)
    wsum = np.linalg.norm(fn, axis=1) + 1e-9
    col = np.zeros((vcount, 3))
    weight = np.zeros(vcount)
    for k in range(3):
        np.add.at(col, faces[:, k], mat_colors[face_mat] * wsum[:, None])
        np.add.at(weight, faces[:, k], wsum)
    w = weight[:, None]
    safe = np.where(w > 1e-9, w, 1.0)
    return col / safe


def _landmarks_dog(verts: np.ndarray, colors: np.ndarray, palette: list[np.ndarray]) -> dict:
    lm = {}
    cents = material_region_centroids(verts, colors, palette)
    # Legacy source carried separate eye materials. The R5 native Corgi source
    # is a single textured material, so fall back to geometry-derived face
    # anchors rather than inventing material semantics.
    eye_c = cents[1] if len(cents) > 1 else np.array([math.nan, math.nan, math.nan])
    if not math.isnan(eye_c[0]):
        lm["eye_center"] = [float(eye_c[0]), float(eye_c[1]), float(eye_c[2])]
        sel = np.all(np.abs(colors - palette[1]) < 0.12, axis=1)
        xs = np.abs(verts[sel, 0])
        lm["eye_dx"] = float(np.mean(xs)) if xs.size else 0.16
    else:
        h = float(verts[:, 1].max())
        head = verts[verts[:, 1] > 0.62 * h]
        if head.size:
            head_w = float(head[:, 0].max() - head[:, 0].min())
            lm["eye_center"] = [0.0, 0.76 * h, float(np.percentile(head[:, 2], 78))]
            lm["eye_dx"] = max(0.055, 0.19 * head_w)
    muzzle = np.flatnonzero(verts[:, 1] > 0.62 * verts[:, 1].max())
    lm["muzzle_z"] = float(verts[muzzle, 2].max()) if muzzle.size else 1e9
    chest = np.flatnonzero((verts[:, 2] > 0) & (verts[:, 1] < 0.5 * verts[:, 1].max()))
    if chest.size:
        lm["chest_z"], lm["chest_y"] = float(verts[chest, 2].mean()), float(verts[chest, 1].mean())
    else:
        lm["chest_z"], lm["chest_y"] = 0.0, 0.0
    return lm


def _landmarks_cat(verts: np.ndarray, colors: np.ndarray, palette: list[np.ndarray]) -> dict:
    lm = {}
    cents = material_region_centroids(verts, colors, palette)
    # palette: [0]=grey [1]=pink(ears) [2]=white
    ear = cents[1]
    if not math.isnan(ear[0]):
        sel = np.all(np.abs(colors - palette[1]) < 0.18, axis=1)
        xs = np.abs(verts[sel, 0])
        lm["ear_dx"] = float(np.mean(xs)) if xs.size else 0.15
        lm["ear_y"] = float(ear[1])
    white = cents[2]
    if not math.isnan(white[1]):
        lm["belly_y"] = float(white[1])
    h = float(verts[:, 1].max())
    lm["eye_y"] = 0.74 * h
    lm["eye_dx"] = 0.13 * max(1.0, h)
    front = np.flatnonzero(verts[:, 1] > 0.5 * h)
    if front.size:
        lm["muzzle_z"] = float(verts[front, 2].max())
    lm["nose_y"] = 0.60 * h
    lm["nose_z"] = lm.get("muzzle_z", 1e9) + 0.02
    return lm


def _head_band(verts: np.ndarray) -> dict[str, float]:
    h = float(verts[:, 1].max())
    sel = verts[:, 1] > 0.55 * h
    sub = verts[sel]
    return {
        "head_min_z": float(sub[:, 2].min()) if sub.size else -1e9,
        "head_max_z": float(sub[:, 2].max()) if sub.size else 1e9,
        "head_min_y": 0.55 * h,
    }


CONFIG = {
    "dog": {
        "src_obj": R5_SRC / "doudou-gobkit-corgi/Corgi.obj",
        "src_mtl": R5_SRC / "doudou-gobkit-corgi/Corgi.mtl",
        "subdiv": 3,
        "subdivision_mode": "linear-boundary-preserving",
        "native_breed_source": True,
        "apply_corgi_morph": False,
        "rotate_y_deg": 0.0,
        "height": 1.35,
        "proc_height": 1.35,
        "pet_id": "doudou",
        "twin_version": "r5-1.0.0",
        "family": "corgi-like",
        "painter": make_dog_painter,
        "landmarks": _landmarks_dog,
    },
    "cat": {
        "src_obj": SRC / "mimi-quaternius-cat/cat_quaternius_v2.obj",
        "src_mtl": SRC / "mimi-quaternius-cat/cat_quaternius_v2.mtl",
        "subdiv": 3,
        "subdivision_mode": "loop-smooth",
        "rotate_y_deg": -90.0,
        "height": 1.0,
        "proc_height": 1.15,
        "pet_id": "mimi",
        "twin_version": "r4-1.0.0",
        "family": "standard-cat",
        "painter": make_cat_painter,
        "landmarks": _landmarks_cat,
    },
}


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def bake(identity: str, write_sums: bool = False) -> None:
    cfg = CONFIG[identity]
    print(f"[bake:{identity}] parse + subdivide + unwrap + paint ...")

    kd = parse_mtl(cfg["src_mtl"])
    data = parse_obj(cfg["src_obj"], mtl_kd=kd)
    V = data["verts"].astype(np.float64)
    F = data["faces"].astype(np.int64)
    FM = data["face_mat"].astype(np.int64)
    MC = data["mat_colors"].astype(np.float64)
    if FM.min() < 0:
        FM = np.maximum(FM, 0)

    colors = _vertex_colors(F, FM, MC, V, V.shape[0])
    subdivision_mode = str(cfg.get("subdivision_mode", "loop-smooth"))
    subdivide = linear_subdivide if subdivision_mode == "linear-boundary-preserving" else loop_subdivide
    for _ in range(cfg["subdiv"]):
        V, F, colors = subdivide(V, F, colors)
    V, m = normalize_mesh(V, cfg["height"], rotate_y_deg=cfg["rotate_y_deg"])
    # R4.1: deterministic Corgi-like morphology for the demo dog twin.
    # Positions-only transform (topology / UV / rig are regenerated downstream);
    # it runs before landmarks + unwrap so the 5-view texture projection and
    # the observed/inferred masks conform to the new silhouette. The cat
    # identity is NOT morphed (parity audit; mimi keeps its own bake).
    morph_meta: dict = {"applied": False}
    if identity == "dog" and cfg.get("apply_corgi_morph", True):
        v_in, before_m, after_m = corgi_morph(V, colors, MorphParams())
        after_m = measure_metrics(v_in)
        morph_meta = {
            "applied": True,
            "params": MorphParams().__dict__,
            "before": before_m,
            "after": after_m,
            "delta": metrics_delta(before_m, after_m),
        }
        V = v_in
    fn = face_normals(V, F)
    lnorm = np.linalg.norm(fn, axis=1, keepdims=True)
    fn = fn / np.where(lnorm > 1e-12, lnorm, 1.0)

    # Landmarks + painter (mesh-unit space; cfg height ~1.0-ish).
    landmarks = cfg["landmarks"](V, colors, [MC[i] for i in sorted(set(FM.tolist()))])
    landmarks.update(_head_band(V))
    painter = cfg["painter"](landmarks)

    # UV unwrap -> packed (position, uv) mesh.
    V2, F2, UV, OLD = unwrap(V, F, fn)
    N2 = vertex_normals(V2, F2, V2.shape[0])

    rgb, observed = paint_atlas(V2, N2, F2, UV, ATLAS_RES, painter, vcolors=colors[OLD])
    out_dir = OUT
    out_dir.mkdir(parents=True, exist_ok=True)
    base = out_dir / f"{cfg['pet_id']}_baseColor.png"
    obs_png = out_dir / f"{cfg['pet_id']}_observed.png"
    inf_png = out_dir / f"{cfg['pet_id']}_inferred.png"
    Image.fromarray((np.clip(rgb[::-1], 0, 1) * 255).astype(np.uint8)).save(base)
    Image.fromarray((observed[::-1] * 255).astype(np.uint8)).save(obs_png)
    Image.fromarray(((~observed)[::-1] * 255).astype(np.uint8)).save(inf_png)

    mesh_obj = out_dir / f"{cfg['pet_id']}_base.obj"
    write_obj(mesh_obj, V2, UV, N2, F2)

    # Skin weights: joints scaled to mesh height / procedural height ratio.
    scale = cfg["height"] / cfg["proc_height"]
    weights = compute_weights(V2, scale=scale)
    wjson = out_dir / f"{cfg['pet_id']}_weights.json"
    write_weights_json(wjson, weights)

    tris = int(F2.shape[0])
    meta = {
        "pet_id": cfg["pet_id"],
        "twin_version": cfg["twin_version"],
        "family": cfg["family"],
        "representation": "high-fidelity-glb-twin",
        "legacyRepresentation": "procedural-twin",
        # R4.2 honesty: demo twin textures are template-projected, NOT observed
        # from real pet photos. The observed/inferred masks here only simulate
        # the pipeline surface for template provenance — they are never
        # evidence of real photo observation.
        "provenanceMode": "DEMO_TEMPLATE",
        "representationQuality": "HIGH_FIDELITY_SKINNED",
        "productCandidate": True,
        "triangleCount": tris,
        "vertexCount": int(V2.shape[0]),
        "uvPresent": True,
        "texturePresent": True,
        "baseColorTextureResolution": ATLAS_RES,
        "baseColorTextureFile": base.name,
        "observedMaskFile": obs_png.name,
        "inferredMaskFile": inf_png.name,
        "meshFile": mesh_obj.name,
        "weightsFile": wjson.name,
        "joints": JOINT_NAMES,
        "sourceProvenance": {
            "doudou": "github.com/Ariescar/gobkit-free-assets animal/Corgi.glb (Gobkit, CC0 1.0)",
            "mimi": "opengameart.org/content/animated-animales-low-poly (Quaternius CC0)",
        }[cfg["pet_id"]],
        "normalize": m,
        "morphology": morph_meta,
        "nativeBreedSource": bool(cfg.get("native_breed_source", False)),
        "sourceGeometryClass": "native-corgi" if cfg.get("native_breed_source", False) else "template-morphed",
        "subdivisionMode": subdivision_mode,
        "atlasObservedRatio": float(observed.mean()),
        "landmarks": {k: (list(v) if isinstance(v, tuple) else v) for k, v in landmarks.items()},
    }
    (out_dir / f"{cfg['pet_id']}_meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"[bake:{identity}] triangles={tris} verts={V2.shape[0]} observed={meta['atlasObservedRatio']:.3f}")
    print(f"[bake:{identity}] wrote {out_dir}")

    if write_sums:
        sums_path = ROOT / "../../artifacts/r2p3d-r4/twin-sources/SHA256SUMS.txt"
        entries = sorted(cfg["src_obj"].parent.glob("*"))
        sums_path.write_text(
            "".join(f"{_sha256(Path(s))}  {s.name}\n" for s in entries),
            encoding="utf-8",
        )
        print(f"[bake:{identity}] source sums written ({len(entries)} files)")


def main() -> None:
    ap = argparse.ArgumentParser(description="R4 twin bake")
    ap.add_argument("--identity", choices=["dog", "cat"], required=True)
    ap.add_argument("--write-sums", action="store_true")
    args = ap.parse_args()
    bake(args.identity, write_sums=args.write_sums)


if __name__ == "__main__":
    main()
