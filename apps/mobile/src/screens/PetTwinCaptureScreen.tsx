/**
 * PetTwinCaptureScreen — Pet Twin Capture Wizard (R.2-P3D §11/§12).
 *
 * Consumer-grade capture flow: six angles with live ✓/✗ coverage, a QC step
 * that reports clear re-shoot guidance on missing coverage, then enqueues
 * candidate generation against the template-local pipeline. Production builds
 * capture and upload the owner's real photos; deterministic demo evidence uses
 * repository fixtures and never opens the host camera. AI vision remains
 * optional/external — the local deterministic pipeline still works without it.
 */
import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
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

/** Blind-UI id key: full_body → full (contract names six slots front/left/right/back/full/head). */
const viewId = (key: AngleKey) => (key === "full_body" ? "full" : key);

interface QcResult {
  qc_passed: boolean;
  status: string;
  capture_id: string;
  qc_result?: { missing_angles?: string[]; retake_guidance?: string[] };
}

export function PetTwinCaptureScreen() {
  const navigation = useNavigation<StackNav>();
  const { pets, petId } = usePets();
  const [shots, setShots] = useState<Record<AngleKey, string | null>>({
    front: null, left: null, right: null, back: null, full_body: null, head: null,
  });
  const [uploadingAngle, setUploadingAngle] = useState<AngleKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qc, setQc] = useState<QcResult | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const covered = Object.values(shots).filter(Boolean).length;
  const missing = ANGLES.filter((a) => !shots[a.key]).map((a) => a.label);
  const readyToSubmit = Boolean(shots.front && shots.full_body && shots.head);

  const captureAngle = async (k: AngleKey) => {
    if (!petId || uploadingAngle || busy) return;
    setError(null);
    if (DEMO_ENV) {
      // Deterministic CI/demo evidence never opens a host camera picker.
      setShots((s) => ({ ...s, [k]: s[k] ? null : `demo:${k}` }));
      return;
    }
    setUploadingAngle(k);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("需要相机权限才能拍摄 3D 形象素材。");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType && asset.mimeType.startsWith("image/")
        ? asset.mimeType
        : "image/jpeg";
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const row = await api.upload<{ artifact_id: string; kind: string }>(
        `/pets/${petId}/artifacts`,
        {
          uri: asset.uri,
          name: asset.fileName || `pet-twin-${k}-${Date.now()}.${extension}`,
          type: mimeType,
        },
      );
      if (row.kind !== "IMAGE") throw new Error("上传内容没有被识别为图片。");
      setShots((s) => ({ ...s, [k]: row.artifact_id }));
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setUploadingAngle(null);
    }
  };

  const resetShots = () => setShots({ front: null, left: null, right: null, back: null, full_body: null, head: null });

  const run = async () => {
    if (!petId) return;
    setBusy(true);
    setError(null);
    setQc(null);
    try {
      const realAngleArtifacts = Object.fromEntries(
        ANGLES.flatMap((a) => {
          const artifactId = shots[a.key];
          return artifactId && !artifactId.startsWith("demo:")
            ? [[a.key, artifactId] as const]
            : [];
        }),
      );
      const cap = await api.post<{ capture_id: string }>(`/pets/${petId}/visual-captures`, {
        artifact_ids: DEMO_ENV
          ? ["00000000-0000-0000-0000-000000000001"]
          : Object.values(realAngleArtifacts),
        capture_type: "PHOTO_SET",
        consent_visual_model_training: false,
        coverage: Object.fromEntries(ANGLES.map((a) => [a.key, Boolean(shots[a.key])])),
        angle_artifact_ids: DEMO_ENV ? {} : realAngleArtifacts,
      });
      const capId = (cap as { capture_id: string }).capture_id;
      const q = (await api.post<QcResult>(`/pets/${petId}/visual-captures/${capId}/qc`, {})) as QcResult;
      setQc(q);
      if (q.qc_passed) {
        await api.post(`/pets/${petId}/visual-models`, { capture_id: capId });
        navigation.navigate("TwinVersion");
      }
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  };

  const qcRows = [
    { key: "clarity", label: "清晰度", value: "拍摄后由智能检查确认" },
    { key: "occlusion", label: "遮挡", value: "拍摄后由智能检查确认" },
    { key: "coverage", label: "角度覆盖", value: `${covered}/${ANGLES.length} 个角度已覆盖` },
    { key: "identity", label: "身份素材", value: readyToSubmit ? "素材足够，可生成" : "素材不足，建议补拍" },
  ];

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header} testID="pli.twincapture.identity">
        <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} testID="pli.twincapture.title">创建 3D 形象</Text>
          <Text style={styles.subtitle}>为{pet?.name ?? "宠物"}拍六个角度，越全越像</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverageWrap} testID="pli.twincapture.preview">
          {ANGLES.map((a) => (
            <Pressable
              key={a.key}
              testID={`pli.twincapture.view.${viewId(a.key)}`}
              accessibilityRole="button"
              accessibilityState={{ checked: shots[a.key] }}
              accessibilityLabel={`${a.label}${shots[a.key] ? "已拍摄" : "尚未拍摄"}`}
              onPress={() => void captureAngle(a.key)}
              style={[styles.angle, shots[a.key] && styles.angleDone]}
            >
              <Ionicons name={shots[a.key] ? "checkmark-circle" : "ellipse-outline"} size={18}
                color={shots[a.key] ? COLORS.success : COLORS.textTertiary} />
              <View style={styles.angleText}>
                <Text style={styles.angleLabel}>{a.label}</Text>
                <Text testID={`pli.twincapture.status.${viewId(a.key)}`} style={[styles.angleStatus, shots[a.key] && styles.angleStatusDone]}>
                  {uploadingAngle === a.key ? "正在上传…" : shots[a.key] ? "已拍摄" : "尚未拍摄"}
                </Text>
                <Text style={styles.angleHint}>{a.hint}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.hintBox} testID="pli.twincapture.qc">
          <Text style={styles.qcTitle}>素材检查</Text>
          {qcRows.map((r) => (
            <View key={r.key} style={styles.qcRow}>
              <Text style={styles.qcLabel}>{r.label}</Text>
              <Text testID={`pli.twincapture.qc.${r.key}`} style={styles.qcValue}>{r.value}</Text>
            </View>
          ))}
        </View>

        {missing.length > 0 ? (
          <View style={styles.retakeBox} testID="pli.twincapture.retake">
            <Text style={styles.retakeText}>尚未拍摄：{missing.join("、")}。补拍后重新提交。</Text>
            <Pressable
              testID="pli.twincapture.retake.button"
              accessibilityRole="button"
              accessibilityLabel="重新拍摄"
              onPress={resetShots}
              style={styles.retakeBtn}
            >
              <Text style={styles.retakeBtnText}>重新拍摄</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {qc && !qc.qc_passed ? (
          <View style={styles.qcBox}>
            <Text style={styles.qcTitle}>需要补拍</Text>
            {(qc.qc_result?.retake_guidance ?? []).map((g) => (
              <Text key={g} style={styles.qcItem}>· {g}</Text>
            ))}
          </View>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !readyToSubmit }} disabled={busy || !readyToSubmit}
          onPress={run} style={[styles.cta, (busy || !readyToSubmit) && styles.ctaDisabled]} testID="pli.twincapture.action">
          <Text style={styles.ctaText}>{busy ? "正在生成…" : readyToSubmit ? "开始生成 3D 形象" : "先完成正面、全身和头部"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { fontSize: TYPE.pageTitle, color: COLORS.textPrimary, fontWeight: "700" },
  subtitle: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  content: { padding: SPACE.s3, paddingBottom: SPACE.s8 },
  coverageWrap: { gap: SPACE.s2 },
  angle: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, backgroundColor: COLORS.surface, borderRadius: 14, padding: SPACE.s3 },
  angleDone: { borderWidth: 1, borderColor: COLORS.success },
  angleText: { flex: 1 },
  angleLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  angleStatus: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 1 },
  angleStatusDone: { color: COLORS.success },
  angleHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 1 },
  hintBox: { backgroundColor: COLORS.bgSurfaceMuted, borderRadius: 14, padding: SPACE.s3, marginTop: SPACE.s3 },
  qcTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  qcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  qcLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  qcValue: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  retakeBox: { backgroundColor: COLORS.attentionBg, borderRadius: 14, padding: SPACE.s3, marginTop: SPACE.s3 },
  retakeText: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  retakeBtn: { minHeight: 44, justifyContent: "center", marginTop: SPACE.s2, alignSelf: "flex-start", backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingHorizontal: SPACE.s4, paddingVertical: 8 },
  retakeBtnText: { color: COLORS.textInverse, fontSize: TYPE.sm, fontWeight: "600" },
  error: { color: COLORS.danger, marginTop: SPACE.s3, fontSize: TYPE.sm },
  qcBox: { backgroundColor: COLORS.attentionBg, borderRadius: 14, padding: SPACE.s3, marginTop: SPACE.s3 },
  qcItem: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  cta: { minHeight: 52, justifyContent: "center", marginTop: SPACE.s4, backgroundColor: COLORS.brandPrimary, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: COLORS.textInverse, fontSize: TYPE.body, fontWeight: "700" },
});
