/**
 * PetTwinReviewScreen — 3D 形象 Review (R.2-P3D §20).
 *
 * Owner identity verification: renders the candidate with the shared 3D living
 * stage, owner answers 很像 / 基本像 / 不像, and only these two may reach
 * activation. 不像 cannot become active and keeps the prior active/fallback.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { PetLivingStage } from "../components/life/PetLivingStage";
import type { Pet3DViewerHandle } from "../components/three/Pet3DViewer";
import type { TwinDescriptor } from "@pli/pet-3d";

type StackNav = NativeStackNavigationProp<StackParamList>;
type Route = RouteProp<StackParamList, "TwinReview">;
export interface TwinModel {
  version: number;
  provider: string;
  geometry_version: string;
  texture_version: string;
  rig_version: string;
  status: string;
  owner_verified: boolean | null;
  observed_surface_manifest: Record<string, string>;
  inferred_surface_manifest: Record<string, string>;
  provenance_kind: string;
  artifact_map?: { twin_descriptor?: TwinDescriptor };
}

const ISSUES = ["脸", "耳朵", "毛色", "花纹", "体型", "尾巴", "四肢", "其他"];
const OPTIONS = [
  { k: "like", label: "很像" },
  { k: "basic_like", label: "基本像" },
  { k: "not_like", label: "不像" },
];
const VIEWS: Array<{ key: "front" | "side" | "back"; label: string }> = [
  { key: "front", label: "正面" },
  { key: "side", label: "侧面" },
  { key: "back", label: "背面" },
];
const VIEW_LABEL: Record<string, string> = { front: "正面", side: "侧面", back: "背面" };

export function PetTwinReviewScreen() {
  const navigation = useNavigation<StackNav>();
  const route = useRoute<Route>();
  const { pets, petId } = usePets();
  const version = route.params?.version ?? 0;
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedIssues, setPickedIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<TwinDescriptor | null>(null);
  const [sourceMediaCount, setSourceMediaCount] = useState(0);
  const [view, setView] = useState<"front" | "side" | "back">("front");
  const [resolvedVersion, setResolvedVersion] = useState(version);
  const viewerRef = useRef<Pet3DViewerHandle>(null);

  const load = useCallback(() => {
    if (!petId) return;
    setLoading(true);
    // The demo deep-link navigates without a version param; resolve the
    // latest candidate before review so the screen never renders a dead
    // error state just because a URL omitted the version.
    const request =
      version > 0
        ? Promise.resolve(version)
        : api
            .get<{ models: Array<{ version: number }> }>(`/pets/${petId}/visual-models`)
            .then((r) => r.models[0]?.version ?? 0);
    request
      .then((v) => {
        setResolvedVersion(v);
        return v > 0
          ? api.get<TwinModel>(`/pets/${petId}/visual-models/${v}`)
          : Promise.reject(new Error("NO_MODEL"));
      })
      .then((m) => {
        const map = (m as { artifact_map?: { twin_descriptor?: TwinDescriptor } }).artifact_map;
        const desc = map?.twin_descriptor;
        const surface = (desc as { surface?: { observed_regions?: string[] } } | undefined)?.surface;
        setCandidate(desc ?? null);
        setSourceMediaCount(surface?.observed_regions?.length ?? 0);
        setMessage(null);
      })
      .catch((e: unknown) => {
        // Honest distinct states: no model yet vs real load failure.
        if (e instanceof Error && e.message === "NO_MODEL") {
          setMessage("还没有已生成的 3D 形象。先拍摄素材并生成后再确认。");
        } else {
          setMessage("暂时连接不上，请重试。");
        }
      })
      .finally(() => setLoading(false));
  }, [petId, version]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleIssue = (it: string) =>
    setPickedIssues((xs) => (xs.includes(it) ? xs.filter((x) => x !== it) : [...xs, it]));

  const submit = async () => {
    if (!petId || resolvedVersion <= 0 || !selected) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/pets/${petId}/visual-models/${resolvedVersion}/verify`, {
        result: selected,
        issues: selected === "not_like" ? pickedIssues : [],
      });
      if (selected === "not_like") {
        // R5.4: negative review is real product feedback. Persist the selected
        // issue details, but never activate this candidate.
        setMessage("已记录哪里不像。补充更多素材后可以重新生成；当前 3D 形象不会被替换。");
        return;
      }
      await api.post(`/pets/${petId}/visual-models/${resolvedVersion}/activate`, {});
      setMessage("已确认相似，并已启用为当前 3D 形象。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  // SAFETY: 不像 may be submitted as feedback, but the activation CTA itself
  // remains disabled to preserve the canonical not_like → disabled contract.
  const ctaDisabled = !selected || busy || selected === "not_like";

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header} testID="pli.twinreview.identity">
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>确认 3D 形象</Text>
      </View>

      {loading || !pet ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PetLivingStage pet={pet} spec={resolvePetStage(pet)} variant="review" demo={DEMO_ENV} twin={candidate} sourceMediaCount={sourceMediaCount} pose="Idle" interactive frameTarget={0.30} view={view} viewerRef={viewerRef} />
          <Text style={styles.caption}>
            这是第 {resolvedVersion || "—"} 版候选形象。请从正面、侧面和背面重点看脸、耳朵、毛色、体型与尾巴；只有你确认相似后才会启用。
          </Text>
          <Text style={styles.provenanceNote}>
            {sourceMediaCount > 0
              ? `已关联 ${sourceMediaCount} 处素材区域；未观察到的部分仍可能来自模板推断。`
              : `当前外观来自演示/模板，不代表${pet?.name ?? "宠物"}的真实扫描或已验证个体外观。`}
          </Text>

          <View style={styles.viewRow} accessibilityLabel="视图选择">
            {VIEWS.map((v) => (
              <Pressable
                key={v.key}
                testID={`pli.twinreview.view.${v.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: view === v.key }}
                onPress={() => setView(v.key)}
                style={[styles.viewChip, view === v.key && styles.viewChipSel]}
              >
                <Text style={[styles.viewChipText, view === v.key && styles.viewChipTextSel]}>{v.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.viewNote}>当前视图：{VIEW_LABEL[view] ?? view}</Text>

          <View style={styles.cameraRow} accessibilityLabel="3D 形象缩放与重置">
            <Pressable accessibilityRole="button" accessibilityLabel="缩小 3D 形象" onPress={() => viewerRef.current?.zoomOut()} style={styles.cameraBtn}>
              <Ionicons name="remove" size={17} color={COLORS.textSecondary} />
              <Text style={styles.cameraBtnText}>缩小</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="放大 3D 形象" onPress={() => viewerRef.current?.zoomIn()} style={styles.cameraBtn}>
              <Ionicons name="add" size={17} color={COLORS.textSecondary} />
              <Text style={styles.cameraBtnText}>放大</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="重置 3D 视图" onPress={() => viewerRef.current?.resetView()} style={styles.cameraBtn}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.cameraBtnText}>重置</Text>
            </Pressable>
          </View>

          <View style={styles.options}>
            {OPTIONS.map((o) => (
              <Pressable key={o.k} testID={`pli.twinreview.verify.${o.k}`} accessibilityRole="button" accessibilityState={{ selected: selected === o.k }}
                onPress={() => setSelected(o.k)} style={[styles.opt, selected === o.k && styles.optSel]}>
                <Text style={[styles.optText, selected === o.k && styles.optTextSel]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          {selected === "not_like" ? (
            <View style={styles.issueBox}>
              <Text style={styles.issueLabel}>哪里不像？</Text>
              <View style={styles.chipRow}>
                {ISSUES.map((i, idx) => (
                  <Pressable key={i} testID={`pli.twinreview.issue.${idx}`} accessibilityRole="button" onPress={() => toggleIssue(i)}
                    style={[styles.chip, pickedIssues.includes(i) && styles.chipSel]}>
                    <Text style={[styles.chipText, pickedIssues.includes(i) && styles.chipTextSel]}>{i}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={styles.message} testID="pli.twinreview.status">
            {message ?? "等待你的确认：像它吗？"}
          </Text>

          {selected === "not_like" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              testID="pli.twinreview.action.feedback"
              disabled={busy}
              onPress={submit}
              style={[styles.feedbackCta, busy && styles.ctaDisabled]}
            >
              <Text style={styles.feedbackCtaText}>{busy ? "提交中…" : "提交不像反馈"}</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: ctaDisabled }}
            testID="pli.twinreview.action.activate"
            disabled={ctaDisabled}
            onPress={submit}
            style={[styles.cta, ctaDisabled && styles.ctaDisabled]}
          >
            <Text style={styles.ctaText}>{busy ? "提交中…" : selected === "not_like" ? "需补充素材后重新生成" : "确认并启用"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: TYPE.pageTitle, color: COLORS.textPrimary, fontWeight: "700", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACE.s3, paddingBottom: SPACE.s8 },
  caption: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACE.s2 },
  provenanceNote: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginTop: SPACE.s1 },
  viewRow: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s3 },
  viewChip: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 10, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  viewChipSel: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  viewChipText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  viewChipTextSel: { color: COLORS.brandPrimaryDeep },
  viewNote: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  cameraRow: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s2 },
  cameraBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 12,
  },
  cameraBtnText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  options: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s3 },
  opt: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 12 },
  optSel: { backgroundColor: COLORS.brandPrimary },
  optText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  optTextSel: { color: COLORS.textInverse },
  issueBox: { marginTop: SPACE.s3 },
  issueLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipSel: { backgroundColor: COLORS.brandPrimary, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  chipTextSel: { color: COLORS.textInverse },
  message: { marginTop: SPACE.s3, fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  cta: { marginTop: SPACE.s4, backgroundColor: COLORS.brandPrimary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  feedbackCta: {
    marginTop: SPACE.s4,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    paddingVertical: 13,
    alignItems: "center",
  },
  feedbackCtaText: { color: COLORS.textPrimary, fontSize: TYPE.body, fontWeight: "700" },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.textInverse, fontSize: TYPE.body, fontWeight: "700" },
});
