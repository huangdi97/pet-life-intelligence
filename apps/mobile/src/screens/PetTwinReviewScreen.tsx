/**
 * PetTwinReviewScreen — 3D 形象 Review (R.2-P3D §20).
 *
 * Owner identity verification: renders the candidate with the shared 3D living
 * stage, owner answers 很像 / 基本像 / 不像, and only these two may reach
 * activation. 不像 cannot become active and keeps the prior active/fallback.
 */
import React, { useCallback, useEffect, useState } from "react";
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
  { k: "basic_like", label: "有点像" },
  { k: "not_like", label: "不像" },
];

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

  const load = useCallback(() => {
    if (!petId) return;
    setLoading(true);
    api
      .get<TwinModel>(`/pets/${petId}/visual-models/${version}`)
      .then((m) => {
        // The candidate twin descriptor lives in artifact_map.twin_descriptor
        // (family/morph/texture/surface) produced by the backend pipeline.
        const map = (m as { artifact_map?: { twin_descriptor?: TwinDescriptor } }).artifact_map;
        setCandidate(map?.twin_descriptor ?? null);
      })
      .catch(() => setMessage("暂时连接不上，请重试。"))
      .finally(() => setLoading(false));
  }, [petId, version]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleIssue = (it: string) =>
    setPickedIssues((xs) => (xs.includes(it) ? xs.filter((x) => x !== it) : [...xs, it]));

  const submit = async () => {
    if (!petId || !selected) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post(`/pets/${petId}/visual-models/${version}/verify`, {
        result: selected,
        issues: pickedIssues,
      });
      if (selected === "not_like") {
        setMessage("好的，这个形象暂不启用。你可以再补充更多角度来生成更接近的样子。");
      } else {
        await api.post(`/pets/${petId}/visual-models/${version}/activate`, {});
        setMessage("已确认相似，并已启用为当前 3D 形象。");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>确认 3D 形象</Text>
      </View>

      {loading || !pet ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PetLivingStage pet={pet} spec={resolvePetStage(pet)} variant="life" demo={DEMO_ENV} twin={candidate} pose="Idle" />
          <Text style={styles.caption}>
            这是根据豆豆的照片与模板生成的第 {version} 版干净形象。旋转查看后回答：像它吗？
          </Text>

          <View style={styles.options}>
            {OPTIONS.map((o) => (
              <Pressable key={o.k} accessibilityRole="button" accessibilityState={{ selected: selected === o.k }}
                onPress={() => setSelected(o.k)} style={[styles.opt, selected === o.k && styles.optSel]}>
                <Text style={[styles.optText, selected === o.k && styles.optTextSel]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          {selected === "not_like" ? (
            <View style={styles.issueBox}>
              <Text style={styles.issueLabel}>哪里不像？</Text>
              <View style={styles.chipRow}>
                {ISSUES.map((i) => (
                  <Pressable key={i} accessibilityRole="button" onPress={() => toggleIssue(i)}
                    style={[styles.chip, pickedIssues.includes(i) && styles.chipSel]}>
                    <Text style={[styles.chipText, pickedIssues.includes(i) && styles.chipTextSel]}>{i}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable accessibilityRole="button" disabled={!selected || busy} onPress={submit}
            style={[styles.cta, (!selected || busy) && styles.ctaDisabled]}>
            <Text style={styles.ctaText}>{busy ? "提交中…" : "提交确认"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { padding: 4 },
  title: { fontSize: TYPE.pageTitle, color: COLORS.textPrimary, fontWeight: "700", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACE.s3, paddingBottom: SPACE.s8 },
  caption: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACE.s2 },
  options: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s3 },
  opt: { flex: 1, alignItems: "center", paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 12 },
  optSel: { backgroundColor: COLORS.brandPrimary },
  optText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  optTextSel: { color: COLORS.textInverse },
  issueBox: { marginTop: SPACE.s3 },
  issueLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipSel: { backgroundColor: COLORS.brandPrimary, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  chipTextSel: { color: COLORS.textInverse },
  message: { marginTop: SPACE.s3, fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  cta: { marginTop: SPACE.s4, backgroundColor: COLORS.brandPrimary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.textInverse, fontSize: TYPE.body, fontWeight: "700" },
});