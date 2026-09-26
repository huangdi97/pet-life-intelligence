/**
 * PetSpeciesGlyph — vector species mark used as the graceful pet visual
 * fallback when no real/demo photo is available. Warm two-tone surface,
 * never a letter avatar. Dog / cat / generic paw glyphs from
 * MaterialCommunityIcons (part of @expo/vector-icons).
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RADIUS } from "../../tokens";

export type SpeciesGlyphName = "dog" | "cat" | "paw";

const GLYPH_MAP: Record<SpeciesGlyphName, keyof typeof MaterialCommunityIcons.glyphMap> = {
  dog: "dog",
  cat: "cat",
  paw: "paw",
};

const TONE: Record<SpeciesGlyphName, { bg: string; fg: string }> = {
  dog: { bg: "#E3E7D6", fg: "#6E8B5E" },
  cat: { bg: "#F3E4D0", fg: "#B9762A" },
  paw: { bg: "#E7E3D8", fg: "#8A8074" },
};

export function PetSpeciesGlyph({
  glyph,
  size = 124,
  round = RADIUS.pill,
}: {
  glyph: SpeciesGlyphName;
  size?: number;
  round?: number;
}) {
  const tone = TONE[glyph];
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: tone.bg, borderRadius: round }]}>
      <MaterialCommunityIcons name={GLYPH_MAP[glyph]} size={size * 0.55} color={tone.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
});
