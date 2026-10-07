import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";

interface DoseRow {
  dose_id: string;
  planned_at: string;
  status: string;
  given_at?: string | null;
}
interface MedicationPlan {
  plan_id: string;
  medicine_name: string;
  dose_text: string;
  frequency_text?: string | null;
  source_type: string;
  source_note?: string | null;
  doses: DoseRow[];
}

function sourceLabel(source: string): string {
  if (source === "PROFESSIONAL_CONFIRMED") return "兽医确认";
  if (source === "OWNER_REPORTED") return "主人记录";
  if (source === "LAB_CONFIRMED") return "检验确认";
  return "来源已记录";
}
function doseLabel(status: string): string {
  if (status === "GIVEN") return "已给药";
  if (status === "MISSED") return "已遗漏";
  if (status === "SKIPPED") return "已跳过";
  if (status === "PENDING") return "待给药";
  if (status === "CANCELLED") return "已取消";
  return "计划中";
}
function timeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function MedicationScreen() {
  const { pets, petId } = usePets();
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const [plans, setPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api.get<MedicationPlan[]>(`/pets/${petId}/medication-plans`)
      .then((rows) => {
        if (!alive) return;
        setPlans(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [petId, version]);

  async function createPlan() {
    if (!petId || !medicine.trim() || !dose.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/pets/${petId}/medication-plans`, {
        medicine_name: medicine.trim(),
        dose_text: dose.trim(),
        route: "oral",
        frequency_per_day: 1,
        duration_days: 7,
        source_type: "PROFESSIONAL_CONFIRMED",
        source_note: "由主人依据处方录入",
      });
      setMedicine("");
      setDose("");
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function give(planId: string, doseId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/medication-plans/${planId}/administrations`, { planned_dose_id: doseId });
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(humanizeError(e));
      setVersion((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }

  async function skip(planId: string, doseId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/medication-plans/${planId}/skip`, {
        planned_dose_id: doseId,
        note: "主人记录为本次跳过",
      });
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setError(humanizeError(e));
      setVersion((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>{pet ? `${pet.name}的用药` : "用药"}</Text>
          <Text style={styles.sub}>计划与给药记录。系统不推荐剂量、不自动建议停药；剂量以专业处方为准。</Text>
        </View>

        {error ? <InlineError message={error} /> : null}
        {loading ? (
          <View style={styles.loading}><Skeleton rows={3} /></View>
        ) : (
          <OpenSection title="用药计划" caption={plans.length ? `${plans.length} 个计划` : undefined}>
            {plans.length === 0 ? (
              <EmptyState title="还没有用药计划" body="有明确处方时再创建计划；不要凭应用建议决定药量。" />
            ) : plans.map((plan) => {
              const pending = plan.doses.filter((d) => d.status === "PENDING");
              const missed = plan.doses.filter((d) => d.status === "MISSED");
              return (
                <View key={plan.plan_id} style={styles.plan}>
                  <View style={styles.planHead}>
                    <View style={styles.planText}>
                      <Text style={styles.planTitle}>{plan.medicine_name} · {plan.dose_text}</Text>
                      <Text style={styles.meta}>{sourceLabel(plan.source_type)}{plan.source_note ? ` · ${plan.source_note}` : ""}</Text>
                    </View>
                    {missed.length ? <Text style={styles.missed}>{missed.length} 次遗漏</Text> : null}
                  </View>
                  {pending.length === 0 ? (
                    <Text style={styles.emptyLine}>没有待给剂量。</Text>
                  ) : pending.slice(0, 4).map((d) => (
                    <View key={d.dose_id} style={styles.doseRow}>
                      <View style={styles.planText}>
                        <Text style={styles.doseTitle}>{doseLabel(d.status)}</Text>
                        <Text style={styles.meta}>{timeLabel(d.planned_at)}</Text>
                      </View>
                      <View style={styles.doseActions}>
                        <Pressable accessibilityRole="button" accessibilityLabel={`记录给药：${plan.medicine_name}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void give(plan.plan_id, d.dose_id)} style={[styles.giveBtn, busy && styles.disabled]}>
                          <Text style={styles.giveText}>记录给药</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={`标记本次跳过：${plan.medicine_name}`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void skip(plan.plan_id, d.dose_id)} style={[styles.skipBtn, busy && styles.disabled]}>
                          <Text style={styles.skipText}>跳过本次</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <View style={styles.history}>
                    {plan.doses.slice(0, 6).map((d) => (
                      <View key={d.dose_id} style={styles.historyRow}>
                        <Text style={styles.historyStatus}>{doseLabel(d.status)}</Text>
                        <Text style={styles.meta}>{timeLabel(d.given_at ?? d.planned_at)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </OpenSection>
        )}

        <View style={styles.formSection}>
          <Pressable accessibilityRole="button" accessibilityLabel={formOpen ? "收起新建用药计划" : "新建用药计划"} accessibilityState={{ expanded: formOpen }} onPress={() => setFormOpen((v) => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>{formOpen ? "收起新计划" : "＋ 新建用药计划"}</Text>
          </Pressable>
          {formOpen ? (
            <View style={styles.form}>
              <Text style={styles.label}>药名</Text>
              <TextInput style={styles.input} value={medicine} onChangeText={setMedicine} placeholder="按处方填写" placeholderTextColor={COLORS.textTertiary} />
              <Text style={styles.label}>剂量文字</Text>
              <TextInput style={styles.input} value={dose} onChangeText={setDose} placeholder="例如 50mg" placeholderTextColor={COLORS.textTertiary} />
              <Text style={styles.note}>此入口只保存你依据处方录入的信息，不生成剂量建议。</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="创建用药计划" accessibilityState={{ disabled: busy || !medicine.trim() || !dose.trim() }} disabled={busy || !medicine.trim() || !dose.trim()} onPress={() => void createPlan()} style={[styles.primary, (busy || !medicine.trim() || !dose.trim()) && styles.disabled]}>
                <Text style={styles.primaryText}>{busy ? "处理中…" : "创建计划"}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { marginTop: 3, fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20 },
  loading: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  plan: { paddingVertical: SPACE.s3, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  planHead: { flexDirection: "row", gap: SPACE.s2, alignItems: "flex-start" },
  planText: { flex: 1 },
  planTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary },
  meta: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 2 },
  missed: { fontSize: TYPE.caption, color: COLORS.danger, backgroundColor: COLORS.dangerBg, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 4 },
  doseRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s3 },
  doseTitle: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  doseActions: { flexDirection: "row", gap: SPACE.s1, flexWrap: "wrap", justifyContent: "flex-end" },
  giveBtn: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.brandSoftGreen, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  giveText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  skipBtn: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  history: { marginTop: SPACE.s3 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  historyStatus: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  emptyLine: { marginTop: SPACE.s3, fontSize: TYPE.sm, color: COLORS.textTertiary },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  toggle: { minHeight: 48, justifyContent: "center", paddingVertical: 12, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen, alignItems: "center" },
  toggleText: { fontSize: TYPE.button, fontWeight: "600", color: COLORS.brandPrimaryDeep },
  form: { marginTop: SPACE.s3, backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.xl, padding: SPACE.s4 },
  label: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: SPACE.s2, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, paddingVertical: 10, fontSize: TYPE.body, color: COLORS.textPrimary },
  note: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s3, lineHeight: 18 },
  primary: { minHeight: 48, justifyContent: "center", marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
