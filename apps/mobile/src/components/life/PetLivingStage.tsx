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
import { resolvePet3DIdentity, type PoseName, type TwinDescriptor } from "@pli/pet-3d";
import { PetStageRenderer, type PetStageSpec } from "../pet/PetStageRenderer";
import { Pet3DViewer, type Pet3DStatus } from "../three/Pet3DViewer";
import { PetStateAnchor, type PetAnchor } from "./PetStateAnchor";

export type StageVariant = "today" | "pet" | "life" | "review";

const HEIGHTS: Record<StageVariant, number> = { today: 344, pet: 372, life: 452, review: 470 };
const PET_WIDTHS: Record<StageVariant, number> = { today: 216, pet: 232, life: 252, review: 252 };

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
  /** Individual twin descriptor from the backend (R2P3D-R1). */
  twin?: TwinDescriptor | null;
  /** Number of observed source media regions used to build the twin (V2 identity gate). */
  sourceMediaCount?: number;
  /** §31 framing target (fraction of the full WebView viewport) for the twin. */
  frameTarget?: number;
  /** Active motion clip for the 3D stage. */
  pose?: PoseName | null;
  /** Imperative handle to the embedded 3D page (Life View zoom/reset). */
  viewerRef?: React.Ref<import("../three/Pet3DViewer").Pet3DViewerHandle>;
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
  twin = null,
  sourceMediaCount = 0,
  pose = null,
  viewerRef,
  frameTarget = 0,
  onPressPet,
}: Props) {
  const [pet3d, setPet3d] = useState<Pet3DStatus>("boot");
  const identity = pet ? resolvePet3DIdentity({ name: pet.name, species: pet.species, breed: pet.breed }) : null;
  // V4 §5 (PLI_VISUAL_SYSTEM_V4.md) / blind-UI 3D contract: the real 3D twin
  // renders on every owner stage (Today / Pet / Life). "boot" (WebView
  // loading) must still mount the viewer so the page can report ready/failed;
  // only a real failure ("failed") falls back to photo/2.5D. This mirrors the
  // web stage (pet3d !== "failed"), fixing the mobile deadlock where
  // `pet3d === "ready"` prevented the viewer from ever mounting.
  const use3d = identity !== null && pet3d !== "failed";
  const height = HEIGHTS[variant];
  const petWidth = PET_WIDTHS[variant];
  const dark = use3d;
  // Namespace mapping for machine-readable ids: today→pli.today, pet→pli.pet,
  // life→pli.lifeview (Life View ids are the canonical "stage"/"twin" pair).
  const stageTestId =
    variant === "pet"
      ? "pli.pet.hero-stage"
      : variant === "life"
        ? "pli.lifeview.stage"
        : variant === "review"
          ? "pli.twinreview.stage"
          : "pli.today.living-stage";
  const twinTestId =
    variant === "life"
      ? "pli.lifeview.twin"
      : variant === "review"
        ? "pli.twinreview.twin"
        : `pli.${variant}.pet-twin`;
  const petLayer = use3d ? (
    <View style={{ width: petWidth, height: Math.round(petWidth * 1.12) }}>
      <Pet3DViewer ref={viewerRef} identity={identity} twin={twin} pose={pose} interactive={interactive} frameTarget={frameTarget} petId={pet?.id ?? null} sourceMediaCount={sourceMediaCount} onStatus={setPet3d} />
    </View>
  ) : (
    <View pointerEvents={onPressPet ? "none" : undefined}>
      <PetStageRenderer pet={pet} spec={spec} width={petWidth} />
    </View>
  );
  return (
    <View testID={stageTestId} accessible accessibilityLabel={`${pet?.name ?? "宠物"}的此刻舞台`} style={[styles.stage, { height }, dark && styles.stageDark]}>
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
          testID={twinTestId}
          style={styles.pressPet}
          onPress={onPressPet}
        >
          {petLayer}
        </Pressable>
      ) : (
        <View testID={twinTestId} accessible accessibilityLabel={`${pet?.name ?? "宠物"}的 3D 形象`} style={styles.petSlot}>
          {petLayer}
        </View>
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