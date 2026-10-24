/**
 * WelfareScreen — 生活质量趋势优先 (Stage R.2 §48): 近期观察 → 舒适/环境/
 * 活动/恢复 → 生活质量记录 → (记录观察 last). 不做开心指数/幸福分数/情绪
 * 指数；全部来自真实观察与证据计数。
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePets } from "../context";
import { api, humanizeError, type LifeEvent, type WelfareEvidence, type WelfareProfile } from "../api";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { eventTypeLabel } from "./ui_labels";

const WELFARE_KINDS: Array<{ value: string; label: string }> = [
  { value: "STRESS_RECOVERY", label: "压力恢复" },
  { value: "CHOICE", label: "选择/控制感" },
  { value: "ENVIRONMENT_LOAD", label: "环境负荷" },
  { value: "QOL_QUESTIONNAIRE", label: "生活质量问卷" },
];

const WELFARE_EVENT_TYPES = ["daily.sleep", "daily.play", "daily.walk", "daily.weight", "daily.elimination"];

const DOMAIN_LABELS: Record<string, string> = {
  comfort: "舒适",
  stress_recovery: "压力恢复",
  activity: "活动",
  environment: "环境",
  enrichment: "丰富化",
  STRESS_RECOVERY: "压力恢复",
  CHOICE: "选择/控制感",
  ENVIRONMENT_LOAD: "环境负荷",
  QOL_QUESTIONNAIRE: "生活质量问卷",
};

interface EnrichmentLibrary {
  activities: Array<{ name: string; domain: string; min_minutes: number }>;
  version?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  OWNER_REPORTED: "你记录",
  DEVICE: "设备",
  PROFESSIONAL: "专业人士",
  LAB: "化验室",
  AI_STRUCTURED: "AI 整理",
  AI_INFERENCE: "AI 推断",
  GENERATED_3D: "3D 生成",
  RECORDED: "系统记录",
  LIVE: "实时",
};

function ownerValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "已有记录" : "暂无记录";
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "暂无记录";
    return /^[A-Z0-9_:-]+$/.test(text) ? "已有记录" : text;
  }
  return value == null ? "暂无记录" : "已有记录";
}

export function WelfareScreen() {
  const { pets, petId } = usePets();
  const [profile, setProfile] = useState<WelfareProfile | null>(null);
  const [evidence, setEvidence] = useState<WelfareEvidence | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [kind, setKind] = useState("STRESS_RECOVERY");
  const [busy, setBusy] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [enrichment, setEnrichment] = useState<EnrichmentLibrary | null>(null);
  const [enrichmentState, setEnrichmentState] = useState<"loading" | "ready" | "error">("loading");

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setEnrichmentState("loading");
    Promise.allSettled([
      api.get<WelfareProfile>(`/pets/${petId}/welfare-profile`),
      api.get<WelfareEvidence>(`/pets/${petId}/welfare-evidence`),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=40${WELFARE_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`),
      api.get<EnrichmentLibrary>("/welfare/enrichment-activities"),
    ]).then(([p, ev, evs, library]) => {
      if (!alive) return;
      if (p.status === "fulfilled") setProfile(p.value);
      if (ev.status === "fulfilled") setEvidence(ev.value);
      if (evs.status === "fulfilled") setEvents(evs.value.events);
      if (library.status === "fulfilled") {
        setEnrichment(library.value);
        setEnrichmentState("ready");
      } else {
        setEnrichment(null);
        setEnrichmentState("error");
      }
      setLoading(false);
      setError(p.status === "rejected" && ev.status === "rejected" && evs.status === "rejected");
    });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  async function recordObservation() {
    if (!petId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/welfare-observations`, {
        kind,
        data: { recorded_from: "mobile", note: "" },
        source_type: "OWNER_REPORTED",
      });
      setMsg("已记录生活观察。");
      setRecordOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setMsg(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  const domains = profile?.profile?.domains ?? null;
  const counts = evidence?.observation_counts ?? {};

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.welfare.identity">
          <Text style={styles.title}>{pet ? `${pet.name}的福祉` : "生活与福祉"}</Text>
          <Text style={styles.sub}>用观察与证据说话，不做开心指数。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="近期观察" testID="pli.welfare.observable">
              {Object.keys(counts).length === 0 ? (
                <EmptyState
                  title="还没有福祉观察"
                  body="记录舒适、压力恢复、环境等观察后，趋势会出现在这里。"
                />
              ) : (
                Object.entries(counts).map(([k, v], i) => (
                  <View key={k} style={[styles.countRow, i > 0 && styles.countDivider]}>
                    <Text style={styles.countLabel}>{DOMAIN_LABELS[k] ?? "其他观察"}</Text>
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{v} 条</Text>
                    </View>
                  </View>
                ))
              )}
              {evidence?.sources && evidence.sources.length > 0 ? (
                <Text style={styles.sourceText}>来源:{evidence.sources.map((s) => SOURCE_LABELS[s] ?? "其他来源").join("、")}</Text>
              ) : null}
              {evidence?.notice ? <Text style={styles.sourceText}>{evidence.notice}</Text> : null}
            </OpenSection>

            <OpenSection title="生活质量记录" testID="pli.welfare.comfort">
              {events.length === 0 ? (
                <Text style={styles.emptyText}>还没有相关日常记录。</Text>
              ) : (
                events.slice(0, 6).map((e, i) => (
                  <View key={e.event_id} style={[styles.eventRow, i > 0 && styles.eventDivider]}>
                    <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                    <Text style={styles.eventTime}>{fmtTime(e.occurred_at)}</Text>
                  </View>
                ))
              )}
            </OpenSection>

            <OpenSection title="丰富化活动库" testID="pli.welfare.activity-library">
              <Text style={styles.sourceText}>通用安全活动建议，不代表这只宠物已经喜欢、适合或完成过。</Text>
              {enrichmentState === "loading" ? (
                <Text style={styles.emptyText}>正在读取丰富化活动……</Text>
              ) : enrichmentState === "error" ? (
                <Text style={styles.emptyText}>活动库暂时没有加载成功；不会用客户端默认活动替代。</Text>
              ) : enrichment?.activities?.length ? (
                enrichment.activities.map((activity, index) => (
                  <View key={activity.name} style={[styles.eventRow, index > 0 && styles.eventDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventType}>{activity.name}</Text>
                      <Text style={styles.sourceText}>{activity.domain} · 至少 {activity.min_minutes} 分钟</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>当前没有可用的丰富化活动说明。</Text>
              )}
            </OpenSection>

            <OpenSection title="各维度概况" testID="pli.welfare.enrichment">
              {domains && Object.keys(domains).length > 0 ? (
                Object.entries(domains).map(([k, v]) => (
                  <View key={k} style={styles.countRow}>
                    <Text style={styles.countLabel}>{DOMAIN_LABELS[k] ?? k}</Text>
                    <Text style={styles.domainValue}>{ownerValue(v)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>观察积累后，这里会按维度归纳舒适、压力恢复、环境与活动的情况。</Text>
              )}
            </OpenSection>

            <View style={styles.formSection} testID="pli.welfare.liked">
              <Pressable
                testID="pli.welfare.action"
                accessibilityRole="button"
                accessibilityLabel={recordOpen ? "收起生活观察记录" : "记录生活观察"}
                accessibilityState={{ expanded: recordOpen }}
                onPress={() => setRecordOpen((value) => !value)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <View style={styles.formToggleCopy}>
                  <Text style={styles.formLabel}>记录生活观察</Text>
                  <Text style={styles.formHint}>已有观察与趋势优先；需要补充事实时再记录。</Text>
                </View>
                <Text style={styles.formToggleAction}>{recordOpen ? "收起" : "记录"}</Text>
              </Pressable>
              {recordOpen ? (
                <View style={styles.formWrap}>
                  <View style={styles.chipRow}>
                    {WELFARE_KINDS.map((k) => (
                      <Pressable key={k.value} accessibilityRole="button" accessibilityLabel={k.label} accessibilityState={{ selected: kind === k.value }} onPress={() => setKind(k.value)} style={[styles.chip, kind === k.value && styles.chipActive]}>
                        <Text style={[styles.chipText, kind === k.value && styles.chipActiveText]}>{k.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    testID="pli.welfare.action.submit"
                    accessibilityRole="button"
                    accessibilityLabel="保存观察"
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={() => void recordObservation()}
                    style={({ pressed }) => [styles.submitBtn, busy && styles.pressed, pressed && styles.pressed]}
                  >
                    <Text style={styles.submitText}>{busy ? "提交中…" : "保存观察"}</Text>
                  </Pressable>
                </View>
              ) : null}
              {msg ? (
                <Text style={[styles.msg, msg.includes("失败") || msg.includes("异常") ? styles.msgError : styles.msgOk]}>{msg}</Text>
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
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  countDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  countLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  countPill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  domainValue: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  sourceText: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  eventRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  eventDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  eventType: { fontSize: TYPE.body, color: COLORS.textPrimary },
  eventTime: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { minHeight: 66, borderRadius: RADIUS.xl, backgroundColor: COLORS.brandSoftGreen, paddingHorizontal: SPACE.s4, paddingVertical: SPACE.s3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  formToggleCopy: { flex: 1 },
  formHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginTop: 3 },
  formToggleAction: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  formWrap: { marginTop: SPACE.s3 },
  formLabel: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary, marginBottom: SPACE.s2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  chip: { minHeight: 44, paddingHorizontal: SPACE.s3, paddingVertical: 6, justifyContent: "center", borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  submitBtn: { marginTop: SPACE.s3, minHeight: 48, justifyContent: "center", backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  msg: { fontSize: TYPE.sm, marginTop: SPACE.s2 },
  msgOk: { color: COLORS.success },
  msgError: { color: COLORS.danger },
  pressed: { opacity: 0.85 },
});
