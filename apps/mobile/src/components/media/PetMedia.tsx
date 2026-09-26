/**
 * PetMedia — unified pet media / photo presentation (Stage R.2).
 *
 * Variants: portrait / hero / square / timeline / full-bleed.
 * Priority: real/demo photo (uri) > species visual (fallback) > letter
 * (opt-in badge, never the default primary visual).
 * The image itself provides the visual boundary — no white Card wrapper.
 */
import React from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Pet } from "../../services/types";
import { COLORS, RADIUS } from "../../tokens";
import { PetSpeciesGlyph, type SpeciesGlyphName } from "../pet/PetSpeciesGlyph";

export type PetMediaVariant = "portrait" | "hero" | "square" | "timeline" | "full-bleed";

interface PetMediaProps {
  pet?: Pick<Pet, "id" | "name" | "species"> | null;
  uri?: string | null;
  variant?: PetMediaVariant;
  /** letter is opt-in; species visual is the default graceful fallback. */
  showLetter?: boolean;
  radius?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<PetMediaVariant, { height: number; radius: number; glyph: number }> = {
  portrait: { height: 320, radius: RADIUS.xl, glyph: 150 },
  hero: { height: 320, radius: RADIUS.hero, glyph: 200 },
  square: { height: 120, radius: RADIUS.lg, glyph: 96 },
  timeline: { height: 64, radius: RADIUS.md, glyph: 56 },
  "full-bleed": { height: 360, radius: 0, glyph: 220 },
};

export function PetMedia({
  pet,
  uri,
  variant = "square",
  showLetter = false,
  radius,
  accessibilityLabel,
  style,
}: PetMediaProps) {
  const spec = SIZES[variant];
  const round = radius ?? spec.radius;
  const glyph: SpeciesGlyphName = speciesGlyphFor(pet?.species ?? "dog");
  const label = accessibilityLabel ?? `${pet?.name ?? "宠物"}的图片`;

  if (uri) {
    return (
      <View
        style={[styles.frame, { borderRadius: round, height: spec.height }, style]}
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      style={[styles.frame, { borderRadius: round, height: spec.height }, style]}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <View style={styles.glyphWrap}>
        <PetSpeciesGlyph glyph={glyph} size={spec.glyph} round={RADIUS.xl} />
      </View>
      {showLetter && pet?.name ? (
        <View style={styles.letterBadge} accessibilityElementsHidden>
          <Text style={styles.letter}>{pet.name.slice(0, 1)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function speciesGlyphFor(species: string): SpeciesGlyphName {
  if (species === "cat") return "cat";
  if (species === "dog") return "dog";
  return "paw";
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: COLORS.brandSoft,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  glyphWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  letterBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  letter: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
});
