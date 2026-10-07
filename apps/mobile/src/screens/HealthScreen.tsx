/**
 * HealthScreen — 读先于写 (Stage R.2 §44-45): 宠物的健康 → 近期状态 →
 * 最近变化 → 健康记录 → 记录健康事件 (form last, not the visual core).
 * Risk levels are backend rule-engine values only; strong danger visuals only
 * for real URGENT/EMERGENCY triage. No local diagnosis claims.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePets } from "../context";
import { api, humanizeError, type HealthEventRow } from "../api";
import { fmtDate, riskLabel } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { InlineError, Skeleton } from "../components/feedback/Feedback";
import type { StackParamList } from "../navigation";

type StackNav = NativeStackNavigationProp<StackParamList>;

interface HealthEventCreateResp {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  triage: { level: string; engine: string; matched_rules: string[] };
}

function triageColors(level: string | null): { color: string; bg: string } {
  if (level === "NORMAL") return { color: COLORS.success, bg: COLORS.successBg };
  if (level === "NOTICE") return { color: COLORS.attention, bg: COLORS.attentionBg };
  if (level === "MONITOR") return { color: COLORS.info, bg: COLORS.infoBg };
  if (level === "VET_SOON") return { color: COLORS.warning, bg: COLORS.warningBg };
  if (level === "URGENT") return { color: COLORS.danger, bg: COLORS.dangerBg };
  if (level === "EMERGENCY") return { color: COLORS.danger, bg: COLORS.dangerBg };
  return { color: COLORS.textTertiary, bg: COLORS.brandSoft };
}

function statusLabel(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "CLOSED") return "已结束";
  return "状态已记录";
}

function isHighRisk(level: string | null): boolean {
  return level === "URGENT" || level === "EMERGENCY";
}

export function HealthScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [rows, setRows] = useState<HealthEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdLevel, setCreatedLevel] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<HealthEventRow[]>(`/pets/${petId}/health-events`)
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

  async function submit() {
    if (!petId || saving) return;
    const c = complaint.trim();
    if (!c) {
      setFormError("请简单描述主要情况。");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const r = await api.post<HealthEventCreateResp>(`/pets/${petId}/health-events`, { chief_complaint: c });
      setCreatedLevel(r.triage.level);
      setComplaint("");
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const latest = rows[0] ?? null;
  const recordsUnavailable = error && rows.length === 0;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.health.identity">
          <Text style={styles.title}>{pet ? `${pet.name}的健康` : "健康"}</Text>
          <Text style={styles.sub}>仅信息整理，不构成诊断。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <View style={styles.overviewWrap} testID="pli.health.overview">
              <View style={styles.overviewIcon}>
                <Ionicons name="heart-outline" size={20} color={COLORS.brandPrimaryDeep} />
              </View>
              <View style={styles.overviewText}>
                <Text style={styles.overviewEyebrow}>近期状态</Text>
                <Text style={styles.overviewValue}>
                  {recordsUnavailable ? "暂时无法确认" : latest ? riskLabel(latest.latest_triage_level) : "还没有健康记录"}
                </Text>
                <Text style={styles.overviewMeta} testID="pli.health.status">
                  {recordsUnavailable
                    ? "记录暂时无法读取"
                    : rows.length > 0
                      ? `最近 7 天 · ${rows.length} 条记录`
                      : "先记录事实，再判断变化；这里不会把未知状态显示成“正常”。"}
                </Text>
              </View>
            </View>

            <OpenSection title="最近变化" testID="pli.health.changes">
              {recordsUnavailable ? (
                <Text style={styles.emptyText}>健康记录暂时没有加载成功；不会把未知状态显示成“没有变化”。</Text>
              ) : latest ? (
                <View style={[styles.changeCard, isHighRisk(latest.latest_triage_level) && styles.changeCardDanger]}>
                  <View style={styles.changeHead}>
                    <Text style={[styles.changeType, isHighRisk(latest.latest_triage_level) && styles.changeTypeDanger]}>
                      {riskLabel(latest.latest_triage_level)}
                    </Text>
                    <Text style={styles.changeMeta}>
                      {statusLabel(latest.status)} · {fmtDate(latest.opened_at)}
                    </Text>
                  </View>
                  <Text style={styles.changeBody}>{latest.chief_complaint}</Text>
                </View>
              ) : (
                <Text style={styles.emptyText}>还没有健康变化记录，记录后会显示在这里。</Text>
              )}
            </OpenSection>

            <OpenSection title="健康记录" testID="pli.health.records">
              {recordsUnavailable ? (
                <Text style={styles.emptyText}>健康记录暂时没有加载成功，请稍后重试。</Text>
              ) : rows.length === 0 ? (
                <View style={styles.recordsEmpty}>
                  <View style={styles.recordsEmptyIcon}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.brandSecondary} />
                  </View>
                  <View style={styles.recordsEmptyText}>
                    <Text style={styles.recordsEmptyTitle}>从第一条事实开始</Text>
                    <Text style={styles.recordsEmptyBody}>记录症状、时间和已经发生的情况；分级只来自规则，不替代诊断。</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="记录第一条健康事件"
                    onPress={() => setFormOpen(true)}
                    style={styles.recordsEmptyAction}
                  >
                    <Text style={styles.recordsEmptyActionText}>开始记录</Text>
                  </Pressable>
                </View>
              ) : (
                rows.map((r, i) => {
                  const colors = triageColors(r.latest_triage_level);
                  return (
                    <Pressable
                      key={r.health_event_id}
                      testID={`pli.health.record.${r.health_event_id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`查看健康记录：${r.chief_complaint}`}
                      onPress={() => navigation.navigate("HealthDetail", { id: r.health_event_id })}
                      style={[styles.recordRow, i > 0 && styles.recordDivider]}
                    >
                      <View style={[styles.riskPill, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.riskPillText, { color: colors.color }]}>{riskLabel(r.latest_triage_level)}</Text>
                      </View>
                      <View style={styles.recordText}>
                        <Text style={styles.recordTitle}>{r.chief_complaint}</Text>
                        <Text style={styles.recordMeta}>
                          {statusLabel(r.status)} · {fmtDate(r.opened_at)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </OpenSection>

            <OpenSection title="预防与用药">
              <View testID="pli.health.prevent" style={styles.recordRow}>
                <Text style={styles.recordMeta}>疫苗与驱虫：当前页面未汇总</Text>
              </View>
              <Pressable
                testID="pli.health.medication"
                accessibilityRole="button"
                accessibilityLabel="打开用药管理"
                onPress={() => navigation.navigate("Medication")}
                style={styles.recordRow}
              >
                <Text style={styles.recordMeta}>用药计划与给药记录</Text>
                <Text style={styles.recordMeta}>›</Text>
              </Pressable>
              <View testID="pli.health.vet" style={styles.recordRow}>
                <Text style={styles.recordMeta}>就医记录：当前页面未汇总</Text>
              </View>
            </OpenSection>
            {createdLevel ? (
              <View style={styles.feedback} accessibilityLiveRegion="polite">
                <Text style={styles.feedbackText}>
                  已创建健康记录 · 分级：{riskLabel(createdLevel)}（来自规则引擎，不构成诊断）
                </Text>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <Pressable
                testID="pli.health.action"
                accessibilityRole="button"
                accessibilityLabel={formOpen ? "收起健康记录表单" : "记录健康事件"}
                accessibilityState={{ expanded: formOpen }}
                onPress={() => setFormOpen((v) => !v)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <Text style={styles.formToggleText}>{formOpen ? "收起记录表单" : "记录健康事件"}</Text>
              </Pressable>
              {formOpen ? (
                <View style={styles.formWrap}>
                  <Text style={styles.fieldLabel}>主要情况（主诉）</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={complaint}
                    onChangeText={setComplaint}
                    multiline
                    placeholder="例如：左耳抓挠三天，有棕色分泌物"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                  <Text style={styles.note}>仅信息整理与分级提示，不构成诊断；紧急情况请直接联系兽医。</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="提交"
                    disabled={saving}
                    onPress={() => void submit()}
                    style={({ pressed }) => [styles.submitBtn, saving && styles.pressed, pressed && !saving && styles.pressed]}
                  >
                    <Text style={styles.submitText}>{saving ? "提交中…" : "提交"}</Text>
                  </Pressable>
                  {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  overviewWrap: {
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s5,
    padding: SPACE.s4,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brandSoftGreen,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.s3,
  },
  overviewIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceOverlay },
  overviewText: { flex: 1 },
  overviewEyebrow: { fontSize: TYPE.caption, color: COLORS.textTertiary, fontWeight: "600" },
  overviewValue: { fontSize: TYPE.metric, color: COLORS.textPrimary, fontWeight: "700", marginTop: 2 },
  overviewMeta: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: SPACE.s1 },
  recordsEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s3,
    paddingVertical: SPACE.s2,
  },
  recordsEmptyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.brandSoftAmber },
  recordsEmptyText: { flex: 1 },
  recordsEmptyTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary },
  recordsEmptyBody: { fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20, marginTop: 2 },
  recordsEmptyAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen },
  recordsEmptyActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  changeCard: {
    // V4 §5 SoftPanel (§7 Border Budget): warm soft surface, borders removed —
    // the white bordered box reads as admin/CRUD, not a living pet surface.
    backgroundColor: COLORS.brandSoftGreen,
    borderRadius: RADIUS.xl,
    padding: SPACE.s4,
  },
  changeCardDanger: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger },
  changeHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  changeType: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.info },
  changeTypeDanger: { color: COLORS.danger },
  changeMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  changeBody: { fontSize: TYPE.body, color: COLORS.textPrimary, marginTop: SPACE.s2, lineHeight: 22 },
  recordRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingVertical: 10 },
  recordDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  riskPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  riskPillText: { fontSize: TYPE.caption, fontWeight: "700" },
  recordText: { flex: 1 },
  recordTitle: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  recordMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 1 },
  feedback: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, backgroundColor: COLORS.successBg, borderRadius: RADIUS.lg, padding: SPACE.s3 },
  feedbackText: { fontSize: TYPE.sm, color: COLORS.success },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { minHeight: 48, paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center", justifyContent: "center" },
  formToggleText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  formWrap: { marginTop: SPACE.s3 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginBottom: SPACE.s1 },
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
  note: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  submitBtn: { marginTop: SPACE.s3, minHeight: 48, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  pressed: { opacity: 0.85 },
});
