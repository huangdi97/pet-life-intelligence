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

function mat(color: string, rough = 0.86): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0,
  });
  material.flatShading = false;
  return material;
}

const sphere = (r: number) => new THREE.SphereGeometry(r, 32, 24);
const cyl = (rt: number, rb: number, h: number) => new THREE.CylinderGeometry(rt, rb, h, 20);
const cone = (r: number, h: number) => new THREE.ConeGeometry(r, h, 20);

function tint(color: string, toward: string, amount: number): string {
  const mixed = new THREE.Color(color).lerp(new THREE.Color(toward), Math.max(0, Math.min(1, amount)));
  return `#${mixed.getHexString()}`;
}

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

function validHexColor(value: string | undefined): value is string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Region color with observed priority, then inferred hex, then palette.
 *
 * Backend metadata-only descriptors deliberately use provenance tokens such
 * as "template_default" in inferred regions. Those tokens are NOT colors and
 * must never be passed to THREE.Color (which otherwise logs warnings and can
 * yield misleading fallback materials). Surface provenance is carried by the
 * descriptor's separate surface/inferred_regions fields.
 */
function colorFor(regions: TwinTextureRegions | undefined, name: string, fallback: string): string {
  const observed = regions?.observed?.[name];
  if (validHexColor(observed)) return observed;
  const inferred = regions?.inferred?.[name];
  if (validHexColor(inferred)) return inferred;
  return REGION_DEFAULT[name] ?? fallback;
}

/** Build an individual twin: rig + primitive meshes with per-region colors. */
export function createTwinScene(descriptor: TwinDescriptor): TwinScene {
  const template = resolveTemplate(descriptor.family);
  const morph: PetMorphParams = { ...template.defaultMorph, ...(descriptor.morph ?? {}) };
  const tex = descriptor.texture ?? {};
  const isCat = template.species === "cat";
  const rig = buildTwinRig(template.family, morph);

  // Torso is deliberately composed from overlapping organic masses rather
  // than one primitive. The rig still owns animation, while chest/waist/haunch
  // volumes make owner-media morphs visible in the silhouette.
  const bodyColor = colorFor(tex, "coat", isCat ? "#C9BFB2" : "#E8C79A");
  const creamColor = colorFor(tex, "cream", isCat ? "#EFE6DA" : "#FBF6EB");
  const waistRatio = THREE.MathUtils.clamp(
    morph.waist_width / Math.max(0.35, morph.chest_width),
    0.58,
    1.12,
  );

  const torsoCore = part(sphere(0.58), bodyColor, 0, 0, 0, [1.0, 0.78, 1.22]);
  torsoCore.name = "torsoCore";
  rig.addPart("torso", torsoCore);

  const chestMass = part(sphere(0.44), bodyColor, 0, 0.05, 0.28, [1.04, 0.92, 0.88]);
  chestMass.name = "chestMass";
  rig.addPart("torso", chestMass);

  const abdomen = part(sphere(0.46), bodyColor, 0, -0.02, -0.16, [waistRatio, 0.70, 0.96]);
  abdomen.name = "abdomen";
  rig.addPart("torso", abdomen);

  const haunchColor = tint(bodyColor, "#6A4B32", 0.05);
  const haunchL = part(sphere(0.28), haunchColor, -0.25, -0.04, -0.31, [1.0, 0.92, 1.12]);
  const haunchR = part(sphere(0.28), haunchColor, 0.25, -0.04, -0.31, [1.0, 0.92, 1.12]);
  haunchL.name = "haunchL";
  haunchR.name = "haunchR";
  rig.addPart("torso", haunchL);
  rig.addPart("torso", haunchR);

  // The chest marking is a shallow surface mass, not a floating HUD decal.
  const chest = part(sphere(0.34), creamColor, 0, -0.05, 0.39, [0.86, 0.66, 0.66]);
  chest.name = "chest";
  rig.addPart("torso", chest);

  // Neck bridge visually connects torso and skull during head motion.
  const neckBridge = part(sphere(0.26), bodyColor, 0, 0.02, 0.10, [0.88, 0.92, 1.12]);
  neckBridge.name = "neckBridge";
  rig.addPart("neck", neckBridge);

  // Head: skull + cheek masses + muzzle. These overlapping smooth volumes
  // avoid the toy-like single-sphere head while remaining deterministic and
  // compatible with the existing head joint / owner-media region colors.
  const headColor = colorFor(tex, "face", colorFor(tex, "coat", bodyColor));
  const skull = part(sphere(0.39), headColor, 0, 0.12, 0.27, [1.02, 0.98, 0.94]);
  skull.name = "head";
  rig.addPart("head", skull);

  const cheekColor = tint(headColor, creamColor, isCat ? 0.10 : 0.05);
  const cheekL = part(sphere(0.19), cheekColor, -0.18, 0.01, 0.41, [0.96, 0.74, 0.92]);
  const cheekR = part(sphere(0.19), cheekColor, 0.18, 0.01, 0.41, [0.96, 0.74, 0.92]);
  cheekL.name = "cheekL";
  cheekR.name = "cheekR";
  rig.addPart("head", cheekL);
  rig.addPart("head", cheekR);

  const noseColor = colorFor(tex, "nose", "#4A3A2C");
  const muzzle = part(
    sphere(isCat ? 0.15 : 0.18),
    creamColor,
    0,
    -0.015,
    0.51,
    isCat ? [1.14, 0.72, 0.76] : [1.0, 0.72, 0.92],
  );
  muzzle.name = "muzzle";
  rig.addPart("head", muzzle);

  const chin = part(sphere(isCat ? 0.10 : 0.115), tint(creamColor, "#FFFFFF", 0.08), 0, -0.12, 0.48, [1.1, 0.55, 0.8]);
  chin.name = "chin";
  rig.addPart("head", chin);

  const nose = part(sphere(isCat ? 0.055 : 0.072), noseColor, 0, 0.025, 0.64, [1.08, 0.78, 0.72]);
  nose.name = "nose";
  rig.addPart("head", nose);

  const eyeColor = colorFor(tex, "eye", "#33241C");
  const eyeL = part(sphere(0.047), eyeColor, -0.15, 0.17, 0.48, [1.0, 1.03, 0.74]);
  eyeL.name = "eyeL";
  rig.addPart("head", eyeL);
  const eyeR = part(sphere(0.047), eyeColor, 0.15, 0.17, 0.48, [1.0, 1.03, 0.74]);
  eyeR.name = "eyeR";
  rig.addPart("head", eyeR);

  // Tiny catchlights improve eye readability under the warm stage without
  // implying any observed eye detail that was not captured.
  const catchlight = "#FFFDF7";
  const eyeGlintL = part(sphere(0.011), catchlight, -0.163, 0.184, 0.515);
  const eyeGlintR = part(sphere(0.011), catchlight, 0.137, 0.184, 0.515);
  eyeGlintL.name = "eyeGlintL";
  eyeGlintR.name = "eyeGlintR";
  rig.addPart("head", eyeGlintL);
  rig.addPart("head", eyeGlintR);

  // Ears use family-aware forms: cats/upright dogs keep a tapered pinna,
  // while retriever-like dogs receive a softer hanging oval.
  const earColor = colorFor(tex, "ear", isCat ? "#D9B8B0" : "#C08A4E");
  const innerColor = tint(earColor, isCat ? "#F2C7C3" : "#7B4B36", isCat ? 0.28 : 0.18);
  const floppyDog = template.family === "retriever-dog";
  for (const side of ["L", "R"] as const) {
    const joint = side === "L" ? "earL" : "earR";
    const outer = floppyDog
      ? part(sphere(0.17), earColor, 0, 0.03, 0.015, [0.80, 1.48, 0.45], [0.20, 0, side === "L" ? 0.16 : -0.16])
      : part(cone(0.17, isCat ? 0.55 : 0.45), earColor, 0, 0.25, 0, [1, 1.15, 0.78]);
    outer.name = `ear${side}`;
    rig.addPart(joint, outer);

    const inner = floppyDog
      ? part(sphere(0.105), innerColor, 0, 0.025, 0.08, [0.62, 1.20, 0.22], [0.20, 0, side === "L" ? 0.16 : -0.16])
      : part(cone(0.09, isCat ? 0.31 : 0.27), innerColor, 0, 0.17, 0.045, [1, 0.92, 0.62]);
    inner.name = `earInner${side}`;
    rig.addPart(joint, inner);
  }

  // Legs: rounded shoulder/hip transitions + tapered limbs + compact paws.
  // Joint ownership stays unchanged, so all twelve existing motion clips remain
  // compatible while the static silhouette becomes substantially less robotic.
  const legColor = colorFor(tex, "coat", bodyColor);
  const pawColor = colorFor(tex, "paw", "#F2D9AD");
  const legs = [
    { knee: "kneeFL" as const, shoulder: "shoulderFL" as const, hind: false },
    { knee: "kneeFR" as const, shoulder: "shoulderFR" as const, hind: false },
    { knee: "kneeBL" as const, shoulder: "hipBL" as const, hind: true },
    { knee: "kneeBR" as const, shoulder: "hipBR" as const, hind: true },
  ];
  for (const leg of legs) {
    const jointMass = part(
      sphere(leg.hind ? 0.145 : 0.125),
      legColor,
      0,
      -0.015,
      0,
      leg.hind ? [1.12, 1.0, 1.18] : [1.0, 1.05, 1.0],
    );
    jointMass.name = `joint_${leg.knee}`;
    rig.addPart(leg.shoulder, jointMass);

    const upper = part(cyl(0.095, 0.075, 0.25), legColor, 0, -0.115, 0);
    upper.name = `leg_${leg.knee}`;
    rig.addPart(leg.shoulder, upper);

    const lower = part(cyl(0.078, 0.058, 0.21), legColor, 0, -0.205, 0.012);
    lower.name = `lower_${leg.knee}`;
    rig.addPart(leg.knee, lower);

    const paw = part(sphere(0.09), pawColor, 0, -0.275, 0.055, [1.35, 0.62, 1.62]);
    paw.name = `paw_${leg.knee}`;
    rig.addPart(leg.knee, paw);
  }

  // Tail: tapered overlapping masses hide the hard hinge between two animated
  // tail joints while preserving the existing curve/length morph semantics.
  const tailColor = colorFor(tex, "tail", bodyColor);
  const tail0 = part(cyl(0.075, 0.058, isCat ? 0.31 : 0.25), tailColor, 0, 0.06, -0.09, undefined, [0.30, 0, 0]);
  tail0.name = "tail0";
  rig.addPart("tail0", tail0);
  const tailJoint = part(sphere(0.072), tailColor, 0, 0.10, -0.10, [1, 1.05, 1]);
  tailJoint.name = "tailJoint";
  rig.addPart("tail0", tailJoint);
  const tail1 = part(cyl(0.058, 0.025, isCat ? 0.33 : 0.23), tailColor, 0, 0.08, -0.13, undefined, [0.42, 0, 0]);
  tail1.name = "tail1";
  rig.addPart("tail1", tail1);

  // overall_scale is part of the individual morph contract and must affect the
  // real owner Twin. Apply before grounding so y=0 remains physically correct.
  rig.joints.root.scale.setScalar(morph.overall_scale);

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
    new THREE.CircleGeometry(0.72, 48),
    new THREE.MeshBasicMaterial({
      color: 0x2a2018,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
    }),
  );
  shadow.name = "petContactShadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  shadow.scale.set(1, 1, 1.04 + (morph.body_length - 1) * 0.28);

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