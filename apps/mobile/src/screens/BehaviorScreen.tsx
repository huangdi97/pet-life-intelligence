/**
 * BehaviorScreen — 观察优先 (Stage R.2 §46): Recent Observations →
 * Current context → (form last). ABC 记录法保留在录入流程里，不作为默认
 * 首页主体。只保存可观察事实，不构成行为诊断；intensity 记为主人标注。
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePets } from "../context";
import { api, humanizeError, type BehaviorEventRow } from "../api";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { INTENSITIES, intensityLabel } from "./behavior_styles";

const EMPTY_FORM = {
  antecedent: "",
  behavior: "",
  consequence: "",
  duration_seconds: "",
  intensity: "",
  environment: "",
  owner_notes: "",
};

export function BehaviorScreen() {
  const { pets, petId } = usePets();
  const [rows, setRows] = useState<BehaviorEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [validation, setValidation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<BehaviorEventRow[]>(`/pets/${petId}/behavior-events`)
      .then((r) => {
        if (alive) {
          setRows(r);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!petId || saving) return;
    setValidation(null);
    if (!form.behavior.trim()) {
      setValidation("“观察到的行为”必填，请写你看到的，不要写结论。");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date().toISOString(),
        antecedent: form.antecedent,
        behavior: form.behavior.trim(),
        consequence: form.consequence,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        intensity: form.intensity,
        environment: form.environment,
        owner_notes: form.owner_notes,
      });
      setForm(EMPTY_FORM);
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const latest = rows[0] ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>{pet ? `${pet.name}的行为` : "行为"}</Text>
          <Text style={styles.sub}>只记录可观察的事实，不构成行为诊断。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="最近观察">
              {rows.length === 0 ? (
                <EmptyState
                  title="还没有行为观察"
                  body="记录豆豆做了什么、之前之后发生了什么，规律会慢慢浮现。"
                />
              ) : (
                rows.map((b, i) => (
                  <View key={b.behavior_event_id} style={[styles.obsRow, i > 0 && styles.obsDivider]}>
                    <Text style={styles.obsText}>{b.behavior}</Text>
                    <View style={styles.obsMetaRow}>
                      <Text style={styles.obsMeta}>{fmtTime(b.occurred_at)}</Text>
                      {b.intensity ? (
                        <View style={styles.intensityPill}>
                          <Text style={styles.intensityText}>{intensityLabel(b.intensity)} · 主人标注</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </OpenSection>

            {latest ? (
              <OpenSection title="当前情境">
                <View style={styles.abcCard}>
                  <AbcLine label="前因" value={latest.antecedent} />
                  <AbcLine label="行为" value={latest.behavior} />
                  <AbcLine label="后果" value={latest.consequence} />
                  <AbcLine label="环境" value={latest.environment} />
                </View>
              </OpenSection>
            ) : null}

            <OpenSection title="规律">
              <Text style={styles.hintText}>积累更多观察后，这里会呈现与它自己相比的变化。</Text>
            </OpenSection>

            <View style={styles.formSection}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFormOpen((v) => !v)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <Text style={styles.formToggleText}>{formOpen ? "收起记录表单" : "记录行为"}</Text>
              </Pressable>
              {formOpen ? (
                <View style={styles.formWrap}>
                  <Text style={styles.fieldLabel}>前因 / 情境（发生了什么之前？）</Text>
                  <TextInput style={styles.input} value={form.antecedent} onChangeText={(v) => set("antecedent", v)} placeholder="例如：门铃响 / 陌生狗经过" placeholderTextColor={COLORS.textTertiary} />
                  <Text style={styles.fieldLabel}>观察到的行为 *（写你看到的）</Text>
                  <TextInput style={styles.input} value={form.behavior} onChangeText={(v) => set("behavior", v)} placeholder="例如：连续吠叫约 3 分钟后躲到沙发下" placeholderTextColor={COLORS.textTertiary} />
                  <Text style={styles.fieldLabel}>后果（之后发生了什么？）</Text>
                  <TextInput style={styles.input} value={form.consequence} onChangeText={(v) => set("consequence", v)} placeholder="例如：主人安抚后自行出来" placeholderTextColor={COLORS.textTertiary} />
                  <View style={styles.fieldRow}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>持续秒数</Text>
                      <TextInput style={styles.input} value={form.duration_seconds} onChangeText={(v) => set("duration_seconds", v)} keyboardType="number-pad" placeholder="可选" placeholderTextColor={COLORS.textTertiary} />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.fieldLabel}>环境</Text>
                      <TextInput style={styles.input} value={form.environment} onChangeText={(v) => set("environment", v)} placeholder="例如：客厅" placeholderTextColor={COLORS.textTertiary} />
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>强度（主人主观标注）</Text>
                  <View style={styles.chipRow}>
                    {INTENSITIES.map((it) => (
                      <ChipPressable key={it.value} label={it.label} active={form.intensity === it.value} onPress={() => set("intensity", it.value)} />
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>备注</Text>
                  <TextInput style={[styles.input, styles.inputMultiline]} value={form.owner_notes} onChangeText={(v) => set("owner_notes", v)} multiline placeholder="可选" placeholderTextColor={COLORS.textTertiary} />
                  {validation ? <Text style={styles.errorText}>{validation}</Text> : null}
                  {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="保存行为事件"
                    disabled={saving}
                    onPress={() => void submit()}
                    style={({ pressed }) => [styles.submitBtn, saving && styles.pressed, pressed && !saving && styles.pressed]}
                  >
                    <Text style={styles.submitText}>{saving ? "提交中…" : "保存行为事件"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AbcLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.abcRow}>
      <Text style={styles.abcLabel}>{label}</Text>
      <Text style={styles.abcValue}>{value || "—"}</Text>
    </View>
  );
}

function ChipPressable({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipActiveText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  obsRow: { paddingVertical: 10 },
  obsDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  obsText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  obsMetaRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: 4 },
  obsMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  intensityPill: { backgroundColor: COLORS.brandSoftAmber, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  intensityText: { fontSize: TYPE.caption, color: COLORS.brandSecondary },
  abcCard: { backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.dividerSubtle, padding: SPACE.s4, gap: 8 },
  abcRow: { flexDirection: "row", gap: SPACE.s3 },
  abcLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary, width: 40 },
  abcValue: { fontSize: TYPE.sm, color: COLORS.textPrimary, flex: 1 },
  hintText: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center" },
  formToggleText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  formWrap: { marginTop: SPACE.s3 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: SPACE.s3, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  fieldRow: { flexDirection: "row", gap: SPACE.s3 },
  fieldHalf: { flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  chip: { paddingHorizontal: SPACE.s3, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  submitBtn: { marginTop: SPACE.s4, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
