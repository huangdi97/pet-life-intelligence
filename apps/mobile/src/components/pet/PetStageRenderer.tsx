/**
 * PetStageRenderer — renderer abstraction for the pet midground (R2-P §21/C5).
 *
 * The page structure never binds to a provider. Modes:
 *   photo        → real/demo horizontal photo (uri present)
 *   twoPointFiveD→ code-native identity illustration (current demo default)
 *   generated    → identity-specific generated visual (reserved; provider-gated)
 *   threeD       → full interactive 3D (REAL_3D_PROVIDER = EXTERNAL_BLOCKED)
 *
 * Honest contract: when a higher-fidelity mode has no real asset, we render the
 * best available lower mode and the stage caption carries the honest note —
 * the owner sees their pet, never a "3D 还没接" failure surface.
 */
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { Pet } from "../../services/types";
import { PetTwoPointFiveD } from "./PetTwoPointFiveD";
import { PetSpeciesGlyph, type SpeciesGlyphName } from "./PetSpeciesGlyph";

export type PetStageMode = "photo" | "twoPointFiveD" | "generated" | "threeD";

export interface PetStageSpec {
  mode: PetStageMode;
  uri: string | null;
}

/** Decide which renderer serves a given pet (deterministic; provenance only). */
export function resolvePetStage(pet: Pet | null, explicitUri?: string | null): PetStageSpec {
  if (explicitUri) return { mode: "photo", uri: explicitUri };
  return { mode: "twoPointFiveD", uri: null };
}

interface Props {
  pet: Pet | null;
  spec: PetStageSpec;
  width: number;
}

export function PetStageRenderer({ pet, spec, width }: Props) {
  if (spec.mode === "photo" && spec.uri) {
    return (
      <View style={[styles.frame, { width, height: (width * 250) / 220 }]}>
        <Image source={{ uri: spec.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`${pet?.name ?? "宠物"}的照片`} />
      </View>
    );
  }
  // generated / threeD without a certified asset degrade to the certified
  // 2.5D layer; the honest state lives in the stage caption (not on the pet).
  if (pet?.species === "dog" && pet?.breed.includes("柯基")) {
    return <PetTwoPointFiveD width={width} />;
  }
  const glyph: SpeciesGlyphName = pet?.species === "cat" ? "cat" : pet?.species === "dog" ? "dog" : "paw";
  return (
    <View style={{ width, height: (width * 250) / 220, alignItems: "center", justifyContent: "center" }}>
      <PetSpeciesGlyph glyph={glyph} size={Math.round(width * 0.62)} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 24, overflow: "hidden", backgroundColor: "rgba(255,251,242,0.55)" },
});