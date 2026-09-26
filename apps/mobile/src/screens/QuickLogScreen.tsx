/**
 * QuickLogScreen — 为豆豆记录 (modal, Stage R.2 §41-43). One-hand 2-tap flow:
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
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  function pick(key: string) {
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
        if (amount.trim()) payload.amount = amount.trim();
        if (unit.trim()) payload.unit = unit.trim();
      } else if (t.event_type === "daily.elimination") {
        if (kind) payload.kind = kind;
      } else if (t.event_type === "daily.walk" || t.event_type === "daily.play" || t.event_type === "daily.sleep") {
        payload = { duration_minutes: clampMinutes(minutes) };
      } else if (t.event_type === "daily.weight") {
        const w = parseFloat(weight);
        if (!Number.isFinite(w) || w <= 0) {
          setError("请输入有效的体重数值。");
          return;
        }
        payload = { weight_kg: String(w) };
      } else if (t.event_type === "medication.administered") {
        payload = { plan_id: "", administered_at: new Date().toISOString(), by_actor: "主人", status: "GIVEN" };
      } else if (t.event_type === "behavior.observed") {
        const b = behavior.trim();
        if (!b) {
          setError("请简单描述一下行为。");
          return;
        }
        payload = { behavior: b, behavior_event_id: "", intensity_source: "OWNER_REPORTED" };
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
        await api.post(path, { event_type: t.event_type, payload });
      }
      setSuccess(`已记录${t.zh}。`);
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
      <PetContextHeader pet={current} title={current ? `为${current.name}记录` : "快速记录"} mediaUri={resolvePetMediaUri(current)} onPress={() => navigation.goBack()} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.feedback} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {selectedType ? (
          <QuickLogForm t={selectedType} fields={fields} saving={saving} onSave={() => void save()} />
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
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s2 },
  closeWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  closeBtn: { paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.dividerStrong, alignItems: "center" },
  closeText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
});
