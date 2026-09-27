/**
 * Pet3D registry — the single source of truth for demo pet 3D identities.
 *
 * PROVENANCE:
 * These assets are DEMO/SYNTHETIC, development-only representations built
 * programmatically from primitives. They are presentation data and must never
 * become a fact source, a medical observation, or a stand-in for real pet
 * photos. REAL_3D_PROVIDER = EXTERNAL_BLOCKED; when a certified provider is
 * connected, only the `buildScene` implementations change, never the screens.
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
  /** PROVENANCE: always DEMO_SYNTHETIC at this stage. */
  provenance: "DEMO_SYNTHETIC";
  devOnly: true;
  /** Human description used as the 3D equivalent text (a11y). */
  description: string;
}

export const PET_3D_ASSETS: Record<Pet3DIdentity, Pet3DAssetMeta> = {
  doudou: {
    identity: "doudou",
    name: "豆豆",
    species: "dog",
    version: "demo-1",
    provenance: "DEMO_SYNTHETIC",
    devOnly: true,
    description: "豆豆的演示 3D 形象：奶油色柯基，额头白色花纹，竖立圆耳",
  },
  mimi: {
    identity: "mimi",
    name: "咪咪",
    species: "cat",
    version: "demo-1",
    provenance: "DEMO_SYNTHETIC",
    devOnly: true,
    description: "咪咪的演示 3D 形象：短毛猫，圆头与三角耳，细长尾巴",
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
  const name = input.name?.trim();
  if (name === "豆豆") return "doudou";
  if (name === "咪咪") return "mimi";
  const species = input.species ?? "";
  const breed = input.breed ?? "";
  if (species === "dog" && breed.includes("柯基")) return "doudou";
  if (species === "cat") return "mimi";
  return null;
}