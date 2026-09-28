/**
 * rig — skeletal joint hierarchy for the PLI twin (R2P3D-R1 §41/§61).
 *
 * A quadruped rig built from named THREE.Group joints (hip/shoulder/knee/
 * neck/head/ear/tail). Mesh parts are children of joints, so every clip
 * animates actual joints (legs swing at shoulder/hip, knees bend, head nods,
 * tail curves) — never a whole-model float. Morph params scale the segment
 * lengths so the same rig fits corgi-like, standard dog and cat templates.
 * PRESENTATION ONLY — never a fact source.
 */
import * as THREE from "three";
import { type PetMorphParams, type TwinTemplateFamily } from "./morph";

export type JointName =
  | "root"
  | "torso"
  | "neck"
  | "head"
  | "earL"
  | "earR"
  | "tail0"
  | "tail1"
  | "shoulderFL"
  | "kneeFL"
  | "shoulderFR"
  | "kneeFR"
  | "hipBL"
  | "kneeBL"
  | "hipBR"
  | "kneeBR";

export interface JointSpec {
  name: JointName;
  parent: JointName | null;
  /** Local position relative to parent. */
  pos: [number, number, number];
  /** Local rotation (radians). */
  rot?: [number, number, number];
}

const DOG_JOINTS: JointSpec[] = [
  { name: "root", parent: null, pos: [0, 0, 0] },
  { name: "torso", parent: "root", pos: [0, 0.42, 0] },
  { name: "neck", parent: "torso", pos: [0, 0.34, 0.42] },
  { name: "head", parent: "neck", pos: [0, 0.12, 0.3] },
  { name: "earL", parent: "head", pos: [-0.22, 0.22, -0.02] },
  { name: "earR", parent: "head", pos: [0.22, 0.22, -0.02] },
  { name: "tail0", parent: "torso", pos: [0, 0.18, -0.52] },
  { name: "tail1", parent: "tail0", pos: [0, 0.08, -0.22] },
  // front legs attach at the chest.
  { name: "shoulderFL", parent: "torso", pos: [-0.34, 0.02, 0.34] },
  { name: "kneeFL", parent: "shoulderFL", pos: [0, -0.22, 0] },
  { name: "shoulderFR", parent: "torso", pos: [0.34, 0.02, 0.34] },
  { name: "kneeFR", parent: "shoulderFR", pos: [0, -0.22, 0] },
  // hind legs attach at the pelvis.
  { name: "hipBL", parent: "torso", pos: [-0.36, -0.02, -0.36] },
  { name: "kneeBL", parent: "hipBL", pos: [0, -0.2, 0] },
  { name: "hipBR", parent: "torso", pos: [0.36, -0.02, -0.36] },
  { name: "kneeBR", parent: "hipBR", pos: [0, -0.2, 0] },
];

/** Same joint graph; cat-specific proportions are expressed via morph. */
const CAT_JOINTS: JointSpec[] = DOG_JOINTS.map((j) => ({ ...j }));

export interface TwinRig {
  joints: Record<JointName, THREE.Group>;
  /** Pose the model in 3D space; meshes attach as children of joint nodes. */
  addPart(joint: JointName, mesh: THREE.Mesh): void;
  /** Normalize to ground: lowest joint world y is moved to 0. */
  setGround(): void;
  family: TwinTemplateFamily;
  morph: PetMorphParams;
}

function buildJointGraph(specs: JointSpec[]): Record<JointName, THREE.Group> {
  const joints = {} as Record<JointName, THREE.Group>;
  const nodes = new Map<string, THREE.Group>();
  for (const s of specs) {
    const g = new THREE.Group();
    g.name = `joint_${s.name}`;
    g.position.set(s.pos[0], s.pos[1], s.pos[2]);
    if (s.rot) g.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
    nodes.set(s.name, g);
    joints[s.name] = g;
  }
  for (const s of specs) {
    if (s.parent && nodes.has(s.parent)) {
      nodes.get(s.parent)!.add(nodes.get(s.name)!);
    }
  }
  return joints;
}

/** Build the twin rig. Meshes must be added afterwards via addPart(). */
export function buildTwinRig(family: TwinTemplateFamily, morph: PetMorphParams): TwinRig {
  const specs = family === "standard-cat" ? CAT_JOINTS : DOG_JOINTS;
  const joints = buildJointGraph(specs);

  // Apply morph: scale the torso capsule + limb lengths.
  const torso = joints.torso;
  torso.scale.set(
    1 + (morph.chest_width - 1) * 0.5,
    1 + (morph.body_height - 1) * 0.5,
    1 + (morph.body_length - 1) * 0.55,
  );
  const neck = joints.neck;
  neck.position.z = 0.42 * morph.neck_length;
  const head = joints.head;
  head.scale.set(morph.head_width, morph.head_scale, 1 + (morph.muzzle_length - 1) * 0.4);
  // ears (dog upright / cat upright; drop for retriever via ear_angle)
  for (const e of ["earL", "earR"] as const) {
    joints[e].scale.set(morph.ear_width, morph.ear_length, 1);
    joints[e].rotation.z += morph.ear_angle;
  }
  // legs: length via knee offset; thickness via knee scale.
  for (const k of ["kneeFL", "kneeFR", "kneeBL", "kneeBR"] as const) {
    const front = k.endsWith("FL") || k.endsWith("FR");
    const len = front ? morph.leg_length_front : morph.leg_length_back;
    joints[k].position.y = -0.22 * len;
    joints[k].scale.set(1 + (morph.paw_scale - 1) * 0.4, 1, 1);
  }
  // tail
  const tail0 = joints.tail0;
  tail0.scale.set(morph.tail_thickness, morph.tail_thickness, 1);
  tail0.position.z = -0.52 * Math.max(0.6, morph.tail_length * 0.8);
  joints.tail1.scale.set(morph.tail_thickness, morph.tail_thickness, 1);
  joints.tail1.position.z = -0.22 * morph.tail_length;
  joints.tail0.rotation.x = -morph.tail_curve * 0.5;
  joints.tail1.rotation.x = -morph.tail_curve * 0.5;

  const rig: TwinRig = {
    joints,
    addPart(joint, mesh) {
      joints[joint].add(mesh);
    },
    setGround() {
      const box = new THREE.Box3().setFromObject(joints.root);
      const minY = box.min.y;
      joints.root.position.y -= minY;
    },
    family,
    morph: { ...morph },
  };
  // Mirror side joints symmetrically: default specs already symmetric.
  return rig;
}

/** Reset a rig to its bind pose (used before evaluating a pose). */
export function resetRigPose(rig: TwinRig): void {
  for (const name of Object.keys(rig.joints) as JointName[]) {
    const j = rig.joints[name];
    j.position.set(0, 0, 0);
    j.rotation.set(0, 0, 0);
    j.scale.set(1, 1, 1);
  }
  // Re-apply morph placements that define the bind pose.
  const m = rig.morph;
  rig.joints.torso.scale.set(
    1 + (m.chest_width - 1) * 0.5,
    1 + (m.body_height - 1) * 0.5,
    1 + (m.body_length - 1) * 0.55,
  );
  rig.joints.neck.position.z = 0.42 * m.neck_length;
  rig.joints.head.scale.set(m.head_width, m.head_scale, 1 + (m.muzzle_length - 1) * 0.4);
  for (const e of ["earL", "earR"] as const) {
    rig.joints[e].scale.set(m.ear_width, m.ear_length, 1);
    rig.joints[e].rotation.z += m.ear_angle;
  }
  for (const k of ["kneeFL", "kneeFR", "kneeBL", "kneeBR"] as const) {
    const front = k.endsWith("FL") || k.endsWith("FR");
    const len = front ? m.leg_length_front : m.leg_length_back;
    rig.joints[k].position.y = -0.22 * len;
  }
  rig.joints.tail0.scale.set(m.tail_thickness, m.tail_thickness, 1);
  rig.joints.tail0.position.z = -0.52 * Math.max(0.6, m.tail_length * 0.8);
  rig.joints.tail1.scale.set(m.tail_thickness, m.tail_thickness, 1);
  rig.joints.tail1.position.z = -0.22 * m.tail_length;
  rig.joints.tail0.rotation.x = -m.tail_curve * 0.5;
  rig.joints.tail1.rotation.x = -m.tail_curve * 0.5;
}

export function jointCount(rig: TwinRig): number {
  return Object.keys(rig.joints).length;
}