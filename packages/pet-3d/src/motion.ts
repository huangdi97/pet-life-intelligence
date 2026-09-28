/**
 * motion — PLI twin action library (R2P3D-R1 §41/§44/§61/§65).
 *
 * 12 canonical clips defined as deterministic joint rotations over time.
 * Clips are real joint animations (shoulder/hip/knee/neck/head/tail), never
 * whole-model float. A single evaluator drives both the live three.js stage
 * and the GLB export path, so runtime pose == exported animation manifest.
 *
 * Truth model (R2P3D-R1 §44):
 *   AMBIENT        — idle / stand: digital presence, no claim about the pet.
 *   REPRESENTATIVE — from recorded events (WalkEvent -> Walk ...).
 *   OBSERVED       — only camera/real video/human-confirmed observation.
 * HEALTH NEVER ACTS AS A POSE SOURCE.
 */
import * as THREE from "three";
import { JointName } from "./rig";

export type PoseName =
  | "Idle"
  | "Stand"
  | "Sit"
  | "Lie"
  | "Sleep"
  | "Walk"
  | "Run"
  | "Eat"
  | "Drink"
  | "Play"
  | "Sniff"
  | "Stretch";

export const POSE_NAMES: PoseName[] = [
  "Idle", "Stand", "Sit", "Lie", "Sleep", "Walk",
  "Run", "Eat", "Drink", "Play", "Sniff", "Stretch",
];

export type PoseTruth = "AMBIENT" | "REPRESENTATIVE" | "OBSERVED";

export interface PoseMeta {
  name: PoseName;
  truth: PoseTruth;
  /** Human-friendly label for owner UI. */
  label: string;
  /** Representative event that maps to this pose ("" for AMBIENT). */
  fromEvent?: string;
}

export const POSE_META: Record<PoseName, PoseMeta> = {
  Idle: { name: "Idle", truth: "AMBIENT", label: "安静站立" },
  Stand: { name: "Stand", truth: "AMBIENT", label: "站立" },
  Sit: { name: "Sit", truth: "REPRESENTATIVE", label: "坐着", fromEvent: "behavior.sit" },
  Lie: { name: "Lie", truth: "REPRESENTATIVE", label: "趴着", fromEvent: "behavior.lie" },
  Sleep: { name: "Sleep", truth: "REPRESENTATIVE", label: "睡觉", fromEvent: "daily.sleep" },
  Walk: { name: "Walk", truth: "REPRESENTATIVE", label: "散步", fromEvent: "daily.walk" },
  Run: { name: "Run", truth: "REPRESENTATIVE", label: "跑动", fromEvent: "daily.play" },
  Eat: { name: "Eat", truth: "REPRESENTATIVE", label: "进食", fromEvent: "daily.meal" },
  Drink: { name: "Drink", truth: "REPRESENTATIVE", label: "饮水", fromEvent: "daily.drink" },
  Play: { name: "Play", truth: "REPRESENTATIVE", label: "玩耍", fromEvent: "daily.play" },
  Sniff: { name: "Sniff", truth: "OBSERVED", label: "嗅闻" },
  Stretch: { name: "Stretch", truth: "OBSERVED", label: "伸懒腰" },
};

export interface JointTransform {
  /** Rotation in radians, applied as Euler XYZ. */
  rot?: [number, number, number];
  /** Local position offset. */
  pos?: [number, number, number];
  /** Local scale. */
  scale?: [number, number, number];
}

/** Deterministic per-frame pose: joint name -> transform (identity when absent). */
export type PoseFrame = Partial<Record<JointName, JointTransform>>;

const SIN = Math.sin;

/** Leg rotation helper: shoulder/hip swing producing a real gait cycle. */
function legSwing(t: number, speed: number, phase: number, amp: number, kneeBend: number): { swing: number; knee: number } {
  return {
    swing: Math.sin(t * speed * Math.PI * 2 + phase) * amp,
    knee: Math.max(0, Math.cos(t * speed * Math.PI * 2 + phase)) * kneeBend,
  };
}

export interface PoseEvaluator {
  (t: number): PoseFrame;
}

/** 12 canonical pose evaluators (deterministic; t in seconds). */
export const POSE_FN: Record<PoseName, PoseEvaluator> = {
  // AMBIENT: presence only.
  Idle: (_t) => ({
    neck: { rot: [0.02, 0, 0] },
    head: { rot: [0.04, 0, 0] },
    tail0: { rot: [0.06 * Math.sin(_t * 1.6), 0, 0] },
    tail1: { rot: [-0.15 - 0.05 * Math.sin(_t * 1.6), 0, 0] },
  }),
  Stand: () => ({
    neck: { rot: [0, 0, 0] },
  }),
  Sit: () => ({
    shoulderFL: { rot: [-0.25, 0, 0] },
    shoulderFR: { rot: [-0.25, 0, 0] },
    kneeFL: { rot: [0.45, 0, 0] },
    kneeFR: { rot: [0.45, 0, 0] },
    hipBL: { rot: [-1.35, 0, 0] },
    hipBR: { rot: [-1.35, 0, 0] },
    kneeBL: { rot: [-1.25, 0, 0] },
    kneeBR: { rot: [-1.25, 0, 0] },
    torso: { pos: [0, -0.28, 0] },
    neck: { rot: [0.18, 0, 0] },
    head: { rot: [-0.08, 0, 0] },
  }),
  Lie: () => ({
    torso: { pos: [0, -0.3, 0] },
    shoulderFL: { rot: [-1.2, 0, 0] },
    shoulderFR: { rot: [-1.2, 0, 0] },
    kneeFL: { rot: [0.5, 0, 0] },
    kneeFR: { rot: [0.5, 0, 0] },
    hipBL: { rot: [-1.2, 0, 0] },
    hipBR: { rot: [-1.2, 0, 0] },
    kneeBL: { rot: [0.4, 0, 0] },
    kneeBR: { rot: [0.4, 0, 0] },
    neck: { rot: [0.1, 0, 0] },
  }),
  Sleep: (t) => ({
    torso: { pos: [0, -0.32, 0], scale: [1.02, 0.98 + Math.sin(t * 1.2) * 0.012, 1.02] },
    shoulderFL: { rot: [-1.25, 0, 0] },
    shoulderFR: { rot: [-1.25, 0, 0] },
    kneeFL: { rot: [0.55, 0, 0] },
    kneeFR: { rot: [0.55, 0, 0] },
    hipBL: { rot: [-1.25, 0, 0] },
    hipBR: { rot: [-1.25, 0, 0] },
    kneeBL: { rot: [0.45, 0, 0] },
    kneeBR: { rot: [0.45, 0, 0] },
    neck: { rot: [0.25, 0, 0] },
    head: { rot: [0.15, 0, 0] },
    tail0: { rot: [0.1, 0, 0] },
  }),
  // REPRESENTATIVE: gait cycles with diagonal phasing.
  Walk: (t) => {
    const f = legSwing(t, 1.1, 0, 0.55, 0.35);
    const r = legSwing(t, 1.1, Math.PI, 0.55, 0.35);
    const b = legSwing(t, 1.1, Math.PI * 0.5, 0.55, 0.35);
    const l = legSwing(t, 1.1, Math.PI * 1.5, 0.55, 0.35);
    return {
      root: { pos: [0, Math.abs(Math.sin(t * 1.1 * Math.PI * 2)) * 0.03, 0] },
      torso: { rot: [Math.sin(t * 1.1 * Math.PI * 2) * 0.04, 0, 0] },
      shoulderFL: { rot: [f.swing, 0.05, 0] },
      kneeFL: { rot: [f.knee, 0, 0] },
      shoulderFR: { rot: [r.swing, -0.05, 0] },
      kneeFR: { rot: [r.knee, 0, 0] },
      hipBL: { rot: [b.swing, 0.05, 0] },
      kneeBL: { rot: [b.knee, 0, 0] },
      hipBR: { rot: [l.swing, -0.05, 0] },
      kneeBR: { rot: [l.knee, 0, 0] },
      neck: { rot: [Math.sin(t * 2.2 * Math.PI) * 0.06, 0, 0] },
      tail1: { rot: [-0.2 + Math.sin(t * 6) * 0.1, 0, 0] },
    };
  },
  Run: (t) => {
    const f = legSwing(t, 1.9, 0, 0.95, 0.8);
    const r = legSwing(t, 1.9, Math.PI, 0.95, 0.8);
    const b = legSwing(t, 1.9, Math.PI * 0.5, 0.95, 0.8);
    const l = legSwing(t, 1.9, Math.PI * 1.5, 0.95, 0.8);
    return {
      root: { pos: [0, Math.abs(Math.sin(t * 1.9 * Math.PI * 2)) * 0.07, 0] },
      torso: { rot: [Math.sin(t * 1.9 * Math.PI * 2) * 0.09, 0, 0] },
      shoulderFL: { rot: [f.swing, 0.08, 0] },
      kneeFL: { rot: [f.knee, 0, 0] },
      shoulderFR: { rot: [r.swing, -0.08, 0] },
      kneeFR: { rot: [r.knee, 0, 0] },
      hipBL: { rot: [b.swing, 0.08, 0] },
      kneeBL: { rot: [b.knee, 0, 0] },
      hipBR: { rot: [l.swing, -0.08, 0] },
      kneeBR: { rot: [l.knee, 0, 0] },
      neck: { rot: [Math.sin(t * 3.8 * Math.PI) * 0.1, 0, 0] },
      tail1: { rot: [-0.3 + Math.sin(t * 10) * 0.15, 0, 0] },
    };
  },
  Eat: (t) => ({
    neck: { rot: [0.55 + Math.sin(t * 1.4) * 0.12, 0, 0] },
    head: { rot: [-0.15 + Math.sin(t * 2.8) * 0.08, 0, 0] },
    torso: { pos: [0, -0.12, 0] },
    tail1: { rot: [-0.1, 0, 0.1 + Math.sin(t * 3) * 0.05] },
  }),
  Drink: (t) => ({
    neck: { rot: [0.7 - Math.sin(t * 1.2) * 0.05, 0, 0] },
    head: { rot: [-0.35 - Math.sin(t * 2.4) * 0.06, 0, 0] },
    torso: { pos: [0, -0.14, 0] },
  }),
  Play: (t) => ({
    root: { pos: [0, Math.abs(Math.sin(t * 2.2)) * 0.06, Math.sin(t * 3) * 0.08] },
    torso: { rot: [0.1, 0, Math.sin(t * 3) * 0.18] },
    shoulderFL: { rot: [-0.4 + Math.sin(t * 2.2) * 0.2, 0, 0] },
    shoulderFR: { rot: [-0.4 - Math.sin(t * 2.2) * 0.2, 0, 0] },
    hipBL: { rot: [-0.5, 0, 0] },
    hipBR: { rot: [-0.5, 0, 0] },
    neck: { rot: [0.2, Math.sin(t * 2) * 0.25, 0] },
    tail1: { rot: [-0.3, 0, Math.sin(t * 8) * 0.3] },
  }),
  Sniff: (t) => ({
    neck: { rot: [0.35, Math.sin(t * 0.8) * 0.3, 0] },
    head: { rot: [-0.1, 0, 0] },
    torso: { pos: [0, -0.1, 0] },
  }),
  Stretch: (t) => {
    const s = Math.max(0, Math.sin(t * 1.1));
    return {
      torso: { pos: [0, -0.1 * s, 0], scale: [1 + 0.08 * s, 1 + 0.05 * s, 1.2 + 0.3 * s] },
      shoulderFL: { rot: [-0.9 * s, 0, 0] },
      shoulderFR: { rot: [-0.9 * s, 0, 0] },
      kneeFL: { rot: [0.35 * s, 0, 0] },
      kneeFR: { rot: [0.35 * s, 0, 0] },
      hipBL: { rot: [0.7 * s, 0, 0] },
      hipBR: { rot: [0.7 * s, 0, 0] },
      neck: { rot: [-0.35 * s, 0, 0] },
    };
  },
};


export interface PoseClipData {
  name: PoseName;
  truth: PoseTruth;
  durationSeconds: number;
  loop: boolean;
  /** Bone rotation channels actually used (for QA). */
  channels: JointName[];
}

function collectChannels(fn: PoseEvaluator, samples = 12): JointName[] {
  const names = new Set<JointName>();
  for (let i = 0; i < samples; i++) {
    const f = fn(i / samples);
    for (const k of Object.keys(f) as JointName[]) names.add(k);
  }
  return Array.from(names);
}

/** Clip determinism/preview config exposed to UI + QA. */
export const POSE_CLIPS: Record<PoseName, PoseClipData> = {
  Idle: { name: "Idle", truth: "AMBIENT", durationSeconds: 8, loop: true, channels: collectChannels(POSE_FN.Idle) },
  Stand: { name: "Stand", truth: "AMBIENT", durationSeconds: 4, loop: true, channels: [] },
  Sit: { name: "Sit", truth: "REPRESENTATIVE", durationSeconds: 6, loop: true, channels: collectChannels(POSE_FN.Sit) },
  Lie: { name: "Lie", truth: "REPRESENTATIVE", durationSeconds: 8, loop: true, channels: collectChannels(POSE_FN.Lie) },
  Sleep: { name: "Sleep", truth: "REPRESENTATIVE", durationSeconds: 12, loop: true, channels: collectChannels(POSE_FN.Sleep) },
  Walk: { name: "Walk", truth: "REPRESENTATIVE", durationSeconds: 3, loop: true, channels: collectChannels(POSE_FN.Walk) },
  Run: { name: "Run", truth: "REPRESENTATIVE", durationSeconds: 2, loop: true, channels: collectChannels(POSE_FN.Run) },
  Eat: { name: "Eat", truth: "REPRESENTATIVE", durationSeconds: 6, loop: true, channels: collectChannels(POSE_FN.Eat) },
  Drink: { name: "Drink", truth: "REPRESENTATIVE", durationSeconds: 5, loop: true, channels: collectChannels(POSE_FN.Drink) },
  Play: { name: "Play", truth: "REPRESENTATIVE", durationSeconds: 4, loop: true, channels: collectChannels(POSE_FN.Play) },
  Sniff: { name: "Sniff", truth: "OBSERVED", durationSeconds: 7, loop: true, channels: collectChannels(POSE_FN.Sniff) },
  Stretch: { name: "Stretch", truth: "OBSERVED", durationSeconds: 5, loop: false, channels: collectChannels(POSE_FN.Stretch) },
};

/**
 * Apply a pose frame to the rig at time t. Any pose not listed in POSE_NAMES
 * falls back to Idle. Health state never selects a pose here.
 */
export function applyPose(rig: any, pose: PoseName, t: number): void {
  const fn = POSE_FN[pose] ?? POSE_FN.Idle;
  const frame = fn(t);
  for (const name of Object.keys(frame) as JointName[]) {
    const joint = rig.joints[name];
    if (!joint) continue;
    const x = frame[name]!;
    if (x.rot) joint.rotation.set(x.rot[0], x.rot[1], x.rot[2]);
    if (x.pos) {
      joint.position.x = x.pos[0];
      joint.position.y = x.pos[1];
      joint.position.z = x.pos[2];
    }
    if (x.scale) joint.scale.set(x.scale[0], x.scale[1], x.scale[2]);
  }
}

/**
 * Build a THREE.AnimationClip for export/QA. The clip stores quaternion
 * rotation keys for each affected joint, sampled at 8 fps over duration
 * (glTF uses quaternions; VectorKeyframeTrack on Euler .rotation is not
 * exportable by GLTFExporter).
 */
export function buildClip(pose: PoseName): THREE.AnimationClip {
  const meta = POSE_CLIPS[pose];
  const fn = POSE_FN[pose];
  const fps = 8;
  const frames = Math.max(2, Math.round(meta.durationSeconds * fps));
  const tracks: THREE.KeyframeTrack[] = [];
  const joints = meta.channels.length > 0 ? meta.channels : collectChannels(fn, frames);

  for (const joint of joints) {
    const times: number[] = [];
    const values: number[] = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < frames; i++) {
      const t = (i / (frames - 1)) * meta.durationSeconds;
      const frame = fn(t);
      const j = frame[joint] ?? {};
      const rot = j.rot ?? [0, 0, 0];
      e.set(rot[0], rot[1], rot[2]);
      q.setFromEuler(e);
      times.push(t);
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`joint_${joint}.quaternion`, times, values));
  }
  return new THREE.AnimationClip(pose, meta.durationSeconds, tracks);
}

/** Animation manifest (JSON-serializable) used by QA + UI truth labels. */
export function motionManifest(): { clips: PoseClipData[]; names: PoseName[]; truth: Record<PoseName, PoseTruth> } {
  return {
    clips: POSE_NAMES.map((n) => ({ ...POSE_CLIPS[n], channels: [...POSE_CLIPS[n].channels] })),
    names: [...POSE_NAMES],
    truth: Object.fromEntries(POSE_NAMES.map((n) => [n, POSE_META[n].truth])) as Record<PoseName, PoseTruth>,
  };
}

/** Map a life event type to its representative pose (REPRESENTATIVE only). */
export function poseForEvent(eventType: string | null | undefined): PoseName | null {
  if (!eventType) return null;
  if (eventType.includes("meal")) return "Eat";
  if (eventType.includes("drink")) return "Drink";
  if (eventType.includes("sleep")) return "Sleep";
  if (eventType.includes("play") || eventType.includes("run")) return "Play";
  if (eventType.includes("walk")) return "Walk";
  if (eventType.includes("sit")) return "Sit";
  if (eventType.includes("lie")) return "Lie";
  if (eventType.includes("sniff")) return "Sniff";
  return null;
}