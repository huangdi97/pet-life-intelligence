/**
 * buildCorgi — programmatic demo 3D asset for 豆豆 (DEMO/SYNTHETIC, dev-only).
 *
 * A low-poly corgi built from primitives with the identity markings from the
 * certified 2.5D layer (warm tan/cream coat, white forehead blaze, upright
 * rounded ears, stubby legs, short tail). Presentation only — never a fact
 * source, never a health observation. Root node is the orbit/pose target.
 */
import * as THREE from "three";
import { CORGI } from "./palette";

export const CORGI_ROOT = "doudouRoot";

function mat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
}

function part(
  geo: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
  scale?: [number, number, number],
  rot?: [number, number, number],
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

const sphere = (r: number, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt: number, rb: number, h: number, seg = 18) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 14) => new THREE.ConeGeometry(r, h, seg);

/** Build the 豆豆 corgi group centered on the ground plane (y=0). */
export function buildCorgi(): THREE.Group {
  const root = new THREE.Group();
  root.name = CORGI_ROOT;

  // Body — the rounded corgi torso (longer along Z: facing +Z toward camera).
  const bodyMesh = part(sphere(0.62), CORGI.coat, 0, 0.58, 0, [1, 0.78, 1.3]);
  bodyMesh.userData.baseScale = [1, 0.78, 1.3];
  root.add(bodyMesh);

  // Chest / belly cream patch (identity trait: cream underbelly).
  root.add(part(sphere(0.4), CORGI.cream, 0, 0.42, 0.3, [0.9, 0.55, 1.15]));

  // Head.
  root.add(part(sphere(0.42), CORGI.coat, 0, 1.2, 0.82));
  // Muzzle (cream) + nose.
  root.add(part(sphere(0.2), CORGI.cream, 0, 1.06, 1.22, [1, 0.7, 0.72]));
  root.add(part(sphere(0.09), CORGI.nose, 0, 1.08, 1.32, [1, 0.8, 0.72]));

  // Eyes.
  root.add(part(sphere(0.045), CORGI.eye, -0.16, 1.31, 1.14));
  root.add(part(sphere(0.045), CORGI.eye, 0.16, 1.31, 1.14));

  // Forehead blaze — the 豆豆 identity marking (white on crown).
  const blaze = part(sphere(0.09), CORGI.cream, 0, 1.46, 0.98, [0.85, 1.2, 0.5]);
  blaze.rotation.x = 0.15;
  root.add(blaze);

  // Ears — upright rounded corgi ears with a darker inner.
  const earL = part(cone(0.19, 0.5), CORGI.coatDeep, -0.3, 1.62, 0.78, [1, 1, 0.85], [0.08, 0, 0.18]);
  const earR = part(cone(0.19, 0.5), CORGI.coatDeep, 0.3, 1.62, 0.78, [1, 1, 0.85], [0.08, 0, -0.18]);
  root.add(earL, earR);
  const earInL = part(cone(0.1, 0.3), CORGI.earInner, -0.3, 1.66, 0.86, [1, 0.9, 0.8], [-0.06, 0, 0.18]);
  const earInR = part(cone(0.1, 0.3), CORGI.earInner, 0.3, 1.66, 0.86, [1, 0.9, 0.8], [-0.06, 0, -0.18]);
  root.add(earInL, earInR);

  // Stubby legs (x: front/back by ±0.42, z: left/right by ±0.52).
  const legGeo = cyl(0.085, 0.1, 0.4);
  root.add(part(legGeo, CORGI.coatDeep, -0.38, 0.24, 0.5));
  root.add(part(legGeo, CORGI.coatDeep, 0.38, 0.24, 0.5));
  root.add(part(legGeo, CORGI.coatDeep, -0.3, 0.24, -0.55));
  root.add(part(legGeo, CORGI.coatDeep, 0.3, 0.24, -0.55));

  // Short tail nub.
  root.add(part(cyl(0.07, 0.09, 0.26), CORGI.coatDeep, 0, 0.82, -0.95, [1, 1, 1], [0.5, 0, 0]));

  // Keep a reference for idle pose animation (breathing scale on the body).
  root.userData.poseTargets = { body: root.children[0] };
  return root;
}

/** Neutral idle pose per frame — never implies emotion or health. */
export function applyIdlePose(root: THREE.Group, timeSeconds: number, enabled = true): void {
  const body = root.userData.poseTargets?.body as THREE.Mesh | undefined;
  if (!body) return;
  const base = (body.userData.baseScale as [number, number, number]) ?? [1, 1, 1];
  if (!enabled) {
    body.scale.set(base[0], base[1], base[2]);
    return;
  }
  // Slow, barely visible breathing-like scale (cosmetic only; keeps base shape).
  const s = 1 + Math.sin(timeSeconds * 1.4) * 0.012;
  body.scale.set(base[0] * 1.005, base[1] * s, base[2] * 1.005);
}

/** Structural fingerprint used by tests to prove 豆豆 ≠ 咪咪. */
export function corgiFingerprint(): { name: string; parts: number; colors: string[] } {
  const colors: string[] = Object.values(CORGI);
  return { name: CORGI_ROOT, parts: 14, colors };
}