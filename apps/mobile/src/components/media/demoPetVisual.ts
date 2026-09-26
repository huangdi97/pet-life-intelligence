/**
 * Demo pet visual + identity helpers (Stage R.2 §14-15, §66).
 * Presentation-only demo visuals for the demo environment; provenance stays
 * DEMO/SYNTHETIC and never becomes a real observation. Photos, when present,
 * come from explicit media (uri) — the species visual is the graceful
 * fallback (ACCEPTED_LIMITATION for this round).
 */
import type { Pet } from "../../services/types";

/** Presentation provenance label for bundled demo media (data-layer flag). */
export const DEMO_MEDIA_PROVENANCE = "DEMO/SYNTHETIC" as const;

/**
 * Resolve the primary hero/avatar media for a pet. Priority:
 * 1. real/demo photo uri (from pet.avatar_artifact_id or passed uri)
 * 2. null → graceful species visual.
 * This round ships no generated photos (image provider unavailable), so the
 * default is the species visual; the resolution order stays for future media.
 */
export function resolvePetMediaUri(pet: Pet | null, explicitUri?: string | null): string | null {
  if (explicitUri) return explicitUri;
  return null;
}

/** Human-readable identity line for a pet (name · species · breed · sex). */
export function petIdentityLine(pet: Pet | null): string {
  if (!pet) return "";
  const parts = [pet.breed || "宠物", pet.name].filter(Boolean);
  return parts.join(" · ");
}
