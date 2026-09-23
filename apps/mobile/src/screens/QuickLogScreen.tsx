/** QuickLogScreen — 快速记录 (modal): 11 types → minimal input → save.
 *  10 types POST to the same event endpoint the api layer uses
 *  (POST /pets/{id}/events) with registry payload fields only; 备注 (diary)
 *  posts to the existing /pets/{id}/diary endpoint (the backend then creates
 *  the diary.created event with a real diary_id). 健康 has no safe direct
 *  event type — its tile opens the Health screen instead. Success shows
 *  feedback text; errors map to human language, never raw codes. */
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { Card, EmptyText, ErrorText, GhostButton, ScreenTitle } from "./ui";
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

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

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
      } else if (
        t.event_type === "daily.walk" ||
        t.event_type === "daily.play" ||
        t.event_type === "daily.sleep"
      ) {
        payload = { duration_minutes: clampMinutes(minutes) };
      } else if (t.event_type === "daily.weight") {
        const w = parseFloat(weight);
        if (!Number.isFinite(w) || w <= 0) {
          setError("请输入有效的体重数值。");
          return;
        }
        payload = { weight_kg: String(w) };
      } else if (t.event_type === "medication.administered") {
        // Registry payload fields only; the quick log does not attach to a
        // medication plan (plan-bound recording lives in the medication API).
        payload = { plan_id: "", administered_at: new Date().toISOString(), by_actor: "主人", status: "GIVEN" };
      } else if (t.event_type === "behavior.observed") {
        const b = behavior.trim();
        if (!b) {
          setError("请简单描述一下行为。");
          return;
        }
        payload = { behavior: b, behavior_event_id: "", intensity_source: "OWNER_REPORTED" };
      } else {
        // diary.created → existing /pets/{id}/diary endpoint; the backend
        // creates the diary.created life event with a real diary_id.
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

  const selectedType: LogType | undefined = selected
    ? LOG_TYPES.find((x) => x.key === selected)
    : undefined;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="快速记录" sub={current ? `为 ${current.name} 记一条` : ""} />

        {!current && <EmptyText>请先选择宠物。</EmptyText>}

        {success && (
          <Card>
            <Text style={styles.successText}>{success}</Text>
          </Card>
        )}
        {error && <ErrorText>{error}</ErrorText>}

        {selectedType ? (
          <QuickLogForm t={selectedType} fields={fields} saving={saving} onSave={() => void save()} />
        ) : (
          <QuickLogGrid onPick={pick} onOpenHealth={() => navigation.navigate("Health")} />
        )}

        <GhostButton label="完成" onPress={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  successText: { fontSize: TYPE.base, color: COLORS.ok, fontWeight: TYPE.weightMedium },
});
