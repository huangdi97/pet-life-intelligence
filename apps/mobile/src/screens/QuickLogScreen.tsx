/** QuickLogScreen — 快速记录 (modal): 11 types → minimal input → save.
 *  10 types POST to the same event endpoint the api layer uses
 *  (POST /pets/{id}/events) with registry payload fields only; 备注 (diary)
 *  posts to the existing /pets/{id}/diary endpoint (the backend then creates
 *  the diary.created event with a real diary_id). 健康 has no safe direct
 *  event type — its tile opens the Health screen instead. Success shows
 *  feedback text; errors map to human language, never raw codes. */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { Card, Chip, EmptyText, ErrorText, GhostButton, PrimaryButton, ScreenTitle } from "./ui";

type StackNav = NativeStackNavigationProp<StackParamList>;

type LogType = (typeof LOG_TYPES)[number];

const LOG_TYPES: Array<{ key: string; zh: string; event_type: string }> = [
  { key: "meal", zh: "喂食", event_type: "daily.meal" },
  { key: "drink", zh: "饮水", event_type: "daily.drink" },
  { key: "elimination", zh: "排泄", event_type: "daily.elimination" },
  { key: "walk", zh: "散步", event_type: "daily.walk" },
  { key: "play", zh: "玩耍", event_type: "daily.play" },
  { key: "sleep", zh: "睡觉", event_type: "daily.sleep" },
  { key: "weight", zh: "体重", event_type: "daily.weight" },
  { key: "medication", zh: "用药", event_type: "medication.administered" },
  { key: "behavior", zh: "行为", event_type: "behavior.observed" },
  { key: "diary", zh: "备注", event_type: "diary.created" },
];

const ELIMINATION_KINDS: Array<{ key: string; zh: string }> = [
  { key: "urine", zh: "尿" },
  { key: "stool", zh: "便" },
  { key: "both", zh: "都有" },
];

function clampMinutes(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24 * 60);
}

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

  function renderForm(t: LogType) {
    return (
      <View>
        {(t.event_type === "daily.meal" || t.event_type === "daily.drink") && (
          <>
            <Text style={styles.fieldLabel}>数量</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="如 50"
              placeholderTextColor={COLORS.inkDisabled}
            />
            <Text style={styles.fieldLabel}>单位</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder={t.event_type === "daily.drink" ? "ml" : "g"}
              placeholderTextColor={COLORS.inkDisabled}
            />
          </>
        )}
        {t.event_type === "daily.elimination" && (
          <>
            <Text style={styles.fieldLabel}>类型</Text>
            <View style={styles.chipRow}>
              {ELIMINATION_KINDS.map((k) => (
                <Chip key={k.key} label={k.zh} active={kind === k.key} onPress={() => setKind(k.key)} />
              ))}
            </View>
          </>
        )}
        {(t.event_type === "daily.walk" || t.event_type === "daily.play" || t.event_type === "daily.sleep") && (
          <>
            <Text style={styles.fieldLabel}>时长（分钟）</Text>
            <TextInput
              style={styles.input}
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="如 30"
              placeholderTextColor={COLORS.inkDisabled}
            />
          </>
        )}
        {t.event_type === "daily.weight" && (
          <>
            <Text style={styles.fieldLabel}>体重（kg）</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="如 4.5"
              placeholderTextColor={COLORS.inkDisabled}
            />
          </>
        )}
        {t.event_type === "medication.administered" && (
          <Text style={styles.mutedForm}>将记录一次用药时间（未绑定用药计划）。</Text>
        )}
        {t.event_type === "behavior.observed" && (
          <>
            <Text style={styles.fieldLabel}>行为描述</Text>
            <TextInput
              style={styles.input}
              value={behavior}
              onChangeText={setBehavior}
              placeholder="如 连续吠叫约1分钟"
              placeholderTextColor={COLORS.inkDisabled}
            />
          </>
        )}
        {t.event_type === "diary.created" && (
          <>
            <Text style={styles.fieldLabel}>备注</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={diaryText}
              onChangeText={setDiaryText}
              multiline
              placeholder="想记录点什么？"
              placeholderTextColor={COLORS.inkDisabled}
            />
          </>
        )}
        <PrimaryButton label={saving ? "保存中…" : "保存"} onPress={() => void save()} disabled={saving} />
      </View>
    );
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
          renderForm(selectedType)
        ) : (
          <View style={styles.grid}>
            {LOG_TYPES.map((t) => (
              <Pressable key={t.key} style={styles.tile} onPress={() => pick(t.key)}>
                <Text style={styles.tileText}>{t.zh}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.tile} onPress={() => navigation.navigate("Health")}>
              <Text style={styles.tileText}>健康</Text>
            </Pressable>
          </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s3 },
  tile: {
    width: 104,
    paddingVertical: SPACE.s5,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    alignItems: "center",
  },
  tileText: { fontSize: TYPE.base, color: COLORS.inkPrimary },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.base,
    color: COLORS.inkPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  successText: { fontSize: TYPE.base, color: COLORS.ok, fontWeight: TYPE.weightMedium },
  mutedForm: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s3 },
});
