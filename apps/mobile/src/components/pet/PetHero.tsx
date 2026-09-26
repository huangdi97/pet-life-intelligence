/**
 * PetHero — the first visual focus of Today / Pet pages (Stage R.2).
 * Full-width warm hero: pet photo (when available) or species visual,
 * scrim, pet name + headline + identity + time context. The hero copy is
 * always deterministic (name / species / day context) — never invented mood.
 */
import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";
import { PetSpeciesGlyph } from "./PetSpeciesGlyph";
import { speciesGlyphFor } from "../media/PetMedia";

interface PetHeroProps {
  pet: Pet | null;
  mediaUri?: string | null;
  headline?: string;
  identity?: string;
  timeContext?: string;
  demo?: boolean;
  onPress?: () => void;
  height?: number;
}

export function PetHero({
  pet,
  mediaUri,
  headline = "今天怎么样？",
  identity,
  timeContext,
  demo = false,
  onPress,
  height = 300,
}: PetHeroProps) {
  const glyph = speciesGlyphFor(pet?.species ?? "dog");
  const idLine =
    identity ??
    (pet ? `${pet.breed || "宠物"} · ${pet.name}` : "宠物生活智能");

  const inner = (
    <>
      {mediaUri ? (
        <ImageBackground source={{ uri: mediaUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.glyphBackdrop}>
          <PetSpeciesGlyph glyph={glyph} size={Math.round(height * 0.62)} round={RADIUS.hero} />
        </View>
      )}
      {mediaUri ? <View style={styles.scrim} /> : null}
      {demo ? (
        <View style={styles.demoChip} accessibilityLabel="示例数据">
          <Text style={styles.demoChipText}>示例数据</Text>
        </View>
      ) : null}
      <View style={styles.info}>
        <Text style={styles.name}>{pet?.name ?? "宠物"}</Text>
        <Text style={styles.headline}>{headline}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.identity}>{idLine}</Text>
          {timeContext ? (
            <View style={styles.timeChip}>
              <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
              <Text style={styles.timeText}>{timeContext}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`宠物 ${pet?.name ?? ""}，${headline}`}
        style={({ pressed }) => [styles.hero, { height }, pressed && styles.pressed]}
        onPress={onPress}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View accessibilityLabel={`宠物 ${pet?.name ?? ""}，${headline}`} style={[styles.hero, { height }]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: RADIUS.hero,
    overflow: "hidden",
    backgroundColor: COLORS.brandSoft,
    justifyContent: "flex-end",
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s2,
  },
  glyphBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.scrimDark,
  },
  demoChip: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoChipText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  info: { padding: SPACE.s5, paddingTop: SPACE.s8 },
  name: { fontSize: TYPE.heroName, fontWeight: "700", color: COLORS.textInverse, textShadowColor: COLORS.scrimDark, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headline: { fontSize: TYPE.pageTitle, fontWeight: "600", color: COLORS.textInverse, marginTop: 2, textShadowColor: COLORS.scrimDark, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, marginTop: SPACE.s3, flexWrap: "wrap" },
  identity: { fontSize: TYPE.meta, color: COLORS.textOnDark, opacity: 0.92 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeText: { fontSize: TYPE.caption, color: COLORS.textSecondary },
  pressed: { opacity: 0.92 },
});
