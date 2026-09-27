/**
 * PetTwinCaptureScreen — Pet Twin Capture Wizard (R.2-P3D §11/§12).
 *
 * Consumer-grade capture flow: six angles with live ✓/✗ coverage, a QC step
 * that reports clear re-shoot guidance on missing coverage, then enqueues
 * candidate generation against the template-local pipeline. Photo upload and
 * AI segmentation are honestly EXTERNAL_BLOCKED here (no real vision provider);
 * the wizard records owner angle coverage and generates with a demo artifact
 * id. A real provider upgrades this behind the adapter with no UI rewrite.
 */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";

type StackNav = NativeStackNavigationProp<StackParamList>;
type AngleKey = "front" | "left" | "right" | "back" | "full_body" | "head";

const ANGLES: { key: AngleKey; label: string; hint: string }[] = [
  { key: "front", label: "正面", hint: "正对宠物" },
  { key: "left", label: "左侧", hint: "身体侧面" },
  { key: "right", label: "右侧", hint: "身体另一侧" },
  { key: "back", label: "背面", hint: "背对视角" },
  { key: "full_body", label: "全身", hint: "站立全身照" },
  { key: "head", label: "头部", hint: "清晰头部特写" },
];

interface QcResult {
  qc_passed: boolean;
  status: string;
  capture_id: string;
  qc_result?: { missing_angles?: string[]; retake_guidance?: string[] };
}

export function PetTwinCaptureScreen() {
  const navigation = useNavigation<StackNav>();
  const { petId } = usePets();
  const [shots, setShots] = useState<Record<AngleKey, boolean>>({
    front: false, left: false, right: false, back: false, full_body: false, head: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qc, setQc] = useState<QcResult | null>(null);

  const covered = Object.values(shots).filter(Boolean).length;

  const toggle = (k: AngleKey) => setShots((s) => ({ ...s, [k]: !s[k] }));

  const run = async () => {
    if (!petId) return;
    setBusy(true);
    setError(null);
    setQc(null);
    try {
      const cap = await api.post<{ capture_id: string }>(`/pets/${petId}/visual-captures`, {
        artifact_ids: ["00000000-0000-0000-0000-000000000001"],
        capture_type: "PHOTO_SET",
        consent_visual_model_training: false,
        coverage: { ...shots },
      });
      const capId = (cap as { capture_id: string }).capture_id;
      const q = (await api.post<QcResult>(`/pets/${petId}/visual-captures/${capId}/qc`, {})) as QcResult;
      setQc(q);
      if (q.qc_passed) {
        await api.post(`/pets/${petId}/visual-models`, { capture_id: capId });
        navigation.navigate("TwinVersion");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试");
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
        <View style={styles.headerText}>
          <Text style={styles.title}>创建 3D 形象</Text>
          <Text style={styles.subtitle}>为豆豆拍六个角度，越全越像</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverageWrap}>
          {ANGLES.map((a) => (
            <Pressable
              key={a.key}
              accessibilityRole="button"
              accessibilityState={{ checked: shots[a.key] }}
              accessibilityLabel={`${a.label}${shots[a.key] ? "已拍摄" : "未拍摄"}`}
              onPress={() => toggle(a.key)}
              style={[styles.angle, shots[a.key] && styles.angleDone]}
            >
              <Ionicons name={shots[a.key] ? "checkmark-circle" : "ellipse-outline"} size={18}
                color={shots[a.key] ? COLORS.success : COLORS.textTertiary} />
              <View style={styles.angleText}>
                <Text style={styles.angleLabel}>{a.label}{shots[a.key] ? " ✓" : ""}</Text>
                <Text style={styles.angleHint}>{a.hint}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            已选 {covered}/{ANGLES.length} 个角度。建议至少完成“正面 + 全身 + 头部”。这一步只记录覆盖情况；照片上传与智能分隔由未来真实服务完成。
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {qc && !qc.qc_passed ? (
          <View style={styles.qcBox}>
            <Text style={styles.qcTitle}>需要补拍</Text>
            {(qc.qc_result?.retake_guidance ?? []).map((g) => (
              <Text key={g} style={styles.qcItem}>· {g}</Text>
            ))}
          </View>
        ) : null}

        <Pressable accessibilityRole="button" disabled={busy} onPress={run} style={[styles.cta, busy && styles.ctaDisabled]}>
          <Text style={styles.ctaText}>{busy ? "正在生成…" : "开始生成 3D 形象"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: TYPE.pageTitle, color: COLORS.textPrimary, fontWeight: "700" },
  subtitle: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: SPACE.s3, paddingBottom: SPACE.s8 },
  coverageWrap: { gap: SPACE.s2 },
  angle: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, backgroundColor: COLORS.surface, borderRadius: 14, padding: SPACE.s3 },
  angleDone: { borderWidth: 1, borderColor: COLORS.success },
  angleText: { flex: 1 },
  angleLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  angleHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 2 },
  hintBox: { backgroundColor: COLORS.bgSurfaceMuted, borderRadius: 14, padding: SPACE.s3, marginTop: SPACE.s3 },
  hintText: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  error: { color: COLORS.danger, marginTop: SPACE.s3, fontSize: TYPE.sm },
  qcBox: { backgroundColor: COLORS.attentionBg, borderRadius: 14, padding: SPACE.s3, marginTop: SPACE.s3 },
  qcTitle: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.warning, marginBottom: 4 },
  qcItem: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  cta: { marginTop: SPACE.s4, backgroundColor: COLORS.brandPrimary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.textInverse, fontSize: TYPE.body, fontWeight: "700" },
});