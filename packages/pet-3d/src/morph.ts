/**
 * morph — Pet Morph Parameter Contract (R2P3D-R1 §29).
 *
 * PLI's own commercial-safe template family: instead of claiming a breed
 * label as shape truth, an individual pet is described by 18 morph scalars
 * fitted from owner media silhouettes + owner metadata (breed only as a weak
 * prior). PRESENTATION ONLY — these parameters describe surface shape of a
 * candidate 3D representation; they never become a health/medical fact and
 * never overwrite real observations.
 */
import * as THREE from "three";

/** The full morph parameter set (R2P3D-R1 §29, 18 fields). */
export interface PetMorphParams {
  body_length: number;
  body_height: number;
  chest_width: number;
  waist_width: number;
  neck_length: number;
  head_scale: number;
  head_width: number;
  muzzle_length: number;
  ear_length: number;
  ear_width: number;
  ear_angle: number; // radians, 0 = upright
  leg_length_front: number;
  leg_length_back: number;
  paw_scale: number;
  tail_length: number;
  tail_thickness: number;
  tail_curve: number;
  overall_scale: number;
}

export type TwinTemplateFamily = "corgi-like" | "standard-dog" | "standard-cat" | "spitz-dog" | "retriever-dog";

export interface TwinTemplate {
  family: TwinTemplateFamily;
  species: "dog" | "cat";
  /** Default morph = the template's canonical proportion (1.0 = unit scale). */
  defaultMorph: PetMorphParams;
}

const M = (over: Partial<PetMorphParams>): PetMorphParams => ({
  body_length: 1.0,
  body_height: 1.0,
  chest_width: 1.0,
  waist_width: 1.0,
  neck_length: 1.0,
  head_scale: 1.0,
  head_width: 1.0,
  muzzle_length: 1.0,
  ear_length: 1.0,
  ear_width: 1.0,
  ear_angle: 0,
  leg_length_front: 1.0,
  leg_length_back: 1.0,
  paw_scale: 1.0,
  tail_length: 1.0,
  tail_thickness: 1.0,
  tail_curve: 0,
  overall_scale: 1.0,
  ...over,
});

/** Template family registry — in-repo MIT, no external assets. */
export const TWIN_TEMPLATES: Record<TwinTemplateFamily, TwinTemplate> = {
  "corgi-like": {
    family: "corgi-like",
    species: "dog",
    defaultMorph: M({
      body_length: 1.5,
      body_height: 0.82,
      chest_width: 1.15,
      waist_width: 0.95,
      neck_length: 0.8,
      head_scale: 1.05,
      head_width: 1.18,
      muzzle_length: 0.7,
      ear_length: 0.85,
      ear_width: 0.9,
      ear_angle: 0.05,
      leg_length_front: 0.52,
      leg_length_back: 0.55,
      paw_scale: 1.0,
      tail_length: 0.45,
      tail_thickness: 1.0,
      tail_curve: 0.35,
    }),
  },
  "standard-dog": {
    family: "standard-dog",
    species: "dog",
    defaultMorph: M({
      body_length: 1.1,
      body_height: 1.0,
      chest_width: 1.0,
      waist_width: 0.9,
      neck_length: 1.15,
      head_scale: 0.95,
      head_width: 1.0,
      muzzle_length: 1.1,
      ear_length: 0.9,
      ear_width: 0.9,
      ear_angle: 0.12,
      leg_length_front: 1.05,
      leg_length_back: 1.05,
      paw_scale: 1.0,
      tail_length: 1.1,
      tail_thickness: 0.9,
      tail_curve: 0.2,
    }),
  },
  "spitz-dog": {
    family: "spitz-dog",
    species: "dog",
    defaultMorph: M({
      body_length: 1.0,
      body_height: 1.0,
      chest_width: 1.05,
      waist_width: 0.85,
      neck_length: 1.0,
      head_scale: 1.0,
      head_width: 1.0,
      muzzle_length: 0.9,
      ear_length: 0.9,
      ear_width: 0.8,
      ear_angle: 0.1,
      leg_length_front: 1.0,
      leg_length_back: 1.0,
      paw_scale: 1.0,
      tail_length: 1.3,
      tail_thickness: 1.1,
      tail_curve: 0.45,
    }),
  },
  "retriever-dog": {
    family: "retriever-dog",
    species: "dog",
    defaultMorph: M({
      body_length: 1.12,
      body_height: 1.05,
      chest_width: 1.18,
      waist_width: 0.92,
      neck_length: 1.05,
      head_scale: 1.05,
      head_width: 1.08,
      muzzle_length: 1.15,
      ear_length: 0.75,
      ear_width: 0.85,
      ear_angle: 0.28,
      leg_length_front: 1.02,
      leg_length_back: 1.02,
      paw_scale: 1.05,
      tail_length: 1.05,
      tail_thickness: 0.95,
      tail_curve: 0.18,
    }),
  },
  "standard-cat": {
    family: "standard-cat",
    species: "cat",
    defaultMorph: M({
      body_length: 1.15,
      body_height: 0.92,
      chest_width: 0.92,
      waist_width: 0.8,
      neck_length: 0.95,
      head_scale: 0.95,
      head_width: 0.95,
      muzzle_length: 0.7,
      ear_length: 1.0,
      ear_width: 0.85,
      ear_angle: 0.05,
      leg_length_front: 0.95,
      leg_length_back: 0.98,
      paw_scale: 0.85,
      tail_length: 1.4,
      tail_thickness: 0.55,
      tail_curve: 0.3,
    }),
  },
};

export const TWIN_TEMPLATE_FAMILIES = Object.keys(TWIN_TEMPLATES) as TwinTemplateFamily[];

const MORPH_KEYS = Object.keys(TWIN_TEMPLATES["corgi-like"].defaultMorph) as (keyof PetMorphParams)[];

/** Validate + sanitize incoming morph params (clamp to sane proportional range). */
export function sanitizeMorph(input: Partial<PetMorphParams> | null | undefined): PetMorphParams {
  const base = TWIN_TEMPLATES["standard-dog"].defaultMorph;
  const out: PetMorphParams = { ...base };
  if (!input) return out;
  for (const k of MORPH_KEYS) {
    const v = Number(input[k]);
    if (Number.isFinite(v)) {
      const min = 0.35;
      const max = 2.4;
      out[k] = Math.min(max, Math.max(min, v));
    }
  }
  out.ear_angle = Math.min(1.4, Math.max(-1.4, Number(input.ear_angle) || 0));
  out.tail_curve = Math.min(1.2, Math.max(-1.2, Number(input.tail_curve) || 0));
  return out;
}

/** Resolve a template family (with a safe fallback) from a descriptor string. */
export function resolveTemplate(family: string | null | undefined): TwinTemplate {
  if (family && family in TWIN_TEMPLATES) return TWIN_TEMPLATES[family as TwinTemplateFamily];
  return TWIN_TEMPLATES["standard-dog"];
}

/** Visual summary of a morph (used by owner-friendly copy, never clinical). */
export function describeMorph(p: PetMorphParams): string {
  const long = p.body_length > 1.25 ? "身长体稍长" : p.body_length < 0.85 ? "身长体稍短" : "身长适中";
  const low = p.body_height < 0.9 ? "四肢较矮" : "体型标准";
  return `${long}，${low}`;
}

/** Fingerprint for tests: ensure two different templates differ structurally. */
export function morphFingerprint(p: PetMorphParams): string {
  const v = MORPH_KEYS.map((k) => `${k}:${p[k].toFixed(3)}`).join("|");
  return `morph(${v})`;
}

/** THREE-free helpers target only used for deriving morph from metadata. */
export function clampByte(n: number): number {
  return THREE.MathUtils.clamp(n, 0, 255);
}