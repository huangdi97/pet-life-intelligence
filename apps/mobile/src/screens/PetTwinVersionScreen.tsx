/**
 * PetTwinVersionScreen — Pet Twin Appearance / Version (R.2-P3D §21/§22).
 *
 * Lists all candidate versions for the current pet, marks the active one,
 * shows the per-version surface manifest (photo-observed vs template-inferred)
 * and version probes (geometry/texture/rig), and routes into owner review.
 */
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { OpenSection } from "../components/feedback/OpenSection";
import type { TwinModel } from "./PetTwinReviewScreen";

type StackNav = NativeStackNavigationProp<StackParamList>;

interface VersionEntry extends TwinModel {
  model_id: string;
  owner_verified: boolean | null;
}

const STATUS_LABEL: Record<string, string> = {
  READY: "待主人确认", VERIFYING: "已提交确认", ACTIVE: "当前使用中",
  RETIRED: "已停用", FAILED: "生成失败", GENERATING: "生成中",
};

export function PetTwinVersionScreen() {
  const navigation = useNavigation<StackNav>();
  const { pets, petId } = usePets();
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const [versions, setVersions] = useState<VersionEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!petId) return;
    setLoading(true);
    setLoadError(false);
    api.get<{ models: VersionEntry[] }>(`/pets/${petId}/visual-models`)
      .then((r) => setVersions(r.models))
      // error state must stay distinct from the empty state (V4 §12): a load
      // failure is never "还没有 3D 形象".
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [petId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusText = (s: string) => STATUS_LABEL[s] ?? "其他状态";
  const active = versions?.find((v) => v.status === "ACTIVE");
  const activeIsDemo = active?.metadata_json?.demo_fixture === true;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header} testID="pli.twinversion.identity">
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>3D 形象的版本</Text>
          <Text style={styles.subtitle}>{pet?.name ?? "宠物"}的每一版 3D 形象都保留在这里</Text>
        </View>
        <Pressable
          testID="pli.twinversion.entry"
          accessibilityRole="button"
          accessibilityLabel="创建新的形象"
          onPress={() => navigation.navigate("TwinCapture")}
          style={styles.add}
        >
          <Ionicons name="add" size={22} color={COLORS.textInverse} />
        </Pressable>
      </View>


      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.brandPrimary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loadError ? (
            <OpenSection title="暂时连接不上">
              <View style={styles.loadErrorRow}>
                <Text style={styles.emptyText}>暂时无法获取 3D 形象列表，请稍后重试。</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="重试加载 3D 形象版本" onPress={load} style={styles.cta}>
                  <Text style={styles.ctaText}>重试</Text>
                </Pressable>
              </View>
            </OpenSection>
          ) : (
            <>
              {active ? (
                <View testID="pli.twinversion.current">
                  <OpenSection title="当前 3D 形象">
                    <View style={styles.activeRow}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text testID="pli.twinversion.time" style={styles.activeText}>
                        {activeIsDemo
                          ? "示例 3D 形象 · 使用中 · 演示模板"
                          : `第 ${active.version} 版 · 使用中 · ${active.texture_version === "photo-projection-v1" ? "由照片生成" : "模板默认"}外观`}
                      </Text>
                    </View>
                    <View style={styles.badgeRow}>
                      <Text testID="pli.twinversion.source" style={styles.badgeText}>来源素材 · {Object.keys(active.observed_surface_manifest ?? {}).length} 项</Text>
                      <Text testID="pli.twinversion.verify" style={styles.badgeText}>
                        {activeIsDemo ? "示例体验 · 非真实宠物身份确认" : active.owner_verified ? "已通过主人确认" : "待主人确认"}
                      </Text>
                    </View>
                  </OpenSection>
                </View>
              ) : (
                <View testID="pli.twinversion.current">
                  <OpenSection title="当前 3D 形象">
                    <Text style={styles.emptyText}>还没有生成 3D 形象。拍摄素材并生成后，这里会显示版本信息。</Text>
                    <View style={styles.badgeRow}>
                      <Text testID="pli.twinversion.time" style={styles.badgeText}>生成时间 · 暂无</Text>
                      <Text testID="pli.twinversion.source" style={styles.badgeText}>来源素材 · 暂无</Text>
                      <Text testID="pli.twinversion.verify" style={styles.badgeText}>主人确认 · 待确认</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => navigation.navigate("TwinCapture")} style={styles.cta}>
                      <Text style={styles.ctaText}>创建 3D 形象</Text>
                    </Pressable>
                  </OpenSection>
                </View>
              )}
            </>
          )}

          <OpenSection title="版本说明" testID="pli.twinversion.info">
            <Text style={styles.emptyText}>每个版本都记录生成时间、来源与确认状态；示例模板会明确标注，真实候选只有确认后才会成为当前形象。</Text>
          </OpenSection>

          <View testID="pli.twinversion.history">
            <OpenSection title="全部版本">
              {versions?.map((v) => {
                const observed = Object.keys(v.observed_surface_manifest ?? {});
                return (
                  <View key={v.version} testID={`pli.twinversion.history.row.${v.version}`} style={styles.versionRow}>
                    <View style={styles.versionHead}>
                      <Text style={styles.versionTitle}>第 {v.version} 版</Text>
                      <Text style={styles.status}>{statusText(v.status)}</Text>
                    </View>
                    <Text style={styles.versionMeta}>外形 {v.geometry_version} · 外观 {v.texture_version} · 动作 {v.rig_version}</Text>
                    <Text style={styles.versionMeta}>
                      {observed.length ? `来自照片：${observed.join("、")}` : "外观由模板默认生成（无照片）"}
                    </Text>
                    <View testID={`pli.twinversion.history.action.${v.version}`} style={styles.rowActions}>
                      <Pressable testID={`pli.twinversion.history.${v.version}`} accessibilityRole="button" accessibilityLabel={`查看并确认第 ${v.version} 版 3D 形象`} onPress={() => navigation.navigate("TwinReview", { version: v.version })} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>查看 / 确认</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </OpenSection>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  emptyText: { fontSize: TYPE.body, color: COLORS.textSecondary, lineHeight: 22 },
  loadErrorRow: { alignItems: "flex-start", gap: SPACE.s3 },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { fontSize: TYPE.pageTitle, color: COLORS.textPrimary, fontWeight: "700" },
  subtitle: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brandPrimary, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACE.s3, paddingBottom: SPACE.s8 },
  cta: { minHeight: 48, justifyContent: "center", marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  ctaText: { color: COLORS.textInverse, fontSize: TYPE.body, fontWeight: "700" },
  activeRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 4 },
  activeText: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badgeText: { fontSize: TYPE.caption, color: COLORS.textSecondary, backgroundColor: COLORS.bgSurfaceMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  versionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  versionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  versionTitle: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "700" },
  status: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  versionMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 3 },
  rowActions: { marginTop: 8 },
  smallBtn: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.bgSurfaceMuted },
  smallBtnText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
});