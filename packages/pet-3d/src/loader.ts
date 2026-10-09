/**
 * loader — HIGH_FIDELITY_SKINNED twin GLB runtime (R2P3D-R4).
 *
 * Loads the baked product-candidate GLB (continuous mesh + UV + baseColor
 * texture + PLI skeleton + 12 clips) with three.js GLTFLoader and drives its
 * bones with the SAME deterministic pose evaluators as the procedural twin
 * (motion.POSE_FN), so runtime pose == exported clips == procedural parity.
 *
 * Resolution order:
 *   1. injected resolver (mobile WebView embeds base64 GLB bytes at build
 *      time; the resolver returns the decoded ArrayBuffer);
 *   2. default web resolver: fetch(`/assets/twins/{identity}.glb`);
 *   3. null — the caller falls back to the procedural (engineering) twin.
 *
 * PROVIDER: the GLB is a local product asset (repo-committed, CC0-derived);
 * no runtime network download happens for these demo twins.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { POSE_FN } from "./motion";
import type { Pet3DIdentity } from "./registry";
import type { PoseName } from "./motion";
import { resolveTemplate, sanitizeMorph, type PetMorphParams } from "./morph";
import type { TwinDescriptor } from "./twinScene";

export interface LoadedTwin {
  /** Pet root group (ground anchored, centered). */
  group: THREE.Group;
  /** Bone lookup by `joint_<name>` for deterministic pose driving. */
  bones: Map<string, THREE.Bone>;
  skinnedMeshCount: number;
  triangleCount: number;
  vertexCount: number;
  /** True only when a compatible owner descriptor has deformed this template. */
  personalized: boolean;
  /** True when an observed owner coat color is conservatively mixed into the authored atlas. */
  ownerCoatTint: boolean;
  /** Apply a deterministic pose by bone name (PoseFrame -> joint_<name>). */
  setPose(pose: PoseName, t: number): void;
}

export type TwinAssetResolver = (
  identity: Pet3DIdentity,
) => Promise<ArrayBuffer | null> | ArrayBuffer | null;

let injectedResolver: TwinAssetResolver | null = null;

/** Inject a platform resolver (mobile WebView). null restores the web default. */
export function setTwinAssetResolver(resolver: TwinAssetResolver | null): void {
  injectedResolver = resolver;
}

/** Typed globalThis console guard (pet-3d builds without the DOM lib). */
function warnIfAvailable(kind: string, ...args: unknown[]): void {
  const c = (globalThis as { console?: { warn: (...a: unknown[]) => void } }).console;
  if (c) c.warn(kind, ...args);
}

export const TWIN_GLB_PATH: Record<Pet3DIdentity, string> = {
  doudou: "/assets/twins/doudou.glb",
  mimi: "/assets/twins/mimi.glb",
};


/**
 * A bundled skinned template may represent an owner Twin only when geometry
 * family and routed identity are actually compatible. Never put a Corgi mesh
 * under an arbitrary dog descriptor merely to satisfy a GLB gate.
 */
export function canPersonalizeTwinGLB(
  identity: Pet3DIdentity,
  descriptor: TwinDescriptor | null | undefined,
): boolean {
  if (!descriptor) return false;
  return (
    (identity === "doudou" && descriptor.family === "corgi-like") ||
    (identity === "mimi" && descriptor.family === "standard-cat")
  );
}

function ratio(
  target: number,
  baseline: number,
  min = 0.72,
  max = 1.28,
): number {
  if (!Number.isFinite(target) || !Number.isFinite(baseline) || baseline === 0) return 1;
  return THREE.MathUtils.clamp(target / baseline, min, max);
}

function softenedRatio(
  target: number,
  baseline: number,
  strength: number,
  min = 0.78,
  max = 1.22,
): number {
  const raw = ratio(target, baseline, min, max);
  return 1 + (raw - 1) * strength;
}

function applyOwnerPersonalization(
  root: THREE.Group,
  bones: Map<string, THREE.Bone>,
  identity: Pet3DIdentity,
  descriptor: TwinDescriptor,
): { personalized: boolean; ownerCoatTint: boolean } {
  if (!canPersonalizeTwinGLB(identity, descriptor)) {
    return { personalized: false, ownerCoatTint: false };
  }

  const template = resolveTemplate(descriptor.family);
  const baseline = template.defaultMorph;
  const target = sanitizeMorph({ ...baseline, ...(descriptor.morph ?? {}) });
  const get = (key: keyof PetMorphParams, strength = 1, min = 0.78, max = 1.22) =>
    softenedRatio(target[key], baseline[key], strength, min, max);

  // Use restrained *relative* deltas because the source GLBs already embody
  // their Corgi/cat family. Applying absolute template values would double
  // shorten a native Corgi or double lengthen a cat tail.
  root.scale.multiplyScalar(get("overall_scale", 1, 0.82, 1.18));

  const torso = bones.get("joint_torso");
  if (torso) {
    torso.scale.x *= get("chest_width", 0.48);
    torso.scale.y *= get("body_height", 0.42);
    torso.scale.z *= get("body_length", 0.50);
  }

  const neck = bones.get("joint_neck");
  if (neck) neck.position.z *= get("neck_length", 0.55);

  const head = bones.get("joint_head");
  if (head) {
    head.scale.x *= get("head_width", 0.58);
    head.scale.y *= get("head_scale", 0.52);
    head.scale.z *= get("muzzle_length", 0.32);
  }

  for (const [name, side] of [["joint_earL", 1], ["joint_earR", -1]] as const) {
    const ear = bones.get(name);
    if (!ear) continue;
    ear.scale.x *= get("ear_width", 0.55);
    ear.scale.y *= get("ear_length", 0.58);
    ear.rotation.z += side * (target.ear_angle - baseline.ear_angle) * 0.55;
  }

  for (const [name, key] of [
    ["joint_kneeFL", "leg_length_front"],
    ["joint_kneeFR", "leg_length_front"],
    ["joint_kneeBL", "leg_length_back"],
    ["joint_kneeBR", "leg_length_back"],
  ] as const) {
    const knee = bones.get(name);
    if (knee) knee.position.y *= get(key, 0.72);
  }

  const tailLength = get("tail_length", 0.62);
  const tailThickness = get("tail_thickness", 0.55);
  const tailCurveDelta = (target.tail_curve - baseline.tail_curve) * 0.45;
  for (const name of ["joint_tail0", "joint_tail1"]) {
    const tail = bones.get(name);
    if (!tail) continue;
    tail.position.z *= tailLength;
    tail.scale.x *= tailThickness;
    tail.scale.y *= tailThickness;
    tail.rotation.x -= tailCurveDelta;
  }

  // Existing product GLBs have one authored atlas/material. Preserve its
  // markings and texture detail; only mix a small owner-observed coat tint.
  // This is OWNER_MEDIA_REFERENCED, not per-region photo reconstruction.
  const coat = descriptor.texture?.observed?.coat;
  const validCoat = typeof coat === "string" && /^#[0-9a-fA-F]{6}$/.test(coat);
  if (validCoat) {
    const owner = new THREE.Color(coat);
    const seen = new Set<THREE.Material>();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const raw of materials) {
        if (seen.has(raw)) continue;
        seen.add(raw);
        const material = raw as THREE.MeshStandardMaterial;
        if (!material?.isMeshStandardMaterial) continue;
        const strength = material.map ? 0.18 : 0.30;
        material.color.copy(new THREE.Color(0xffffff).lerp(owner, strength));
        material.needsUpdate = true;
      }
    });
  }

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (!bounds.isEmpty() && Number.isFinite(bounds.min.y)) {
    root.position.y -= bounds.min.y;
    root.updateMatrixWorld(true);
  }
  return { personalized: true, ownerCoatTint: validCoat };
}

/** Load a high-fidelity twin GLB; returns null when unavailable (fallback). */
export async function loadTwinGLB(
  identity: Pet3DIdentity,
  descriptor: TwinDescriptor | null = null,
): Promise<LoadedTwin | null> {
  if (descriptor && !canPersonalizeTwinGLB(identity, descriptor)) {
    warnIfAvailable("R7_OWNER_TWIN_GLB_FAMILY_MISMATCH", identity, descriptor.family);
    return null;
  }
  let buffer: ArrayBuffer | null = null;
  if (injectedResolver) {
    buffer = await injectedResolver(identity);
  } else {
    const fetcher = (
      globalThis as { fetch?: (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }> }
    ).fetch;
    if (fetcher) {
      try {
        const res = await fetcher(TWIN_GLB_PATH[identity]);
        if (res.ok) buffer = await res.arrayBuffer();
      } catch {
        buffer = null;
      }
    }
  }
  if (!buffer) {
    warnIfAvailable("R4_TWIN_GLB_FETCH_FAIL", identity);
    return null;
  }

  const loader = new GLTFLoader();
  // GLTFLoader.parse requires an ArrayBuffer (magic/chunk scan); a bare
  // Uint8Array view would fall through to the text-JSON branch.
  const gltf = await new Promise<Awaited<ReturnType<typeof loader.parseAsync>>>((resolve, reject) => {
    loader.parse(
      buffer as ArrayBuffer,
      "",
      (g) => resolve(g),
      (err) => reject(err),
    );
  });

  const root = gltf.scene ?? new THREE.Group();
  // Both baked product assets are normalized into the product camera
  // convention during bake. Keep the runtime root untouched so
  // front=0 / side=pi/2 / rear=pi stays identical across Web and Android.
  let skinned = 0;
  let triangles = 0;
  let vertices = 0;
  const bones = new Map<string, THREE.Bone>();
  const bindPose = new Map<
    string,
    { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }
  >();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      const geo = mesh.geometry;

      // R5 product finish: GLTF base-color textures are authored as the final
      // coat color. Some source materials also carry a dark baseColorFactor;
      // multiplying the two made the finished twin read muddy/near-black even
      // under the warm stage lights. Normalize textured PBR materials to a
      // neutral multiplier and a soft fur-like response. This is presentation
      // only: geometry, UV, skinning and provenance remain unchanged.
      // Source demo assets are permissively licensed but stylistically coarse.
      // Preserve their geometry/provenance while removing avoidable faceting
      // introduced by authored hard normals. This does NOT make a template
      // photorealistic; it only lets the subdivided surface shade continuously.
      const position = geo.getAttribute("position");
      if (position) {
        geo.computeVertexNormals();
        geo.normalizeNormals();
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const rawMaterial of materials) {
        const material = rawMaterial as THREE.MeshStandardMaterial;
        if (!material?.isMeshStandardMaterial) continue;
        if (material.map) {
          material.color.set(0xffffff);
          material.map.colorSpace = THREE.SRGBColorSpace;
          // Four-tap anisotropy improves coat texture stability at the 3/4
          // living-stage camera without assuming desktop-only GPU limits.
          material.map.anisotropy = Math.max(material.map.anisotropy ?? 1, 4);
          material.map.needsUpdate = true;
        }
        material.flatShading = false;
        material.metalness = 0;
        // Fur should read matte and light-reactive, not self-lit plastic.
        // The warm stage already provides ambient/key/fill/rim illumination.
        material.roughness = Math.max(material.roughness ?? 0.80, 0.80);
        material.envMapIntensity = 0.35;
        material.emissive.set(0x000000);
        material.emissiveIntensity = 0;
        material.needsUpdate = true;
      }
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh === true || (mesh as THREE.SkinnedMesh).skeleton != null) {
        skinned += 1;
      }
      if (geo.index) {
        triangles += Math.floor(geo.index.count / 3);
      } else if (geo.getAttribute("position")) {
        triangles += Math.floor(geo.getAttribute("position").count / 3);
      }
      if (geo.getAttribute("position")) {
        vertices += geo.getAttribute("position").count;
      }
    }
    if ((o as THREE.Bone).isBone) {
      const bone = o as THREE.Bone;
      bones.set(o.name, bone);
    }
  });
  if (skinned === 0) {
    warnIfAvailable("R4_TWIN_GLB_NO_SKINNED", identity, { triangles, vertices, bones: bones.size });
    return null;
  }

  const personalization = descriptor
    ? applyOwnerPersonalization(root, bones, identity, descriptor)
    : { personalized: false, ownerCoatTint: false };

  // Poses are deltas from THIS final owner-personalized bind state.
  for (const [boneName, bone] of bones) {
    bindPose.set(boneName, {
      position: bone.position.clone(),
      quaternion: bone.quaternion.clone(),
      scale: bone.scale.clone(),
    });
  }

  return {
    group: root,
    bones,
    skinnedMeshCount: skinned,
    triangleCount: triangles,
    vertexCount: vertices,
    personalized: personalization.personalized,
    ownerCoatTint: personalization.ownerCoatTint,
    setPose(pose: PoseName, t: number) {
      // POSE_FN values are deltas from the authored bind pose. Reset every
      // joint first so switching Sit -> Idle (or any sparse pose pair) cannot
      // leak transforms from the previous frame/pose.
      for (const [boneName, bone] of bones) {
        const bind = bindPose.get(boneName);
        if (!bind) continue;
        bone.position.copy(bind.position);
        bone.quaternion.copy(bind.quaternion);
        bone.scale.copy(bind.scale);
      }

      const fn = POSE_FN[pose] ?? POSE_FN.Idle;
      const frame = fn(t);
      const deltaQuat = new THREE.Quaternion();
      const deltaEuler = new THREE.Euler();
      for (const [name, x] of Object.entries(frame)) {
        const boneName = `joint_${name}`;
        const bone = bones.get(boneName);
        const bind = bindPose.get(boneName);
        if (!bone || !bind) continue;
        if (x.rot) {
          deltaEuler.set(x.rot[0], x.rot[1], x.rot[2], "XYZ");
          deltaQuat.setFromEuler(deltaEuler);
          bone.quaternion.copy(bind.quaternion).multiply(deltaQuat);
        }
        if (x.pos) {
          bone.position.copy(bind.position).add(
            new THREE.Vector3(x.pos[0], x.pos[1], x.pos[2]),
          );
        }
        if (x.scale) {
          bone.scale.set(
            bind.scale.x * x.scale[0],
            bind.scale.y * x.scale[1],
            bind.scale.z * x.scale[2],
          );
        }
      }
      root.updateMatrixWorld(true);
    },
  };
}