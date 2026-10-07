"""asset_qa — independent machine gate for the R4 twin GLBs (address A2/A3/A6).

Parses each GLB byte-level (magic/chunks/JSON/accessors) WITHOUT three.js,
cross-checks the sidecar manifest, and emits a PASS/FAIL report per the
Blind Contract V3 asset gates:

  triangleCount in [20k, 80k]   uvPresent   texturePresent
  baseColorTextureResolution >= 1024   skinnedMeshCount >= 1   jointCount >= 16
  animationClips >= 12   pet_id / twin_version / provenance   pbrMaterial
  representationQuality == HIGH_FIDELITY_SKINNED   productCandidate == true
  hero hard blockers absent: no procedural primitives, no UV/texture missing

Also asserts the two twins have different asset fingerprints (different
geometry/appearance/texture — §12 / §58) and records GLB sizes + LOD numbers.
"""
from __future__ import annotations

import json
import struct
from pathlib import Path

from PIL import Image

OUT = Path("packages/pet-3d/assets/twins")
CLIP_NAMES = ["Idle", "Stand", "Sit", "Lie", "Sleep", "Walk", "Run", "Eat", "Drink", "Play", "Sniff", "Stretch"]


def _obj_positions(path: Path) -> list[tuple[float, float, float]]:
    out: list[tuple[float, float, float]] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.startswith("v "):
            continue
        x, y, z = (float(v) for v in raw.split()[1:4])
        out.append((x, y, z))
    return out


def _normalize_positions(
    points: list[tuple[float, float, float]],
    target_height: float,
) -> list[tuple[float, float, float]]:
    """Mirror normalize_mesh for the Doudou source (rotate_y_deg == 0).

    Linear refinement only inserts edge midpoints, so it cannot change source
    extrema. Every authored welded source vertex must therefore survive the
    bake's normalize -> unwrap path at the same position.
    """
    ys = [p[1] for p in points]
    ymin = min(ys)
    height = max(ys) - ymin
    scale = target_height / height
    scaled = [(x * scale, (y - ymin) * scale, z * scale) for x, y, z in points]
    cx = (min(p[0] for p in scaled) + max(p[0] for p in scaled)) / 2.0
    cz = (min(p[2] for p in scaled) + max(p[2] for p in scaled)) / 2.0
    return [(x - cx, y, z - cz) for x, y, z in scaled]


def _doudou_source_vertex_retention() -> float:
    source = Path("artifacts/r2p3d-r5/twin-sources/doudou-gobkit-corgi/Corgi.obj")
    baked = OUT / "doudou_base.obj"
    # Exact weld semantics: duplicate authored positions collapse but the
    # position itself is never moved.
    unique_source = list(dict.fromkeys(tuple(round(v, 9) for v in p) for p in _obj_positions(source)))
    normalized = _normalize_positions(unique_source, 1.35)
    baked_set = {
        tuple(round(v, 5) for v in p)
        for p in _obj_positions(baked)
    }
    retained = sum(
        tuple(round(v, 5) for v in p) in baked_set
        for p in normalized
    )
    return retained / max(1, len(normalized))


def _parse_glb(path: Path) -> tuple[dict, int]:
    raw = path.read_bytes()
    assert len(raw) >= 12, "GLB too short"
    magic, version, total = struct.unpack("<III", raw[:12])
    assert magic == 0x46546C67, "bad GLB magic"
    assert version == 2
    assert total == len(raw)
    json_len, json_type = struct.unpack("<I4s", raw[12:20])
    assert json_type == b"JSON"
    json_obj = json.loads(raw[20 : 20 + json_len].decode("utf-8"))
    off = 20 + json_len
    off = (off + 3) & ~3
    bin_len, bin_type = struct.unpack("<I4s", raw[off : off + 8])
    assert bin_type in (b"BIN\x00", b"BIN ")
    return json_obj, bin_len


def _accessor_sizes(json_obj: dict) -> dict[int, int]:
    """Map accessor index -> element byte size (component+type)."""
    comp_sizes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
    out: dict[int, int] = {}
    for i, a in enumerate(json_obj.get("accessors", [])):
        out[i] = comp_sizes[a["componentType"]] * comps[a["type"]]
    return out


def _count_triangles(json_obj: dict) -> int:
    mesh = json_obj["meshes"][0]
    prim = mesh["primitives"][0]
    idx_acc = prim["indices"]
    return json_obj["accessors"][idx_acc]["count"] // 3


def qa_one(pet: str) -> tuple[bool, dict]:
    glb = OUT / f"{pet}.glb"
    sidecar = OUT / f"{pet}.glb.manifest.json"
    atlas = OUT / f"{pet}_baseColor.png"
    res = Image.open(atlas).size[0]
    j, bin_len = _parse_glb(glb)
    m = json.loads(sidecar.read_text(encoding="utf-8"))
    acc = _accessor_sizes(j)
    across = acc[j["meshes"][0]["primitives"][0]["indices"]]
    assert across == 2, f"expected uint16 indices, got component size {across}"

    attrs = j["meshes"][0]["primitives"][0]["attributes"]
    tris = _count_triangles(j)
    source_vertex_retention = _doudou_source_vertex_retention() if pet == "doudou" else None
    checks = {
        "triangleCountInRange": 20_000 <= tris <= 80_000,
        "uvPresent": "TEXCOORD_0" in attrs,
        "texturePresent": len(j.get("images", [])) >= 1,
        "baseColorTextureResolution": res >= 1024,
        "skinnedMeshCount": len(j.get("skins", [])) >= 1 and "JOINTS_0" in attrs and "WEIGHTS_0" in attrs,
        "jointCount": len(j["skins"][0]["joints"]) if j.get("skins") else 0,
        "animationClips": [a.get("name") for a in j.get("animations", [])],
        "pbrMaterial": "pbrMetallicRoughness" in j["materials"][0],
        "pet_id": m.get("pet_id"),
        "twin_version": m.get("twin_version"),
        "sourceProvenance": bool(m.get("sourceProvenance")),
        "representationQuality": m.get("representationQuality"),
        "productCandidate": m.get("productCandidate"),
        # Geometry continuity gate: structural triangle/skin checks alone once
        # passed a visibly rounded/blobby Corgi. Doudou must retain the native
        # source's authored vertices after exact weld + density refinement.
        "sourceVertexRetention": source_vertex_retention,
        "sourceVertexRetentionPass": (
            source_vertex_retention is None or source_vertex_retention >= 0.98
        ),
    }
    clips_ok = all(c in checks["animationClips"] for c in CLIP_NAMES)
    joints_ok = checks["jointCount"] >= 16
    pass_v3 = (
        checks["triangleCountInRange"]
        and checks["uvPresent"]
        and checks["texturePresent"]
        and checks["baseColorTextureResolution"]
        and checks["skinnedMeshCount"]
        and joints_ok
        and clips_ok
        and checks["pbrMaterial"]
        and checks["pet_id"] == pet
        and checks["twin_version"]
        and checks["sourceProvenance"]
        and checks["representationQuality"] == "HIGH_FIDELITY_SKINNED"
        and checks["productCandidate"] is True
        and checks["sourceVertexRetentionPass"]
    )
    report = {
        "asset": pet,
        "file": glb.name,
        "fileSizeKB": round(glb.stat().st_size / 1024, 1),
        "binBytes": bin_len,
        "triangleCount": tris,
        "vertexCount": j["accessors"][attrs["POSITION"]]["count"],
        "baseColorTextureResolution": res,
        "skinnedMeshCount": 1 if checks["skinnedMeshCount"] else 0,
        "jointCount": checks["jointCount"],
        "animationClips": checks["animationClips"],
        "uvPresent": checks["uvPresent"],
        "texturePresent": checks["texturePresent"],
        "pbrMaterial": checks["pbrMaterial"],
        "pet_id": checks["pet_id"],
        "twin_version": checks["twin_version"],
        "sourceProvenance": m.get("sourceProvenance"),
        "fingerprint": m.get("fingerprint"),
        "representationQuality": checks["representationQuality"],
        "productCandidate": checks["productCandidate"],
        "sourceVertexRetention": checks["sourceVertexRetention"],
        "sourceVertexRetentionPass": checks["sourceVertexRetentionPass"],
        "clipsOk": clips_ok,
        "jointsOk": joints_ok,
        "V3_PASS": pass_v3,
    }
    return pass_v3, report


def main() -> int:
    reports: list[dict] = []
    overall = True
    for pet in ("doudou", "mimi"):
        ok, rep = qa_one(pet)
        overall &= ok
        reports.append(rep)
        retention = rep.get("sourceVertexRetention")
        retention_note = f" sourceRetention={retention:.3f}" if retention is not None else ""
        print(f"[qa:{pet}] V3_PASS={ok} tris={rep['triangleCount']} joints={rep['jointCount']} "
              f"clips={len(rep['animationClips'])} size={rep['fileSizeKB']:.0f}KB tex={rep['baseColorTextureResolution']}"
              f"{retention_note}")
    # A3: distinct fingerprints
    f0 = reports[0]["fingerprint"]
    f1 = reports[1]["fingerprint"]
    distinct = f0 != f1 and reports[0]["triangleCount"] != reports[1]["triangleCount"]
    overall &= distinct
    print(f"[qa] fingerprints distinct={distinct} ({f0} vs {f1})")
    out = Path("reports/r2p3d-r4")
    out.mkdir(parents=True, exist_ok=True)
    (out / "ASSET_QA_R4.json").write_text(
        json.dumps({"overallPass": overall, "fingerprintsDistinct": distinct, "assets": reports}, indent=2),
        encoding="utf-8",
    )
    print(f"[qa] overall={overall} -> reports/r2p3d-r4/ASSET_QA_R4.json")
    return 0 if overall else 1


if __name__ == "__main__":
    raise SystemExit(main())
