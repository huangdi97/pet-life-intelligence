/**
 * manifest.ts — shared Twin Manifest V2 helpers for web + mobile runtime.
 *
 * Provides the deterministic projected-pet-bounds computation (the actual
 * model's projected 2D bounding box in viewport pixels — never the stage
 * container box) and a V2 manifest builder that includes identity gates
 * (generic / petId / sourceMediaCount) and manifestOrigin=RUNTIME.
 *
 * Consumers: apps/web Pet3DViewer (WebGL), apps/mobile pet-stage-entry
 * (WebView page). The blind harness reads these manifests; the manuscript
 * always marks itself RUNTIME because it is produced inside the live
 * renderer on every frame check.
 */
import * as THREE from "three";
import { applyOrbit, STAGE_TARGET } from "./scene";
import type { OrbitState } from "./scene";

export interface ProjectedBounds {
  /** CSS pixels within the canvas. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** px area of the projected pet box. */
  areaPx: number;
  /** width*height / (viewportWidth*viewportHeight). */
  areaRatio: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ManifestBuildInput {
  ready: boolean;
  representation: string;
  /**
   * Phase E: legacy R3-era label kept for backward-compatible readers; the
   * canonical `representation` must describe the asset that is really on
   * screen (e.g. high-fidelity-glb-twin), never a stale synthetic label.
   */
  legacyRepresentation?: string | null;
  fallbackUsed: boolean;
  wireframe: boolean;
  generic: boolean;
  petId: string | null;
  sourceMediaCount: number;
  assetVersion: string | number | null;
  meshCount: number;
  skinnedMeshCount: number;
  skeleton: boolean;
  animationClips: string[];
  materialMode: string;
  baseColorTexture: boolean;
  camera: { fov: number; distance: number; yaw: number; pitch: number; radius: number };
  screenBounds: { x: number; y: number; width: number; height: number };
  activeClip: string | null;
  availableClips: string[];
  playbackState: string;
  reducedMotion: boolean;
  pose: string | null;
  poseSource: "AMBIENT" | "REPRESENTATIVE" | "OBSERVED";
  poseConfidence: number;
  projected?: ProjectedBounds | null;
  /** V3 asset classification (Blind Contract V3 §51). */
  representationQuality?: string;
  productCandidate?: boolean;
  triangleCount?: number;
  uvPresent?: boolean;
  texturePresent?: boolean;
  baseColorTextureResolution?: number;
  /** Canonical hero pose used for the capture (Stand/Idle unless observed). */
  canonicalPose?: string | null;
  /** Stage role: today/pet/life/review — never a dark-viewer card. */
  stageRole?: string | null;
  /** R4.2 surface variant: warm-living-field / neutral-identity-studio / dark-debug. */
  surfaceVariant?: string | null;
  /** Reality Field presence on the hero surfaces. */
  realityField?: string | null;
}

/** Project the pet group's world bounding box into canvas pixel space. */
export function projectPetBounds(
  pet: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  viewportWidth: number,
  viewportHeight: number,
  worldCenterOverride?: THREE.Vector3,
): ProjectedBounds | null {
  if (viewportWidth <= 0 || viewportHeight <= 0) return null;
  const box = new THREE.Box3().setFromObject(pet);
  if (box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (worldCenterOverride) center.copy(worldCenterOverride);
  const corner = new THREE.Vector3(size.x / 2, size.y / 2, size.z / 2);
  const corners: THREE.Vector3[] = [];
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        corners.push(corner.clone().multiply(new THREE.Vector3(sx, sy, sz)).add(center));
      }
    }
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let visible = false;
  const w2 = viewportWidth / 2;
  const h2 = viewportHeight / 2;
  for (const c of corners) {
    const p = c.project(camera);
    if (p.z > 1 || p.z < -1) continue; // behind near/far plane
    visible = true;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  if (!visible) return null;
  const x = Math.round((minX + 1) * w2);
  const y = Math.round((1 - maxY) * h2);
  const width = Math.round((maxX - minX) * w2);
  const height = Math.round((maxY - minY) * h2);
  const areaPx = Math.max(1, width) * Math.max(1, height);
  return {
    x,
    y,
    width,
    height,
    areaPx,
    areaRatio: areaPx / Math.max(1, viewportWidth * viewportHeight),
    viewportWidth,
    viewportHeight,
  };
}

/** Build the V2 manifest object consumed by the blind harness. */
export function buildManifestV2(input: ManifestBuildInput): Record<string, unknown> {
  return {
    ready: input.ready,
    manifestOrigin: "RUNTIME",
    legacyRepresentation: input.legacyRepresentation ?? null,
    representation: input.representation,
    generic: input.generic,
    petId: input.petId,
    sourceMediaCount: input.sourceMediaCount,
    assetVersion: input.assetVersion,
    fallbackUsed: input.fallbackUsed,
    wireframe: input.wireframe,
    meshCount: input.meshCount,
    skinnedMeshCount: input.skinnedMeshCount,
    skeleton: input.skeleton,
    materialMode: input.materialMode,
    baseColorTexture: input.baseColorTexture,
    animationClips: input.animationClips,
    camera: input.camera,
    screenBounds: input.screenBounds,
    projectedPetBounds: input.projected ?? null,
    projectedAreaRatio: input.projected?.areaRatio ?? 0,
    activeClip: input.activeClip,
    availableClips: input.availableClips,
    playbackState: input.playbackState,
    reducedMotion: input.reducedMotion,
    pose: input.pose,
    poseSource: input.poseSource,
    poseConfidence: input.poseConfidence,
    // --- Blind Contract V3 (§51) ---
    projectedPetHeightRatio: input.projected
      ? Math.round((input.projected.height / Math.max(1, input.projected.viewportHeight)) * 1000) / 1000
      : 0,
    representationQuality: input.representationQuality ?? "engineering",
    productCandidate: input.productCandidate ?? false,
    triangleCount: input.triangleCount ?? 0,
    uvPresent: input.uvPresent ?? false,
    texturePresent: input.texturePresent ?? false,
    baseColorTextureResolution: input.baseColorTextureResolution ?? 0,
    canonicalPose: input.canonicalPose ?? null,
    stageRole: input.stageRole ?? null,
    surfaceVariant: input.surfaceVariant ?? null,
    realityField: input.realityField ?? null,
  };
}

export function countMeshes(root: THREE.Object3D): { meshCount: number; skinnedMeshCount: number } {
  let meshCount = 0;
  let skinnedMeshCount = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      meshCount += 1;
      if (o instanceof THREE.SkinnedMesh) skinnedMeshCount += 1;
    }
  });
  return { meshCount, skinnedMeshCount };
}

/**
 * Fit the orbit radius so the pet's projected bounding box occupies
 * `targetAreaRatio` of the full viewport (window), matching §31's
 * "as the user sees it" semantic regardless of the stage container aspect.
 *
 * Deterministic: starts from `orbit` and iteratively scales the radius
 * (projected area scales with 1/d² in perspective) until convergence.
 * The caller keeps canonical yaw/pitch fixed, so reset always returns to the
 * same framing — the reset≈canonical camera gate stays valid.
 */
export function fitOrbitRadius(
  pet: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  orbit: OrbitState,
  targetAreaRatio: number,
  viewportWidth: number,
  viewportHeight: number,
  options?: { iterations?: number; minRadius?: number; maxRadius?: number; tolerance?: number },
): OrbitState {
  if (!(targetAreaRatio > 0.0001) || viewportWidth <= 0 || viewportHeight <= 0) return { ...orbit };
  const iterations = options?.iterations ?? 12;
  const minRadius = options?.minRadius ?? 1.6;
  const maxRadius = options?.maxRadius ?? 40;
  const tolerance = options?.tolerance ?? 0.025;
  let radius = orbit.radius;
  for (let i = 0; i < iterations; i += 1) {
    const r = Math.min(maxRadius, Math.max(minRadius, radius));
    applyOrbit(camera, STAGE_TARGET, { yaw: orbit.yaw, pitch: orbit.pitch, radius: r });
    camera.updateProjectionMatrix();
    const p = projectPetBounds(pet, camera, viewportWidth, viewportHeight);
    if (!p || p.areaRatio <= 0) break;
    const err = p.areaRatio / targetAreaRatio;
    if (Math.abs(err - 1) <= tolerance) {
      return { yaw: orbit.yaw, pitch: orbit.pitch, radius: r };
    }
    // Clamp each step so a single bad measurement cannot blow the radius.
    radius = r * Math.min(2.5, Math.max(0.4, Math.sqrt(err)));
  }
  return { yaw: orbit.yaw, pitch: orbit.pitch, radius: Math.min(maxRadius, Math.max(minRadius, radius)) };
}

/**
 * Clamp a zoomed radius into bounds (fitted framing keeps the zoom range
 * relative to its own baseline instead of the demo default).
 */
export function clampRadius(radius: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, radius));
}