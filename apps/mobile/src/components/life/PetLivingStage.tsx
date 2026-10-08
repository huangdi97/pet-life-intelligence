/**
 * PetLivingStage — the shared "pet is in the room" composition for Today / Pet /
 * Life View (R2-P3D §16/§19/§23). Three depth layers: warm living environment
 * background, midground REAL 3D pet (shared demo asset via Pet3DViewer), and
 * foreground state anchors + identity/now overlay. The pet visual always
 * dominates; when the 3D renderer fails or no demo identity exists, the stage
 * degrades to the certified photo/2.5D renderer (labeled fallback, never the
 * P0 target).
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";
import { resolvePet3DIdentity, type PoseName, type TwinDescriptor } from "@pli/pet-3d";
import { PetStageRenderer, type PetStageSpec } from "../pet/PetStageRenderer";
import { Pet3DViewer, type Pet3DStatus } from "../three/Pet3DViewer";
import { PetStateAnchor, type PetAnchor } from "./PetStateAnchor";

export type StageVariant = "today" | "pet" | "life" | "review";

const HEIGHTS: Record<StageVariant, number> = { today: 500, pet: 526, life: 608, review: 550 };
const PET_WIDTHS: Record<StageVariant, number> = { today: 340, pet: 352, life: 378, review: 372 };

// Life state facts belong in one quiet ribbon, not four HUD bubbles over the animal.

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
  /** Twin Review view preset (front/side/back) — drives the real camera. */
  view?: "front" | "side" | "back";
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
  view,
  frameTarget = 0,
  onPressPet,
}: Props) {
  const [pet3d, setPet3d] = useState<Pet3DStatus>("boot");
  const identity = pet ? resolvePet3DIdentity({ name: pet.name, species: pet.species, breed: pet.breed }) : null;
  // R4.2: the stage is a warm living reality field (today/pet/life) or a
  // neutral identity studio (review). The 3D page paints its own themed
  // surface, so the host card must never flip to a dark viewer.
  // Bundled demo geometry is permitted only in a build/session that is
  // explicitly marked demo. A production pet without a persisted Twin stays
  // on the honest 2.5D/photo fallback instead of borrowing a generic template.
  const use3d = identity !== null && (twin !== null || demo) && pet3d !== "failed";
  const reviewStudio = variant === "review";
  const stageTheme = reviewStudio ? ("review" as const) : ("living" as const);
  const height = HEIGHTS[variant];
  const petWidth = PET_WIDTHS[variant];
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
      <Pet3DViewer ref={viewerRef} identity={identity} displayName={pet?.name ?? undefined} demoTwin={demo} twin={twin} pose={pose} interactive={interactive} frameTarget={frameTarget} view={view} stageRole={variant} stageTheme={stageTheme} petId={pet?.id ?? null} sourceMediaCount={sourceMediaCount} onStatus={setPet3d} />
    </View>
  ) : (
    <View pointerEvents={onPressPet ? "none" : undefined}>
      <PetStageRenderer pet={pet} spec={spec} width={petWidth} />
    </View>
  );
  return (
    <View testID={stageTestId} style={[styles.stage, { height }, reviewStudio ? styles.stageReview : styles.stageLiving]}>
      {/* BACKGROUND: a quiet room field, not a viewer card. Living surfaces use
          window-like daylight + a low floor haze; Review uses a neutral studio. */}
      <View style={[styles.fieldBase, reviewStudio ? styles.fieldBaseReview : styles.fieldBaseLiving]} />
      {reviewStudio ? (
        <>
          <View style={styles.reviewLightWell} />
          <View style={styles.reviewFloor} />
        </>
      ) : (
        <>
          <View style={styles.windowBeamA} />
          <View style={styles.windowBeamB} />
          <View style={styles.sunHaze} />
          <View style={styles.floorHaze} />
          <View style={styles.roomHorizon} />
        </>
      )}

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
        <View testID={twinTestId} style={[styles.petSlot, variant === "life" && styles.petSlotLife]}>
          {petLayer}
        </View>
      )}

      {/* A single life ribbon leaves the pet visually unobstructed. */}
      {anchors.length > 0 && !reviewStudio ? (
        <View style={styles.lifeRibbon} accessibilityLabel="饮食、饮水、活动与休息记录">
          {anchors.slice(0, 4).map((anchor) => (
            <View key={anchor.id} style={styles.lifeRibbonItem}>
              <PetStateAnchor anchor={anchor} />
            </View>
          ))}
        </View>
      ) : null}

      {/* identity + now line + honest note */}
      <View style={styles.head}>
        <View style={styles.identityCopy}>
          <Text style={styles.eyebrow}>{reviewStudio ? "看看这是不是它" : variant === "life" ? "它的生命空间" : "和它在一起的日子"}</Text>
          <Text style={styles.name}>{pet?.name ?? "宠物"}</Text>
        </View>
        {demo ? (
          <View style={styles.demoChip}>
            <Text style={styles.demoChipText}>示例数据</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.nowBlock, variant === "life" && styles.nowBlockLife]}>
        {headline ? <Text style={styles.headline}>{headline}</Text> : null}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        {note ? (
          <View style={styles.noteRow}>
            <Ionicons name="cube-outline" size={12} color={COLORS.textTertiary} />
            <Text style={styles.note}>{note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { marginHorizontal: 0, marginTop: 0, borderRadius: 0, overflow: "hidden" },
  stageLiving: { backgroundColor: COLORS.stageWarmBase },
  stageReview: { marginHorizontal: SPACE.s3, borderRadius: RADIUS.hero, backgroundColor: COLORS.stageReviewBase },
  fieldBase: { ...StyleSheet.absoluteFillObject },
  fieldBaseLiving: { backgroundColor: COLORS.stageWarmBase },
  fieldBaseReview: { backgroundColor: COLORS.stageReviewBase },
  // Asymmetric daylight cues keep the stage spatial without drawing a giant
  // geometric circle behind the pet.
  windowBeamA: {
    position: "absolute",
    width: 92,
    height: 300,
    left: 24,
    top: -54,
    borderRadius: 46,
    backgroundColor: COLORS.stageWarmBeam,
    opacity: 0.52,
    transform: [{ rotate: "7deg" }],
  },
  windowBeamB: {
    position: "absolute",
    width: 44,
    height: 260,
    left: 116,
    top: -38,
    borderRadius: 24,
    backgroundColor: COLORS.stageWarmBeamSoft,
    opacity: 0.42,
    transform: [{ rotate: "7deg" }],
  },
  sunHaze: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    right: -34,
    top: 34,
    backgroundColor: COLORS.stageWarmGlow,
    opacity: 0.22,
  },
  floorHaze: {
    position: "absolute",
    height: 142,
    left: -32,
    right: -32,
    bottom: -58,
    borderRadius: 90,
    backgroundColor: COLORS.stageWarmFloor,
  },
  roomHorizon: {
    position: "absolute",
    height: 1,
    left: 42,
    right: 42,
    bottom: 94,
    backgroundColor: COLORS.stageWarmHorizon,
    opacity: 0.42,
  },
  // R5.6 final craft: Review is a neutral identity studio, not a pet placed
  // in front of another decorative circle. A broad light well improves face /
  // coat readability while staying visually subordinate to the Twin.
  reviewLightWell: {
    position: "absolute",
    left: 34,
    right: 34,
    height: 236,
    top: 54,
    borderRadius: 72,
    backgroundColor: COLORS.stageReviewGlow,
    opacity: 0.28,
  },
  reviewFloor: {
    position: "absolute",
    height: 126,
    left: 18,
    right: 18,
    bottom: -48,
    borderRadius: 82,
    backgroundColor: COLORS.stageReviewFloor,
  },
  pressPet: { position: "absolute", left: 0, right: 0, bottom: 74, alignItems: "center" },
  petSlot: { position: "absolute", left: 0, right: 0, bottom: 74, alignItems: "center" },
  petSlotLife: { bottom: 104 },
  lifeRibbon: { position: "absolute", bottom: 8, left: SPACE.s3, right: SPACE.s3, flexDirection: "row", borderRadius: 18, paddingVertical: 5, backgroundColor: COLORS.surfaceOverlay, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.stageWarmBorder },
  lifeRibbonItem: { flex: 1, minWidth: 0 },
  head: { position: "absolute", top: SPACE.s6, left: SPACE.s5, right: SPACE.s5, flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2 },
  identityCopy: { flex: 1 },
  eyebrow: { fontSize: TYPE.caption, letterSpacing: 1.7, fontWeight: "700", color: COLORS.brandPrimaryDeep, marginBottom: 6 },
  name: { fontSize: 36, fontWeight: "700", letterSpacing: -0.8, color: COLORS.textPrimary },
  demoChip: { backgroundColor: COLORS.surfaceOverlay, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  demoChipText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  nowBlock: { position: "absolute", left: SPACE.s5, right: SPACE.s5, top: 112 },
  nowBlockLife: { left: SPACE.s5, right: SPACE.s5, top: 114, bottom: undefined, borderWidth: 0, backgroundColor: "transparent" },
  headline: { fontSize: TYPE.body, fontWeight: "600", color: COLORS.textSecondary },
  caption: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  note: { fontSize: TYPE.caption, color: COLORS.textTertiary },
});