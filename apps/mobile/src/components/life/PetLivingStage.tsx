/**
 * PetLivingStage — the shared "pet is in the room" composition for Today / Pet /
 * Life View (R2-P3D §16/§19/§23). Three depth layers: warm charcoal environment
 * background, midground REAL 3D pet (shared demo asset via Pet3DViewer), and
 * foreground state anchors + identity/now overlay. The pet visual always
 * dominates; when the 3D renderer fails or no demo identity exists, the stage
 * degrades to the certified photo/2.5D renderer (labeled fallback, never the
 * P0 target).
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";
import { resolvePet3DIdentity } from "@pli/pet-3d";
import { PetStageRenderer, type PetStageSpec } from "../pet/PetStageRenderer";
import { Pet3DViewer, type Pet3DStatus } from "../three/Pet3DViewer";
import { PetStateAnchor, type PetAnchor } from "./PetStateAnchor";

export type StageVariant = "today" | "pet" | "life";

const HEIGHTS: Record<StageVariant, number> = { today: 344, pet: 372, life: 452 };
const PET_WIDTHS: Record<StageVariant, number> = { today: 216, pet: 232, life: 252 };

const SLOTS: Array<{ top?: DimensionValue; bottom?: DimensionValue; left?: number; right?: number }> = [
  { top: "10%", left: 12 },
  { top: "10%", right: 12 },
  { bottom: "22%", left: 12 },
  { bottom: "22%", right: 12 },
  { top: "42%", left: 12 },
  { top: "42%", right: 12 },
];

interface Props {
  pet: Pet | null;
  spec: PetStageSpec;
  variant?: StageVariant;
  anchors?: PetAnchor[];
  /** One-line statement about the pet right now (real data only). */
  headline?: string;
  /** Identity / freshness line under the headline. */
  caption?: string;
  /** Honest 3D / provenance note (small, non-dominant). */
  note?: string;
  demo?: boolean;
  /** Enables drag rotate + pinch zoom (Life View). */
  interactive?: boolean;
  onPressPet?: () => void;
}

export function PetLivingStage({
  pet,
  spec,
  variant = "today",
  anchors = [],
  headline,
  caption,
  note,
  demo = false,
  interactive = false,
  onPressPet,
}: Props) {
  const [pet3d, setPet3d] = useState<Pet3DStatus>("boot");
  const identity = pet ? resolvePet3DIdentity({ name: pet.name, species: pet.species, breed: pet.breed }) : null;
  const use3d = identity !== null && pet3d !== "failed";
  const height = HEIGHTS[variant];
  const petWidth = PET_WIDTHS[variant];
  const dark = use3d;

  const petLayer = use3d ? (
    <View style={{ width: petWidth, height: Math.round(petWidth * 1.12) }}>
      <Pet3DViewer identity={identity} interactive={interactive} onStatus={setPet3d} />
    </View>
  ) : (
    <View pointerEvents={onPressPet ? "none" : undefined}>
      <PetStageRenderer pet={pet} spec={spec} width={petWidth} />
    </View>
  );

  return (
    <View style={[styles.stage, { height }, dark && styles.stageDark]} accessibilityLabel={`${pet?.name ?? "宠物"}的此刻舞台`}>
      {/* BACKGROUND: warm environment (charcoal when 3D, cream when fallback) */}
      {!dark ? (
        <>
          <View style={styles.envTop} />
          <View style={styles.envBase} />
        </>
      ) : null}
      {dark ? <View style={styles.glow} /> : <View style={styles.wash} />}

      {/* MIDGROUND: pet */}
      {onPressPet ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`打开 ${pet?.name ?? "宠物"} 的生命视图`}
          style={styles.pressPet}
          onPress={onPressPet}
        >
          {petLayer}
        </Pressable>
      ) : (
        <View style={styles.petSlot}>{petLayer}</View>
      )}

      {/* FOREGROUND: state anchors around the pet */}
      {anchors.slice(0, SLOTS.length).map((a, i) => (
        <View key={a.id} style={[styles.slot, SLOTS[i]]}>
          <PetStateAnchor anchor={a} dark={dark} />
        </View>
      ))}

      {/* identity + now line + honest note */}
      <View style={styles.head}>
        <Text style={[styles.name, dark && styles.nameDark]}>{pet?.name ?? "宠物"}</Text>
        {demo ? (
          <View style={[styles.demoChip, dark && styles.demoChipDark]}>
            <Text style={[styles.demoChipText, dark && styles.demoChipTextDark]}>示例数据</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.nowBlock}>
        {headline ? <Text style={[styles.headline, dark && styles.headlineDark]}>{headline}</Text> : null}
        {caption ? <Text style={[styles.caption, dark && styles.captionDark]}>{caption}</Text> : null}
        {note ? (
          <View style={styles.noteRow}>
            <Ionicons name="cube-outline" size={12} color={dark ? COLORS.textOnStageTertiary : COLORS.textTertiary} />
            <Text style={[styles.note, dark && styles.noteDark]}>{note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s3,
    borderRadius: RADIUS.hero,
    overflow: "hidden",
  },
  stageDark: { backgroundColor: COLORS.stageWarmBase },
  envTop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.stageGradientTop },
  envBase: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.stageGradientBase, top: "55%" },
  wash: {
    position: "absolute",
    width: 300,
    height: 180,
    borderRadius: 150,
    backgroundColor: "rgba(255,251,242,0.6)",
    top: -60,
    right: -70,
  },
  glow: {
    position: "absolute",
    width: 340,
    height: 300,
    borderRadius: 170,
    backgroundColor: COLORS.stageWarmGlow,
    top: 40,
    alignSelf: "center",
    opacity: 0.55,
  },
  pressPet: { position: "absolute", left: 0, right: 0, bottom: 30, alignItems: "center" },
  petSlot: { position: "absolute", left: 0, right: 0, bottom: 30, alignItems: "center" },
  slot: { position: "absolute" },
  head: {
    position: "absolute",
    top: SPACE.s3,
    left: SPACE.s4,
    right: SPACE.s4,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s2,
  },
  name: { flex: 1, fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary, marginRight: SPACE.s2 },
  nameDark: { color: COLORS.textOnStage },
  demoChip: { backgroundColor: COLORS.surfaceOverlay, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  demoChipDark: { backgroundColor: "rgba(250,246,239,0.14)" },
  demoChipText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  demoChipTextDark: { color: COLORS.textOnStageSecondary },
  nowBlock: { position: "absolute", left: SPACE.s4, right: SPACE.s4, bottom: SPACE.s3 },
  headline: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  headlineDark: { color: COLORS.textOnStage },
  caption: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  captionDark: { color: COLORS.textOnStageSecondary },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  note: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  noteDark: { color: COLORS.textOnStageTertiary },
});