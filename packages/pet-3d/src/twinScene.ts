/**
 * twinScene — individual pet twin scene builder (R2P3D-R1 §24–§27).
 *
 * Composes the shared rig (packages/pet-3d/src/rig.ts) with procedural
 * primitive meshes whose material colors come from a per-region texture
 * projection produced by the backend (observed photo regions => real color;
 * inferred regions => template default). The result is a deterministic,
 * animatable, GLB-exportable individual representation. PRESENTATION ONLY.
 */
import * as THREE from "three";
import { resolveTemplate, type PetMorphParams, type TwinTemplateFamily } from "./morph";
import { buildTwinRig, jointCount, resetRigPose, type TwinRig } from "./rig";
import { applyPose, type PoseName } from "./motion";

/** Per-region base colors (hex) from the backend texture projection. */
export interface TwinTextureRegions {
  /** Observed regions are keyed by region name with hex colors. */
  observed?: Record<string, string>;
  /** Inferred regions (template default colors). */
  inferred?: Record<string, string>;
}

export interface TwinDescriptor {
  family: TwinTemplateFamily;
  morph?: Partial<PetMorphParams>;
  texture?: TwinTextureRegions;
  /** Version/provenance metadata shown only in dev surfaces. */
  version?: number;
  provenance?: string;
}

export interface TwinScene {
  pet: THREE.Group;
  /** Soft contact shadow (does not rotate with the pet). */
  shadow: THREE.Mesh;
  rig: TwinRig;
  setPose(pose: PoseName, timeSeconds: number): void;
  /** Ground-normalized world bounds. */
  bounds: { height: number; width: number; depth: number };
}

const REGION_DEFAULT: Record<string, string> = {
  coat: "#E8C79A",
  cream: "#FBF6EB",
  ear: "#C08A4E",
  nose: "#4A3A2C",
  eye: "#33241C",
  paw: "#F2D9AD",
  tail: "#D9A968",
};

function mat(color: string, rough = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 16);
const cyl = (rt: number, rb: number, h: number) => new THREE.CylinderGeometry(rt, rb, h, 12);
const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 10);

function part(
  geo: THREE.BufferGeometry,
  color: string,
  dx: number,
  dy: number,
  dz: number,
  scale?: [number, number, number],
  rot?: [number, number, number],
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(dx, dy, dz);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

/** Region color with observed priority, then template default, then palette. */
function colorFor(regions: TwinTextureRegions | undefined, name: string, fallback: string): string {
  if (regions?.observed && regions.observed[name]) return regions.observed[name]!;
  if (regions?.inferred && regions.inferred[name]) return regions.inferred[name]!;
  return REGION_DEFAULT[name] ?? fallback;
}

/** Build an individual twin: rig + primitive meshes with per-region colors. */
export function createTwinScene(descriptor: TwinDescriptor): TwinScene {
  const template = resolveTemplate(descriptor.family);
  const morph: PetMorphParams = { ...template.defaultMorph, ...(descriptor.morph ?? {}) };
  const tex = descriptor.texture ?? {};
  const isCat = template.species === "cat";
  const rig = buildTwinRig(template.family, morph);

  // Body (torso capsule).
  const bodyColor = colorFor(tex, "coat", isCat ? "#C9BFB2" : "#E8C79A");
  const body = part(sphere(0.6), bodyColor, 0, 0, 0, [1, 0.85, 1.3]).clone() as THREE.Mesh;
  body.name = "body";
  rig.addPart("torso", body);

  // Chest/cream patch (observed when photo projection exists).
  const creamColor = colorFor(tex, "cream", isCat ? "#EFE6DA" : "#FBF6EB");
  const chest = part(sphere(0.38), creamColor, 0, -0.05, 0.28, [0.9, 0.6, 1.1]);
  chest.name = "chest";
  rig.addPart("torso", chest);

  // Head + muzzle + eyes + nose (head region; shape via morph on joint).
  const headColor = colorFor(tex, "coat", bodyColor);
  const head = part(sphere(0.4), headColor, 0, 0.12, 0.28);
  head.name = "head";
  rig.addPart("head", head);

  const noseColor = colorFor(tex, "nose", "#4A3A2C");
  const muzzle = part(sphere(0.17), colorFor(tex, "cream", creamColor), 0, 0, 0.5, [1, 0.7, 0.9]);
  muzzle.name = "muzzle";
  rig.addPart("head", muzzle);
  const nose = part(sphere(0.075), noseColor, 0, 0.04, 0.62, [1, 0.85, 0.8]);
  nose.name = "nose";
  rig.addPart("head", nose);
  const eyeColor = colorFor(tex, "eye", "#33241C");
  const eyeL = part(sphere(0.045), eyeColor, -0.15, 0.16, 0.46);
  eyeL.name = "eyeL";
  rig.addPart("head", eyeL);
  const eyeR = part(sphere(0.045), eyeColor, 0.15, 0.16, 0.46);
  eyeR.name = "eyeR";
  rig.addPart("head", eyeR);

  // Ears: cats -> pointed cones rotated outward; dogs -> upright cones.
  const earColor = colorFor(tex, "ear", isCat ? "#D9B8B0" : "#C08A4E");
  const earL = part(cone(0.17, isCat ? 0.55 : 0.45), earColor, 0, 0.25, 0, [1, 1.15, 0.8]);
  earL.name = "earL";
  rig.addPart("earL", earL);
  const earR = part(cone(0.17, isCat ? 0.55 : 0.45), earColor, 0, 0.25, 0, [1, 1.15, 0.8]);
  earR.name = "earR";
  rig.addPart("earR", earR);
  const innerColor = colorFor(tex, "ear", earColor);
  const innerL = part(cone(0.09, 0.26), innerColor, 0, 0.16, 0, [1, 0.9, 0.7]);
  innerL.name = "earInnerL";
  rig.addPart("earL", innerL);
  const innerR = part(cone(0.09, 0.26), innerColor, 0, 0.16, 0, [1, 0.9, 0.7]);
  innerR.name = "earInnerR";
  rig.addPart("earR", innerR);

  // Legs: one upper segment at the shoulder/hip joint, lower + paw at knee.
  const legColor = colorFor(tex, "coat", bodyColor);
  const pawColor = colorFor(tex, "paw", "#F2D9AD");
  const legs = [
    { knee: "kneeFL" as const, shoulder: "shoulderFL" as const },
    { knee: "kneeFR" as const, shoulder: "shoulderFR" as const },
    { knee: "kneeBL" as const, shoulder: "hipBL" as const },
    { knee: "kneeBR" as const, shoulder: "hipBR" as const },
  ];
  for (const leg of legs) {
    const upper = part(cyl(0.09, 0.08, 0.24), legColor, 0, -0.11, 0);
    upper.name = `leg_${leg.knee}`;
    rig.addPart(leg.shoulder, upper);
    const lower = part(cyl(0.08, 0.07, 0.2), legColor, 0, -0.2, 0);
    lower.name = `lower_${leg.knee}`;
    rig.addPart(leg.knee, lower);
    const paw = part(sphere(0.08), pawColor, 0, -0.26, 0.02, [1.3, 0.7, 1.5]);
    paw.name = `paw_${leg.knee}`;
    rig.addPart(leg.knee, paw);
  }

  // Tail: two-segment curly/straight via joint rotations + thickness.
  const tailColor = colorFor(tex, "tail", bodyColor);
  const tail0 = part(cyl(0.07, 0.06, 0.24), tailColor, 0, 0.06, -0.08);
  tail0.name = "tail0";
  rig.addPart("tail0", tail0);
  const tail1 = part(cyl(0.06, 0.03, 0.22), tailColor, 0, 0.06, -0.12, undefined, [0.35, 0, 0]);
  tail1.name = "tail1";
  rig.addPart("tail1", tail1);

  // Normalize to the ground and center the pet on X/Z.
  rig.setGround();
  const box = new THREE.Box3().setFromObject(rig.joints.root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  rig.joints.root.position.x -= center.x;
  rig.joints.root.position.z -= center.z;

  // NOTE: the root joint keeps the name "joint_root" so GLB animation tracks
  // (joint_root.quaternion / .position) resolve during export.
  const pet = rig.joints.root;
  const bounds = { height: size.y, width: size.x, depth: size.z };

  // Soft contact shadow on the ground plane (matches demo stage behavior).
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 48),
    new THREE.MeshBasicMaterial({
      color: 0x2a2018,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  shadow.name = "petContactShadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.scale.set(1, 1, 1.1 + (morph.body_length - 1) * 0.5);

  const scene: TwinScene = {
    pet,
    shadow,
    rig,
    setPose(pose: PoseName, t: number) {
      resetRigPose(rig);
      if (pose !== "Stand") applyPose(rig, pose, t);
    },
    bounds,
  };
  return scene;
}

/** Structural fingerprint: family + joint count + part count (QA/tests). */
export function twinFingerprint(scene: TwinScene): { family: string; joints: number; parts: number } {
  let parts = 0;
  scene.pet.traverse((o) => {
    if ((o as { isMesh?: boolean }).isMesh) parts += 1;
  });
  return { family: scene.rig.family, joints: jointCount(scene.rig), parts };
}

export { jointCount };