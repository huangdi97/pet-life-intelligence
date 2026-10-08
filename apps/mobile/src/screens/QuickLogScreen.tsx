/**
 * QuickLogScreen — 为当前宠物记录 (modal, Stage R.2 §41-43). One-hand 2-tap flow:
 * pet context header → icon tiles (常用 first) → light form → save. All
 * writes go to the same canonical endpoints as before; success/error copy is
 * user language only.
 */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { PetContextHeader } from "../components/pet/PetContextHeader";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { clampMinutes, LOG_TYPES, type LogType } from "./quicklog_types";
import { QuickLogForm, QuickLogGrid, type QuickLogFields } from "./quicklog_sections";

type StackNav = NativeStackNavigationProp<StackParamList>;

export function QuickLogScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("");
  const [minutes, setMinutes] = useState("");
  const [weight, setWeight] = useState("");
  const [behavior, setBehavior] = useState("");
  const [diaryText, setDiaryText] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ uri: string; name: string; type: string }>>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  function pick(key: string) {
    // Medication and structured behavior records have governed domain flows.
    // Quick Log must never manufacture a GIVEN medication without a selected
    // plan, nor collapse ABC behavior evidence into an empty generic event.
    if (key === "medication") {
      navigation.navigate("Medication");
      return;
    }
    if (key === "behavior") {
      navigation.navigate("Behavior");
      return;
    }
    setSelected(key);
    setSuccess(null);
    setError(null);
    setAmount("");
    setUnit("");
    setMinutes("");
    setWeight("");
    setBehavior("");
    setDiaryText("");
    setKind(null);
    setMediaFiles([]);
  }

  function resetInputs() {
    setAmount("");
    setUnit("");
    setMinutes("");
    setWeight("");
    setBehavior("");
    setDiaryText("");
    setKind(null);
  }

  async function chooseEvidencePhotos() {
    if (!current || mediaFiles.length >= 3) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("需要相册权限才能添加照片；不授权也可以继续保存记录。");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - mediaFiles.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, 3 - mediaFiles.length).map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `quicklog-${Date.now()}-${index + 1}.jpg`,
      type: asset.mimeType || "image/jpeg",
    }));
    setMediaFiles((old) => [...old, ...picked].slice(0, 3));
  }

  const fields: QuickLogFields = {
    amount, setAmount, unit, setUnit, minutes, setMinutes, weight, setWeight,
    behavior, setBehavior, diaryText, setDiaryText, kind, setKind,
  };

  async function save() {
    if (!current || !selected || saving) return;
    const t: LogType | undefined = LOG_TYPES.find((x) => x.key === selected);
    if (!t) return;
    setSaving(true);
    setError(null);
    try {
      let payload: Record<string, unknown> = {};
      let path = `/pets/${current.id}/events`;
      if (t.event_type === "daily.meal" || t.event_type === "daily.drink") {
        if (amount.trim() && !unit.trim()) {
          setError("填写数量时，请同时填写单位。");
          return;
        }
        if (amount.trim()) payload.amount = amount.trim();
        if (unit.trim()) payload.unit = unit.trim();
      } else if (t.event_type === "daily.elimination") {
        if (kind) payload.kind = kind;
      } else if (t.event_type === "daily.walk" || t.event_type === "daily.play" || t.event_type === "daily.sleep") {
        const duration = clampMinutes(minutes);
        if (!minutes.trim() || duration <= 0) {
          setError("请填写实际时长（分钟）。");
          return;
        }
        payload = { duration_minutes: duration };
      } else if (t.event_type === "daily.weight") {
        const w = parseFloat(weight);
        if (!Number.isFinite(w) || w <= 0) {
          setError("请输入有效的体重数值。");
          return;
        }
        payload = { weight_kg: String(w) };
      } else if (t.event_type === "medication.administered" || t.event_type === "behavior.observed") {
        throw new Error("请从对应的完整记录页提交这类记录。");
      } else {
        const d = diaryText.trim();
        if (!d) {
          setError("请写一点备注内容。");
          return;
        }
        path = `/pets/${current.id}/diary`;
        payload = { text: d };
      }

      if (t.event_type === "diary.created") {
        await api.post(path, payload);
      } else {
        const artifactIds: string[] = [];
        for (const file of mediaFiles.slice(0, 3)) {
          const uploaded = await api.upload<{ artifact_id: string }>(
            `/pets/${current.id}/artifacts`,
            file,
          );
          artifactIds.push(uploaded.artifact_id);
        }
        await api.post(path, {
          event_type: t.event_type,
          payload,
          artifact_ids: artifactIds,
        });
      }
      setSuccess(
        `已记录${t.zh}。${t.event_type !== "diary.created" && mediaFiles.length ? ` 已绑定 ${mediaFiles.length} 张照片。` : ""}`,
      );
      resetInputs();
      setSelected(null);
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const selectedType: LogType | undefined = selected ? LOG_TYPES.find((x) => x.key === selected) : undefined;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View testID="pli.quicklog.identity">
        <PetContextHeader pet={current} title={current ? `为${current.name}记录` : "快速记录"} mediaUri={resolvePetMediaUri(current)} onPress={() => navigation.goBack()} />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.feedback} accessibilityLiveRegion="polite" testID="pli.quicklog.feedback">
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : (
          <View style={styles.feedback} accessibilityLiveRegion="polite" testID="pli.quicklog.feedback">
            <Text style={styles.noteText}>记录会保存来源与时间，可在时间线查看。</Text>
          </View>
        )}
        {error ? (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" testID="pli.quicklog.error">
            {error}
          </Text>
        ) : null}

        {selectedType ? (
          <QuickLogForm
            t={selectedType}
            fields={fields}
            saving={saving}
            mediaCount={mediaFiles.length}
            onAddMedia={() => void chooseEvidencePhotos()}
            onClearMedia={() => setMediaFiles([])}
            onSave={() => void save()}
          />
        ) : (
          <QuickLogGrid onPick={pick} onOpenHealth={() => navigation.navigate("Health")} />
        )}

        <View style={styles.closeWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel="完成并关闭" onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>完成</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8, paddingTop: SPACE.s4 },
  feedback: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s2 },
  successText: { fontSize: TYPE.body, color: COLORS.success, fontWeight: "600" },
  noteText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s2 },
  closeWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  closeBtn: { paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.dividerStrong, alignItems: "center" },
  closeText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
});
