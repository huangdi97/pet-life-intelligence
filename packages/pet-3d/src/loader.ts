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

export interface LoadedTwin {
  /** Pet root group (ground anchored, centered). */
  group: THREE.Group;
  /** Bone lookup by `joint_<name>` for deterministic pose driving. */
  bones: Map<string, THREE.Bone>;
  skinnedMeshCount: number;
  triangleCount: number;
  vertexCount: number;
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

/** Load a high-fidelity twin GLB; returns null when unavailable (fallback). */
export async function loadTwinGLB(identity: Pet3DIdentity): Promise<LoadedTwin | null> {
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
  let skinned = 0;
  let triangles = 0;
  let vertices = 0;
  const bones = new Map<string, THREE.Bone>();
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
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const rawMaterial of materials) {
        const material = rawMaterial as THREE.MeshStandardMaterial;
        if (!material?.isMeshStandardMaterial) continue;
        if (material.map) material.color.set(0xffffff);
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
      bones.set(o.name, o as THREE.Bone);
    }
  });
  if (skinned === 0) {
    warnIfAvailable("R4_TWIN_GLB_NO_SKINNED", identity, { triangles, vertices, bones: bones.size });
    return null;
  }

  return {
    group: root,
    bones,
    skinnedMeshCount: skinned,
    triangleCount: triangles,
    vertexCount: vertices,
    setPose(pose: PoseName, t: number) {
      const fn = POSE_FN[pose] ?? POSE_FN.Idle;
      const frame = fn(t);
      for (const [name, x] of Object.entries(frame)) {
        const bone = bones.get(`joint_${name}`);
        if (!bone) continue;
        if (x.rot) bone.rotation.set(x.rot[0], x.rot[1], x.rot[2]);
        if (x.pos) bone.position.set(x.pos[0], x.pos[1], x.pos[2]);
        if (x.scale) bone.scale.set(x.scale[0], x.scale[1], x.scale[2]);
      }
    },
  };
}