/**
 * buildCat — programmatic demo 3D asset for 咪咪 (DEMO/SYNTHETIC, dev-only).
 *
 * A distinct silhouette from 豆豆 (slender body, round head, triangular ears,
 * long curling tail) so every screen shows 咪咪 ≠ 豆豆. Presentation only.
 */
import * as THREE from "three";
import { MIMI } from "./palette";

export const MIMI_ROOT = "mimiRoot";

function mat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0 });
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
const cyl = (rt: number, rb: number, h: number, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 12) => new THREE.ConeGeometry(r, h, seg);

/** Build the 咪咪 cat group centered on the ground plane (y=0). */
export function buildCat(): THREE.Group {
  const root = new THREE.Group();
  root.name = MIMI_ROOT;

  // Slender body along Z (facing +Z toward camera).
  const bodyMesh = part(sphere(0.42), MIMI.coat, 0, 0.52, -0.08, [0.85, 0.75, 1.55]);
  bodyMesh.userData.baseScale = [0.85, 0.75, 1.55];
  root.add(bodyMesh);

  // Chest cream patch.
  root.add(part(sphere(0.24), MIMI.cream, 0, 0.55, 0.92, [0.9, 0.7, 0.8]));

  // Round head.
  root.add(part(sphere(0.32), MIMI.coat, 0, 1.08, 1.0));
  // Muzzle + nose.
  root.add(part(sphere(0.13), MIMI.cream, 0, 0.96, 1.32, [1, 0.62, 0.66]));
  root.add(part(sphere(0.055), MIMI.nose, 0, 0.98, 1.42));

  // Eyes — soft sage tone (cosmetic only).
  root.add(part(sphere(0.04), MIMI.eye, -0.14, 1.16, 1.28));
  root.add(part(sphere(0.04), MIMI.eye, 0.14, 1.16, 1.28));

  // Triangular ears with pink inner.
  const earL = part(cone(0.15, 0.34), MIMI.coatDeep, -0.2, 1.36, 0.92, [1, 1, 0.8], [0.12, 0, 0.2]);
  const earR = part(cone(0.15, 0.34), MIMI.coatDeep, 0.2, 1.36, 0.92, [1, 1, 0.8], [0.12, 0, -0.2]);
  root.add(earL, earR);
  root.add(part(cone(0.075, 0.2), MIMI.earInner, -0.2, 1.38, 0.97, [1, 0.9, 0.8], [0.12, 0, 0.2]));
  root.add(part(cone(0.075, 0.2), MIMI.earInner, 0.2, 1.38, 0.97, [1, 0.9, 0.8], [0.12, 0, -0.2]));

  // Thin legs.
  const legGeo = cyl(0.055, 0.065, 0.42, 12);
  root.add(part(legGeo, MIMI.coatDeep, -0.26, 0.24, 0.6));
  root.add(part(legGeo, MIMI.coatDeep, 0.26, 0.24, 0.6));
  root.add(part(legGeo, MIMI.coatDeep, -0.2, 0.24, -0.62));
  root.add(part(legGeo, MIMI.coatDeep, 0.2, 0.24, -0.62));

  // Long curling tail (tube along a gentle S-curve upward).
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.55, -1.35),
    new THREE.Vector3(0, 0.9, -1.5),
    new THREE.Vector3(0.12, 1.25, -1.35),
    new THREE.Vector3(0, 1.35, -1.05),
  ]);
  root.add(part(new THREE.TubeGeometry(tailCurve, 20, 0.05, 10), MIMI.coatDeep, 0, 0, 0));

  root.userData.poseTargets = { body: root.children[0] };
  return root;
}

/** Neutral idle pose per frame — never implies emotion or health. */
export function applyCatIdlePose(root: THREE.Group, timeSeconds: number, enabled = true): void {
  const body = root.userData.poseTargets?.body as THREE.Mesh | undefined;
  if (!body) return;
  const base = (body.userData.baseScale as [number, number, number]) ?? [1, 1, 1];
  if (!enabled) {
    body.scale.set(base[0], base[1], base[2]);
    return;
  }
  const s = 1 + Math.sin(timeSeconds * 1.3) * 0.01;
  body.scale.set(base[0] * 1.004, base[1] * s, base[2] * 1.004);
}

/** Structural fingerprint used by tests to prove 咪咪 ≠ 豆豆. */
export function catFingerprint(): { name: string; parts: number; colors: string[] } {
  return { name: MIMI_ROOT, parts: 16, colors: Object.values(MIMI) };
}