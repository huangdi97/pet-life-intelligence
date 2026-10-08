"""Current product Twin structural QA (no vision model, no model downloads).

Unlike the legacy R2P3D-R1 fixture QA, this gate validates the exact GLBs shipped
from packages/pet-3d/assets/twins. It proves structural/runtime prerequisites;
it deliberately does not claim breed likeness, natural appearance, or human
visual acceptance.
"""

from __future__ import annotations

import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TWIN_DIR = ROOT / "packages" / "pet-3d" / "assets" / "twins"
WEB_TWIN_DIR = ROOT / "apps" / "web" / "public" / "assets" / "twins"
REPORT = ROOT / "artifacts" / "r2p3d-r5" / "product-twin-qa.json"
PETS = ("doudou", "mimi")
EXPECTED_CLIPS = {
    "Idle", "Stand", "Sit", "Lie", "Sleep", "Walk",
    "Run", "Eat", "Drink", "Play", "Sniff", "Stretch",
}


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError("file too small for GLB")
    magic, version, declared_length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError("bad GLB magic")
    if version != 2:
        raise ValueError(f"unsupported GLB version {version}")
    if declared_length != len(data):
        raise ValueError(f"GLB length mismatch: header={declared_length} actual={len(data)}")
    off = 12
    json_chunk: bytes | None = None
    bin_chunk = b""
    while off + 8 <= len(data):
        chunk_len, chunk_type = struct.unpack_from("<II", data, off)
        off += 8
        end = off + chunk_len
        if end > len(data):
            raise ValueError("GLB chunk exceeds file length")
        chunk = data[off:end]
        off = end
        if chunk_type == 0x4E4F534A:
            json_chunk = chunk
        elif chunk_type == 0x004E4942:
            bin_chunk = chunk
    if json_chunk is None:
        raise ValueError("missing JSON chunk")
    return json.loads(json_chunk.rstrip(b" \t\r\n\x00").decode("utf-8")), bin_chunk


def finite_values(values: list[float] | tuple[float, ...]) -> bool:
    return all(math.isfinite(float(value)) for value in values)



def _accessor_data(gltf: dict, binary: bytes, index: int, expected_type: str) -> list[tuple]:
    """Read actual glTF BIN accessors, honoring offsets and strides.

    Fail closed on sparse/external/invalid accessors rather than trusting JSON
    metadata about their counts. No renderer or vision model is involved.
    """
    accessors = gltf.get("accessors") or []
    views = gltf.get("bufferViews") or []
    if not isinstance(index, int) or not 0 <= index < len(accessors):
        raise ValueError(f"invalid accessor index: {index}")
    a = accessors[index]
    if a.get("sparse") or a.get("type") != expected_type:
        raise ValueError(f"unexpected sparse/type accessor: {index} -> {a.get('type')}")
    view_index = a.get("bufferView")
    if not isinstance(view_index, int) or not 0 <= view_index < len(views):
        raise ValueError(f"accessor has no valid BIN view: {index}")
    view = views[view_index]
    if int(view.get("buffer", 0)) != 0:
        raise ValueError("external GLB buffer is not permitted")
    fmts = {5121: "B", 5123: "H", 5125: "I", 5126: "f"}
    comp = { "SCALAR": 1, "VEC4": 4, "MAT4": 16 }[expected_type]
    fmt = fmts.get(a.get("componentType"))
    if not fmt:
        raise ValueError(f"invalid component type: {a.get('componentType')}")
    decoder = struct.Struct("<" + fmt * comp)
    count = int(a.get("count") or 0)
    stride = int(view.get("byteStride") or decoder.size)
    start = int(view.get("byteOffset") or 0) + int(a.get("byteOffset") or 0)
    view_end = int(view.get("byteOffset") or 0) + int(view.get("byteLength") or 0)
    if count < 1 or stride < decoder.size or start < 0:
        raise ValueError(f"invalid accessor length/stride: {index}")
    end = start + (count - 1) * stride + decoder.size
    if end > view_end or end > len(binary):
        raise ValueError(f"accessor exceeds BIN view: {index}")
    return [decoder.unpack_from(binary, start + i * stride) for i in range(count)]


def validate_skinning_data(gltf: dict, binary: bytes) -> tuple[list[str], dict]:
    """Check each shipped vertex's *real* JOINTS/WEIGHTS and inverse binds."""
    errors: list[str] = []
    metrics: dict = {"checkedVertices": 0, "maxWeightSumError": None, "maxInverseBindError": None}
    try:
        meshes = gltf["meshes"]
        skin = gltf["skins"][0]
        joints = skin["joints"]
        nodes = gltf["nodes"]
        if len(joints) < 16 or any(not isinstance(j, int) or not 0 <= j < len(nodes) for j in joints):
            return ["skin joint references invalid"], metrics

        # Check all vertices, not merely the accessor count or first N rows.
        for mesh in meshes:
            for primitive in mesh.get("primitives", []):
                attrs = primitive["attributes"]
                joint_rows = _accessor_data(gltf, binary, attrs["JOINTS_0"], "VEC4")
                weight_rows = _accessor_data(gltf, binary, attrs["WEIGHTS_0"], "VEC4")
                if len(joint_rows) != len(weight_rows):
                    errors.append("JOINTS_0/WEIGHTS_0 count mismatch")
                    continue
                weight_error = 0.0
                invalid = 0
                for js, ws in zip(joint_rows, weight_rows):
                    total = sum(float(x) for x in ws)
                    weight_error = max(weight_error, abs(total - 1.0))
                    if any(not math.isfinite(float(w)) or float(w) < -1e-6 for w in ws):
                        invalid += 1
                    elif any(int(j) >= len(joints) and float(w) > 1e-5 for j, w in zip(js, ws)):
                        invalid += 1
                metrics["checkedVertices"] += len(joint_rows)
                metrics["maxWeightSumError"] = max(metrics["maxWeightSumError"] or 0.0, weight_error)
                if invalid:
                    errors.append(f"{invalid} vertices have invalid skin weights/joint indices")
                if weight_error > 0.002:
                    errors.append(f"skin weights not normalized: maximum sum error {weight_error:.6g}")

        # glbwriter's canonical bind transform contains only local translations;
        # its inverse bind is the inverse WORLD translation of that joint.
        parents: dict[int, int] = {}
        for parent_idx, node in enumerate(nodes):
            for child in node.get("children", []):
                if child in parents:
                    errors.append(f"joint node {child} has multiple parents")
                parents[child] = parent_idx
        def world_position(idx: int) -> tuple[float, float, float]:
            result = [0.0, 0.0, 0.0]
            seen: set[int] = set()
            while idx not in seen:
                seen.add(idx)
                local = nodes[idx].get("translation") or [0.0, 0.0, 0.0]
                for axis in range(3):
                    result[axis] += float(local[axis])
                if idx not in parents:
                    return (result[0], result[1], result[2])
                idx = parents[idx]
            raise ValueError("cyclic joint hierarchy")

        matrix_rows = _accessor_data(gltf, binary, skin["inverseBindMatrices"], "MAT4")
        if len(matrix_rows) != len(joints):
            errors.append("inverse bind matrix count does not match joint count")
        max_ib_error = 0.0
        for joint_idx, matrix in zip(joints, matrix_rows):
            x, y, z = world_position(joint_idx)
            expected = (1.,0.,0.,0., 0.,1.,0.,0., 0.,0.,1.,0., -x,-y,-z,1.)
            max_ib_error = max(max_ib_error, max(abs(float(a)-b) for a,b in zip(matrix, expected)))
        metrics["maxInverseBindError"] = max_ib_error
        if max_ib_error > 1e-4:
            errors.append(f"inverse bind matrices inconsistent with world bind pose: {max_ib_error:.6g}")
        if not metrics["checkedVertices"]:
            errors.append("no skinned vertices were checked")
    except (KeyError, IndexError, TypeError, ValueError, struct.error) as exc:
        errors.append(f"unreadable or inconsistent GLB skin data: {exc}")
    return errors, metrics


def qa_pet(pet: str) -> dict:
    errors: list[str] = []
    glb_path = TWIN_DIR / f"{pet}.glb"
    manifest_path = TWIN_DIR / f"{pet}.glb.manifest.json"
    meta_path = TWIN_DIR / f"{pet}_meta.json"

    for path in (glb_path, manifest_path, meta_path):
        if not path.exists():
            errors.append(f"missing required asset: {path.name}")
    if errors:
        return {"pet": pet, "errors": errors, "pass": False}

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    # *_meta.json is generation/source metadata; the shipped GLB manifest is a
    # strict superset that additionally records runtime/packaging facts such as
    # skin counts, animation clips, fingerprint and file size. Compare every
    # metadata key against the manifest instead of requiring object equality.
    meta_mismatches = {
        key: {"meta": value, "manifest": manifest.get(key)}
        for key, value in meta.items()
        if manifest.get(key) != value
    }
    if meta_mismatches:
        errors.append(
            "GLB manifest disagrees with *_meta.json on shared keys: "
            + ", ".join(sorted(meta_mismatches))
        )

    required_manifest = {
        "pet_id": pet,
        "representation": "high-fidelity-glb-twin",
        "representationQuality": "HIGH_FIDELITY_SKINNED",
        "productCandidate": True,
        "provenanceMode": "DEMO_TEMPLATE",
    }
    for key, expected in required_manifest.items():
        if manifest.get(key) != expected:
            errors.append(f"manifest {key}: expected {expected!r}, got {manifest.get(key)!r}")

    if pet == "doudou":
        if manifest.get("nativeBreedSource") is not True:
            errors.append("doudou must use the native breed source")
        if manifest.get("sourceGeometryClass") != "native-corgi":
            errors.append("doudou sourceGeometryClass must be native-corgi")
        # The converted Gobkit OBJ contains touching/disconnected
        # native shells. Product Doudou first welds exact conversion duplicates
        # and then uses linear 1-to-4 refinement: authored vertices/boundaries
        # remain fixed while density rises for UV/paint/skinning. Loop even-
        # vertex smoothing can shrink open component boundaries independently
        # and re-introduce the visible head/body/leg tearing this gate exists
        # to prevent.
        if manifest.get("subdivisionMode") != "linear-boundary-preserving":
            errors.append(
                "doudou subdivisionMode must be linear-boundary-preserving "
                "(welded native-shell seam-safe product contract)"
            )
        if manifest.get("weldExactVertices") is not True:
            errors.append("doudou must weld exact converted seam vertices before subdivision")
    if pet == "mimi":
        if manifest.get("sourceGeometryClass") != "template-cat":
            errors.append("mimi sourceGeometryClass must be template-cat")
        normalize_mimi = manifest.get("normalize") or {}
        rotate_y = normalize_mimi.get("rotate_y_deg")
        if not isinstance(rotate_y, (int, float)) or not math.isclose(float(rotate_y), 90.0, abs_tol=1e-6):
            errors.append(f"mimi canonical forward-axis bake must be +90 degrees, got {rotate_y!r}")

    ratio = manifest.get("atlasObservedRatio")
    if not isinstance(ratio, (int, float)) or not 0.0 <= float(ratio) <= 1.0:
        errors.append(f"invalid atlasObservedRatio: {ratio!r}")

    normalize = manifest.get("normalize") or {}
    for key in ("scale", "translate_y_min", "height", "rotate_y_deg"):
        value = normalize.get(key)
        if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
            errors.append(f"invalid normalize.{key}: {value!r}")
    if isinstance(normalize.get("scale"), (int, float)) and float(normalize["scale"]) <= 0:
        errors.append("normalize.scale must be positive")
    if isinstance(normalize.get("height"), (int, float)) and not 0.5 <= float(normalize["height"]) <= 2.0:
        errors.append(f"normalize.height out of product range: {normalize['height']}")
    if isinstance(normalize.get("rotate_y_deg"), (int, float)) and abs(float(normalize["rotate_y_deg"])) > 180.0:
        errors.append(f"normalize.rotate_y_deg out of range: {normalize['rotate_y_deg']}")

    for key in ("baseColorTextureFile", "meshFile", "weightsFile"):
        value = manifest.get(key)
        if not value or not (TWIN_DIR / str(value)).exists():
            errors.append(f"manifest reference missing: {key}={value!r}")

    # Web must ship the exact same generated Twin and texture evidence as the
    # canonical package. A stale loose PNG can make manual inspection disagree
    # with the GLB embedded texture even when structural QA is green.
    for filename in (
        f"{pet}.glb",
        f"{pet}_baseColor.png",
        f"{pet}_observed.png",
        f"{pet}_inferred.png",
    ):
        package_asset = TWIN_DIR / filename
        web_asset = WEB_TWIN_DIR / filename
        if not web_asset.exists():
            errors.append(f"Web twin asset missing: {filename}")
            continue
        if package_asset.read_bytes() != web_asset.read_bytes():
            errors.append(f"Web twin asset drift: {filename}")

    clips = manifest.get("animationClips")
    if set(clips or []) != EXPECTED_CLIPS:
        errors.append(f"manifest animationClips mismatch: {clips!r}")
    if int(manifest.get("jointCount") or 0) < 16:
        errors.append(f"manifest jointCount too small: {manifest.get('jointCount')}")
    if int(manifest.get("skinnedMeshCount") or 0) < 1:
        errors.append("manifest has no skinned mesh")
    if int(manifest.get("triangleCount") or 0) < 1000:
        errors.append(f"triangleCount unexpectedly low: {manifest.get('triangleCount')}")
    if manifest.get("uvPresent") is not True or manifest.get("texturePresent") is not True:
        errors.append("UV/texture product prerequisites missing")

    try:
        gltf, binary = read_glb(glb_path)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"GLB unreadable: {exc}")
        return {
            "pet": pet,
            "sha256": hashlib.sha256(glb_path.read_bytes()).hexdigest(),
            "errors": errors,
            "pass": False,
        }

    skin_errors, skin_diagnostics = validate_skinning_data(gltf, binary)
    errors.extend(skin_errors)

    if str((gltf.get("asset") or {}).get("version")) != "2.0":
        errors.append("gltf asset.version is not 2.0")
    if not gltf.get("scenes"):
        errors.append("no glTF scene")
    nodes = gltf.get("nodes") or []
    meshes = gltf.get("meshes") or []
    skins = gltf.get("skins") or []
    materials = gltf.get("materials") or []
    textures = gltf.get("textures") or []
    images = gltf.get("images") or []
    accessors = gltf.get("accessors") or []

    if not nodes:
        errors.append("no glTF nodes")
    if not meshes:
        errors.append("no glTF meshes")
    if not skins:
        errors.append("no glTF skin")
    if not materials or not textures or not images:
        errors.append("PBR texture graph incomplete")

    animation_names = {str(a.get("name") or "") for a in gltf.get("animations") or []}
    missing_clips = sorted(EXPECTED_CLIPS - animation_names)
    if missing_clips:
        errors.append(f"GLB missing animation clips: {missing_clips}")

    for skin_index, skin in enumerate(skins):
        joints = skin.get("joints") or []
        if len(joints) < 16:
            errors.append(f"skin[{skin_index}] has only {len(joints)} joints")
        if any(not isinstance(j, int) or j < 0 or j >= len(nodes) for j in joints):
            errors.append(f"skin[{skin_index}] contains invalid joint indices")
        ibm = skin.get("inverseBindMatrices")
        if not isinstance(ibm, int) or ibm < 0 or ibm >= len(accessors):
            errors.append(f"skin[{skin_index}] missing valid inverseBindMatrices accessor")
        elif int(accessors[ibm].get("count") or 0) != len(joints):
            errors.append(
                f"skin[{skin_index}] inverseBindMatrices count does not equal joint count"
            )

    position_bounds: list[tuple[list[float], list[float]]] = []
    for mesh_index, mesh in enumerate(meshes):
        for prim_index, primitive in enumerate(mesh.get("primitives") or []):
            attrs = primitive.get("attributes") or {}
            for attr in ("POSITION", "NORMAL", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0"):
                if attr not in attrs:
                    errors.append(f"mesh[{mesh_index}].primitive[{prim_index}] missing {attr}")
            if primitive.get("mode", 4) != 4:
                errors.append(f"mesh[{mesh_index}].primitive[{prim_index}] is not TRIANGLES")
            pos_index = attrs.get("POSITION")
            if isinstance(pos_index, int) and 0 <= pos_index < len(accessors):
                accessor = accessors[pos_index]
                amin = accessor.get("min")
                amax = accessor.get("max")
                if (
                    isinstance(amin, list)
                    and isinstance(amax, list)
                    and len(amin) == 3
                    and len(amax) == 3
                    and finite_values(amin)
                    and finite_values(amax)
                ):
                    position_bounds.append((amin, amax))

    if not position_bounds:
        errors.append("POSITION accessors expose no finite min/max bounds")
        axis_spans = None
    else:
        mins = [min(bounds[0][axis] for bounds in position_bounds) for axis in range(3)]
        maxs = [max(bounds[1][axis] for bounds in position_bounds) for axis in range(3)]
        axis_spans = [maxs[axis] - mins[axis] for axis in range(3)]
        if any(span <= 0.02 or not math.isfinite(span) for span in axis_spans):
            errors.append(f"degenerate mesh axis span: {axis_spans}")
        positive = [span for span in axis_spans if span > 0]
        if positive and max(positive) / min(positive) > 12.0:
            errors.append(f"extreme mesh aspect ratio (possible spike/deformation): {axis_spans}")

    for node_index, node in enumerate(nodes):
        for key, expected_len in (("translation", 3), ("scale", 3), ("rotation", 4), ("matrix", 16)):
            value = node.get(key)
            if value is None:
                continue
            if not isinstance(value, list) or len(value) != expected_len or not finite_values(value):
                errors.append(f"node[{node_index}] invalid {key}")
        scale = node.get("scale")
        if isinstance(scale, list) and len(scale) == 3:
            abs_scale = [abs(float(v)) for v in scale]
            if min(abs_scale) < 1e-4 or max(abs_scale) > 100.0:
                errors.append(f"node[{node_index}] extreme scale: {scale}")

    for animation in gltf.get("animations") or []:
        channels = animation.get("channels") or []
        if not channels:
            errors.append(f"animation {animation.get('name')!r} has no channels")
        for channel in channels:
            target_node = (channel.get("target") or {}).get("node")
            if not isinstance(target_node, int) or not 0 <= target_node < len(nodes):
                errors.append(f"animation {animation.get('name')!r} targets invalid node")

    return {
        "pet": pet,
        "sha256": hashlib.sha256(glb_path.read_bytes()).hexdigest(),
        "fileSizeBytes": glb_path.stat().st_size,
        "nodeCount": len(nodes),
        "meshCount": len(meshes),
        "skinCount": len(skins),
        "animationNames": sorted(animation_names),
        "axisSpans": axis_spans,
        "skinIntegrity": skin_diagnostics,
        "errors": errors,
        "pass": not errors,
        "humanVisualAcceptance": "PENDING",
    }


def main() -> int:
    results = [qa_pet(pet) for pet in PETS]
    payload = {
        "scope": "packages/pet-3d/assets/twins current product assets",
        "visionModelUsed": False,
        "realPetIdentityValidation": "NOT_YET_OBSERVED",
        "humanVisualAcceptance": "PENDING",
        "results": results,
        "pass": all(result["pass"] for result in results),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if payload["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
