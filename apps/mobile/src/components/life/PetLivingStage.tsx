/**
 * PetLivingStage — the shared "pet is in the room" composition for Today / Pet /
 * Life View (R2-P3D §16/§19/§23). Three depth layers: warm living environment
 * background, midground REAL 3D pet (shared demo asset via Pet3DViewer), and
 * foreground state anchors + identity/now overlay. The pet visual always
 * dominates; when the 3D renderer fails or no demo identity exists, the stage
 * degrades to the certified photo/2.5D renderer (labeled fallback, never the
 * P0 target).
 */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { api } from "../../api";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";
import { resolvePet3DIdentity, type PoseName, type TwinDescriptor } from "@pli/pet-3d";
import { PetStageRenderer, type PetStageSpec } from "../pet/PetStageRenderer";
import { Pet3DViewer, type Pet3DStatus } from "../three/Pet3DViewer";
import { PetStateAnchor, type PetAnchor } from "./PetStateAnchor";

export type StageVariant = "today" | "pet" | "life" | "review";

const HEIGHTS: Record<StageVariant, number> = { today: 550, pet: 580, life: 590, review: 550 };
const PET_WIDTHS: Record<StageVariant, number> = { today: 372, pet: 388, life: 414, review: 372 };

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
  /** Relationship/device surfaces can keep the pet dominant without consuming the whole first viewport. */
  compact?: boolean;
  onPressPet?: () => void;
  /** Individual twin descriptor from the backend (R2P3D-R1). */
  twin?: TwinDescriptor | null;
  /** Number of observed source media regions used to build the twin (V2 identity gate). */
  sourceMediaCount?: number;
  /** §31 framing target (fraction of the full WebView viewport) for the twin. */
  frameTarget?: number;
  /** Active motion clip for the 3D stage. */
  pose?: PoseName | null;
  /** Optional semantic/test overrides for contextual Living Canvas surfaces such as Companion. */
  stageRole?: "today" | "pet" | "life" | "review" | "companion";
  stageTestId?: string;
  twinTestId?: string;
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
  compact = false,
  twin = null,
  sourceMediaCount = 0,
  pose = null,
  stageRole,
  stageTestId: stageTestIdOverride,
  twinTestId: twinTestIdOverride,
  viewerRef,
  view,
  frameTarget = 0,
  onPressPet,
}: Props) {
  const [pet3d, setPet3d] = useState<Pet3DStatus>("boot");
  // Real owner photo must outrank the generic species glyph when no verified
  // individual 3D twin exists. The keyed value makes previous-pet media
  // invisible synchronously on the render that switches active identity.
  const [avatar, setAvatar] = useState<{ petId: string; uri: string | null } | null>(null);
  const [photoView, setPhotoView] = useState<{ petId: string; enabled: boolean } | null>(null);
  useEffect(() => {
    const id = pet?.id;
    if (!id || !pet.avatar_artifact_id) return;
    let alive = true;
    api.get<{ avatar_artifact_id: string | null; data_url: string | null }>(`/pets/${id}/avatar`)
      .then((row) => {
        if (alive) setAvatar({ petId: id, uri: row.data_url ?? null });
      })
      .catch(() => {
        if (alive) setAvatar({ petId: id, uri: null });
      });
    return () => { alive = false; };
  }, [pet?.id, pet?.avatar_artifact_id]);
  const photoUri = pet?.avatar_artifact_id && avatar?.petId === pet?.id ? avatar.uri : null;
  const identity = pet ? resolvePet3DIdentity({ name: pet.name, species: pet.species, breed: pet.breed }) : null;
  // R4.2: the stage is a warm living reality field (today/pet/life) or a
  // neutral identity studio (review). The 3D page paints its own themed
  // surface, so the host card must never flip to a dark viewer.
  // Bundled demo geometry is permitted only in a build/session that is
  // explicitly marked demo. A production pet without a persisted Twin stays
  // on the honest 2.5D/photo fallback instead of borrowing a generic template.
  const canShow3d = identity !== null && (twin !== null || demo) && pet3d !== "failed";
  const showPhoto = Boolean(photoUri && photoView?.petId === pet?.id && photoView?.enabled === true);
  const use3d = canShow3d && !showPhoto;
  const reviewStudio = variant === "review";
  const stageTheme = reviewStudio ? ("review" as const) : ("living" as const);
  const height = compact ? 470 : HEIGHTS[variant];
  // Keep the WebView inside narrow device viewports without clipping the 3D pet.
  const { width: viewportWidth } = useWindowDimensions();
  const petWidth = Math.min(compact ? 340 : PET_WIDTHS[variant], Math.max(220, Math.floor(viewportWidth - 16)));
  // Namespace mapping for machine-readable ids: today→pli.today, pet→pli.pet,
  // life→pli.lifeview (Life View ids are the canonical "stage"/"twin" pair).
  const stageTestId = stageTestIdOverride ?? (
    variant === "pet"
      ? "pli.pet.hero-stage"
      : variant === "life"
        ? "pli.lifeview.stage"
        : variant === "review"
          ? "pli.twinreview.stage"
          : "pli.today.living-stage"
  );
  const twinTestId = twinTestIdOverride ?? (
    variant === "life"
      ? "pli.lifeview.twin"
      : variant === "review"
        ? "pli.twinreview.twin"
        : `pli.${variant}.pet-twin`
  );
  const runtimeStageRole = stageRole ?? variant;
  const petLayer = use3d ? (
    <View style={{ width: petWidth, height: Math.round(petWidth * 1.12) }}>
      <Pet3DViewer ref={viewerRef} identity={identity} displayName={pet?.name ?? undefined} demoTwin={demo} twin={twin} pose={pose} interactive={interactive} frameTarget={frameTarget} view={view} stageRole={runtimeStageRole} stageTheme={stageTheme} petId={pet?.id ?? null} sourceMediaCount={sourceMediaCount} onStatus={setPet3d} />
    </View>
  ) : (
    <View pointerEvents={onPressPet ? "none" : undefined}>
      <PetStageRenderer
        pet={pet}
        spec={photoUri ? { mode: "photo", uri: photoUri } : spec}
        width={petWidth}
      />
    </View>
  );
  return (
    <View testID={stageTestId} style={[styles.stage, compact && styles.stageCompact, { height }, reviewStudio ? styles.stageReview : styles.stageLiving]}>
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
          <View style={styles.projectionPlane} />
          <View style={styles.projectionGlow} />
          <View style={styles.spatialPillar} />
          <View style={styles.stageAccent} />
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

      {/* Personal photo is an opt-in alternative to the bundled demo model.
          The preference is pet-ID scoped: switching pets never reuses media. */}
      {photoUri && canShow3d && pet?.id && !reviewStudio ? (
        <Pressable
          testID={`pli.${variant}.view-switch`}
          accessibilityRole="button"
          accessibilityLabel={showPhoto ? "切换为可旋转的 3D 形象" : "切换为主人上传的真实照片"}
          accessibilityState={{ selected: showPhoto }}
          style={styles.photoSwitch}
          onPress={() => setPhotoView({ petId: pet.id, enabled: !showPhoto })}
        >
          <Ionicons name={showPhoto ? "cube-outline" : "images-outline"} size={14} color={COLORS.brandPrimaryDeep} />
          <Text style={styles.photoSwitchText}>{showPhoto ? "看 3D 形象" : "看真实照片"}</Text>
        </Pressable>
      ) : null}

      {/* identity + now line + honest note */}
      <View style={styles.head}>
        <View style={styles.identityCopy}>
          <Text style={styles.eyebrow}>{reviewStudio ? "看看这是不是它" : variant === "life" ? "它的生命空间" : "今天，和它在一起"}</Text>
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
  // Spatial framing, not a dashboard and not a fake holographic HUD.
  spatialPillar: { position: "absolute", right: 25, top: 126, bottom: 125, width: 3, borderRadius: 3, backgroundColor: COLORS.stageWarmBeamSoft },
  stageAccent: { position: "absolute", left: 24, bottom: 100, width: 126, height: 4, borderRadius: 4, backgroundColor: COLORS.stageWarmHorizon },
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
    opacity: 0.24,
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
    opacity: 0.22,
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
    opacity: 0.21,
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
    opacity: 0.28,
  },
  // A quiet projection footprint supplies the "subtle holographic presence"
  // from the master without blue neon, grids or a decorative halo behind pet.
  projectionPlane: {
    position: "absolute",
    left: "24%",
    right: "24%",
    bottom: 91,
    height: 25,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#B99A704A",
    backgroundColor: "#FFF8EB63",
    opacity: 0.78,
  },
  projectionGlow: {
    position: "absolute",
    left: "31%",
    right: "31%",
    bottom: 86,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#F5DFC49A",
    opacity: 0.38,
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
  pressPet: { position: "absolute", left: 0, right: 0, bottom: 89, alignItems: "center" },
  petSlot: { position: "absolute", left: 0, right: 0, bottom: 89, alignItems: "center" },
  petSlotLife: { bottom: 118 },
  lifeRibbon: { position: "absolute", bottom: 12, left: SPACE.s4, right: SPACE.s4, flexDirection: "row", borderRadius: 21, paddingVertical: 9, backgroundColor: "#FFFEF6EC", borderWidth: StyleSheet.hairlineWidth, borderColor: "#EAF2E7" },
  lifeRibbonItem: { flex: 1, minWidth: 0 },
  photoSwitch: { position: "absolute", top: 167, right: SPACE.s4, zIndex: 11, minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#FFFDF0E8", borderWidth: StyleSheet.hairlineWidth, borderColor: "#DDE7DB" },
  photoSwitchText: { fontSize: TYPE.caption, color: "#365F49", fontWeight: "700" },
  head: { position: "absolute", top: SPACE.s8, left: SPACE.s6, right: SPACE.s6, flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2 },
  identityCopy: { flex: 1 },
  eyebrow: { fontSize: 12, letterSpacing: 2, fontWeight: "700", color: "#547563", marginBottom: 6 },
  name: { fontSize: 43, fontWeight: "800", letterSpacing: -1.3, color: "#294837" },
  demoChip: { backgroundColor: COLORS.surfaceOverlay, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  demoChipText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  nowBlock: { position: "absolute", left: SPACE.s6, right: SPACE.s6, top: 122 },
  nowBlockLife: { left: SPACE.s6, right: SPACE.s6, top: 123, bottom: undefined, borderWidth: 0, backgroundColor: "transparent" },
  headline: { fontSize: 16, fontWeight: "700", color: "#395A44" },
  caption: { fontSize: 12, color: "#5E7665", marginTop: 5 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  note: { fontSize: TYPE.caption, color: COLORS.textTertiary },
});