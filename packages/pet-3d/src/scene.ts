/**
 * scene — shared demo 3D stage scene for PLI (Today / Pet / Life View).
 *
 * Builds { pet group + contact shadow } and owns the orbit camera state used
 * by both platform viewers. The scene is framework-free three.js so the web
 * (WebGLRenderer) and mobile (expo-gl) adapters render the SAME 豆豆/咪咪.
 */
import * as THREE from "three";
import { buildCorgi, applyIdlePose } from "./buildCorgi";
import { buildCat, applyCatIdlePose } from "./buildCat";
import { GROUND_SHADOW, LIGHTS, STAGE } from "./palette";
import type { Pet3DIdentity } from "./registry";

export interface PetStageScene {
  /** Root pet group (orbit / pose target). */
  pet: THREE.Group;
  /** Soft contact shadow on the ground plane (does not rotate with the pet). */
  shadow: THREE.Mesh;
  identity: Pet3DIdentity;
  /** Frame-driven neutral pose (cosmetic only). */
  setPose(timeSeconds: number, enabled: boolean): void;
  /** World-space bounds for camera framing. */
  bounds: { height: number; width: number };
}

export interface StageOptions {
  shadow?: boolean;
}

/** Camera target the pet should be centered on. */
export const STAGE_TARGET = new THREE.Vector3(0, 0.85, 0);

/** Deterministic radial alpha mask: soft contact, never a solid decal/disc. */
function createSoftContactAlphaMap(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - center) / radius;
      const dy = (y - center) / radius;
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      // Smooth central contact with a long feathered edge.
      const falloff = Math.pow(Math.max(0, 1 - d), 1.8);
      const value = Math.round(255 * falloff);
      const offset = (y * size + x) * 4;
      // MeshBasicMaterial alphaMap samples the green channel.
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createPetStageScene(identity: Pet3DIdentity, opts: StageOptions = {}): PetStageScene {
  const pet = identity === "doudou" ? buildCorgi() : buildCat();
  const setPose = identity === "doudou" ? applyIdlePose : applyCatIdlePose;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.98, 64),
    new THREE.MeshBasicMaterial({
      color: GROUND_SHADOW.color,
      alphaMap: createSoftContactAlphaMap(),
      transparent: true,
      opacity: GROUND_SHADOW.opacity,
      depthWrite: false,
      depthTest: true,
    }),
  );
  shadow.name = "petContactShadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.scale.set(1, 1, identity === "doudou" ? 1.25 : 1.1);

  const box = new THREE.Box3().setFromObject(pet);
  const size = box.getSize(new THREE.Vector3());

  return {
    pet,
    shadow,
    identity,
    setPose: (t, enabled) => setPose(pet, t, enabled),
    bounds: { height: size.y, width: size.x },
  };
}

/** Warm lighting rig shared by both adapters (ambient + key + fill + rim). */
export function addStageLights(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(LIGHTS.ambient, LIGHTS.ambientIntensity);
  scene.add(ambient);

  // Hemisphere separation keeps a textured coat dimensional: warm daylight
  // above, softly grounded beige below. It is intentionally low-saturation.
  const hemisphere = new THREE.HemisphereLight(
    LIGHTS.hemisphereSky,
    LIGHTS.hemisphereGround,
    LIGHTS.hemisphereIntensity,
  );
  hemisphere.position.set(0, 3.2, 0);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(LIGHTS.key, LIGHTS.keyIntensity);
  key.position.set(2.2, 3.4, 3.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(LIGHTS.fill, LIGHTS.fillIntensity);
  fill.position.set(-2.4, 1.4, -1.6);
  scene.add(fill);

  const rim = new THREE.SpotLight(LIGHTS.rim, LIGHTS.rimIntensity, 12, Math.PI / 6, 0.4, 1.6);
  rim.position.set(-0.6, 2.8, -3.4);
  scene.add(rim);
}

/** Stage fog color for warm depth (matches R2P3D palette). */
export const STAGE_FOG = new THREE.Color(STAGE.fog);

/**
 * Orbit state — pure math so rotation/zoom/reset are unit-testable without
 * WebGL. yaw around Y, pitch clamped to [-0.5, 0.9] rad, radius in [2.6, 7].
 */
export interface OrbitState {
  yaw: number;
  pitch: number;
  radius: number;
}

export const DEFAULT_ORBIT: OrbitState = { yaw: 0.35, pitch: 0.28, radius: 4.6 };

export function orbitFromDrag(prev: OrbitState, dx: number, dy: number, sensitivity = 0.008): OrbitState {
  const yaw = prev.yaw + dx * sensitivity;
  const pitch = Math.min(0.9, Math.max(-0.5, prev.pitch + dy * sensitivity));
  return { yaw, pitch, radius: prev.radius };
}

export function orbitZoom(prev: OrbitState, factor: number, bounds?: { min: number; max: number }): OrbitState {
  // factor > 1 zooms in (closer), clamped to keep the pet framed. The bound
  // range is relative to the framing baseline when a fitted camera is used
  // (portrait stages need a wider default radius than the demo default).
  const min = bounds?.min ?? 2.6;
  const max = bounds?.max ?? 7;
  const radius = Math.min(max, Math.max(min, prev.radius / factor));
  return { yaw: prev.yaw, pitch: prev.pitch, radius };
}

export function applyOrbit(camera: THREE.PerspectiveCamera, target: THREE.Vector3, orbit: OrbitState): void {
  const cp = Math.cos(orbit.pitch);
  camera.position.set(
    target.x + orbit.radius * cp * Math.sin(orbit.yaw),
    target.y + orbit.radius * Math.sin(orbit.pitch),
    target.z + orbit.radius * Math.cos(orbit.yaw),
  );
  camera.lookAt(target);
}

/** Fit the default camera to the pet so every identity frames well. */
export function frameCamera(camera: THREE.PerspectiveCamera, scene: PetStageScene, aspect: number): void {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  applyOrbit(camera, STAGE_TARGET, DEFAULT_ORBIT);
}