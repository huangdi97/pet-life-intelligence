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
};

export function WelfareScreen() {
  const { pets, petId } = usePets();
  const [profile, setProfile] = useState<WelfareProfile | null>(null);
  const [evidence, setEvidence] = useState<WelfareEvidence | null>(null);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [kind, setKind] = useState("STRESS_RECOVERY");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<WelfareProfile>(`/pets/${petId}/welfare-profile`),
      api.get<WelfareEvidence>(`/pets/${petId}/welfare-evidence`),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=40${WELFARE_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`),
    ]).then(([p, ev, evs]) => {
      if (!alive) return;
      if (p.status === "fulfilled") setProfile(p.value);
      if (ev.status === "fulfilled") setEvidence(ev.value);
      if (evs.status === "fulfilled") setEvents(evs.value.events);
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
      setMsg("已记录福利观察。");
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
        <View style={styles.head}>
          <Text style={styles.title}>{pet ? `${pet.name}的福利` : "福利"}</Text>
          <Text style={styles.sub}>用观察与证据说话，不做开心指数。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="近期观察">
              {Object.keys(counts).length === 0 ? (
                <EmptyState
                  title="还没有福利观察"
                  body="记录舒适、压力恢复、环境等观察后，趋势会出现在这里。"
                />
              ) : (
                Object.entries(counts).map(([k, v], i) => (
                  <View key={k} style={[styles.countRow, i > 0 && styles.countDivider]}>
                    <Text style={styles.countLabel}>{DOMAIN_LABELS[k] ?? k}</Text>
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{v} 条</Text>
                    </View>
                  </View>
                ))
              )}
              {evidence?.sources && evidence.sources.length > 0 ? (
                <Text style={styles.sourceText}>来源：{evidence.sources.join("、")}</Text>
              ) : null}
              {evidence?.notice ? <Text style={styles.sourceText}>{evidence.notice}</Text> : null}
            </OpenSection>

            <OpenSection title="生活质量记录">
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

            {domains && Object.keys(domains).length > 0 ? (
              <OpenSection title="各维度概况">
                {Object.entries(domains).map(([k, v]) => (
                  <View key={k} style={styles.countRow}>
                    <Text style={styles.countLabel}>{DOMAIN_LABELS[k] ?? k}</Text>
                    <Text style={styles.domainValue}>{String(v)}</Text>
                  </View>
                ))}
              </OpenSection>
            ) : null}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>记录福利观察</Text>
              <View style={styles.chipRow}>
                {WELFARE_KINDS.map((k) => (
                  <Pressable key={k.value} onPress={() => setKind(k.value)} style={[styles.chip, kind === k.value && styles.chipActive]}>
                    <Text style={[styles.chipText, kind === k.value && styles.chipActiveText]}>{k.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="记录观察"
                disabled={busy}
                onPress={() => void recordObservation()}
                style={({ pressed }) => [styles.submitBtn, busy && styles.pressed, pressed && styles.pressed]}
              >
                <Text style={styles.submitText}>{busy ? "提交中…" : "记录观察"}</Text>
              </Pressable>
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
  formLabel: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary, marginBottom: SPACE.s2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  chip: { paddingHorizontal: SPACE.s3, paddingVertical: 6, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  submitBtn: { marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  msg: { fontSize: TYPE.sm, marginTop: SPACE.s2 },
  msgOk: { color: COLORS.success },
  msgError: { color: COLORS.danger },
  pressed: { opacity: 0.85 },
});
