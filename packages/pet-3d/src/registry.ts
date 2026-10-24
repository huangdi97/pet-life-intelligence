/**
 * Pet3D registry — canonical presentation metadata for the built-in demo twins.
 *
 * PROVENANCE:
 * Product hero surfaces load repo-committed, license-ledgered CC0-derived GLB
 * assets through the shared twin pipeline. Procedural builders remain an
 * engineering/failure fallback only. These demo templates are presentation
 * data: they are never a medical fact source and never claim to be a real-pet
 * reconstruction until owner media has gone through the governed identity
 * pipeline and explicit review.
 */

export type Pet3DIdentity = "doudou" | "mimi";

export interface Pet3DAssetMeta {
  /** Identity key used by every screen (Today / Pet / Life View). */
  identity: Pet3DIdentity;
  /** Owner-facing demo name. */
  name: string;
  /** Species for localization / aria labels. */
  species: "dog" | "cat";
  /** Presentation-only version. */
  version: string;
  /** Demo-template provenance; never implies real-pet photo observation. */
  provenance: "DEMO_TEMPLATE" | "DEMO_SYNTHETIC";
  devOnly: true;
  /** Human description used as the 3D equivalent text (a11y). */
  description: string;
}

export const PET_3D_ASSETS: Record<Pet3DIdentity, Pet3DAssetMeta> = {
  doudou: {
    identity: "doudou",
    name: "柯基示例模板",
    species: "dog",
    version: "r5-1.0.0",
    provenance: "DEMO_TEMPLATE",
    devOnly: true,
    description: "基于 CC0 柯基模板的演示 3D 形象；只有经过真实宠物素材与主人确认后才可代表个体。",
  },
  mimi: {
    identity: "mimi",
    name: "猫示例模板",
    species: "cat",
    version: "r4-1.0.0",
    provenance: "DEMO_TEMPLATE",
    devOnly: true,
    description: "基于 CC0 猫模板的演示 3D 形象；只有经过真实宠物素材与主人确认后才可代表个体。",
  },
};

/**
 * Resolve a pet record to a demo 3D identity.
 *
 * Deterministic mapping used by both clients so 豆豆 is always the corgi and
 * 咪咪 is always the cat; unknown pets get no demo3d asset (callers fall back
 * to photo / 2.5D / species visual).
 */
export function resolvePet3DIdentity(input: {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
}): Pet3DIdentity | null {
  const species = (input.species ?? "").trim().toLowerCase();
  const breed = (input.breed ?? "").trim();
  // Demo-template routing is based on species/breed capability, never on an
  // owner's mutable pet display name.
  if (species === "dog" && /corgi|柯基/i.test(breed)) return "doudou";
  if (species === "cat") return "mimi";
  return null;
}