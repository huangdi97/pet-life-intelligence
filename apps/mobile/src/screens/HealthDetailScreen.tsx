import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { api, humanizeError } from "../api";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { InlineError, Skeleton } from "../components/feedback/Feedback";
import type { StackParamList } from "../navigation";

interface IntakeStep {
  question_id: string;
  question_text: string;
  answer_text: string;
}
interface HealthEventDetail {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  intake_steps: IntakeStep[];
  observations: Array<{ id: string; kind: string; text: string; created_at: string }>;
  vet_briefs: string[];
  outcomes: Array<{ outcome: string; notes: string; recorded_at: string }>;
}
interface VetBriefContent {
  chief_complaint: string;
  key_findings: Array<{ kind: string; text: string; observed_at: string }>;
  ai_narrative_draft: string;
  ai_disclaimer: string;
  notice: string;
  red_flags: string[];
}

function riskLabel(level: string | null): string {
  if (level === "NORMAL") return "未见明显风险";
  if (level === "NOTICE") return "需要留意";
  if (level === "MONITOR") return "继续观察";
  if (level === "VET_SOON") return "建议尽快咨询兽医";
  if (level === "URGENT") return "建议尽快就医";
  if (level === "EMERGENCY") return "建议立即就医";
  return "尚未分级";
}

export function HealthDetailScreen() {
  const route = useRoute<RouteProp<StackParamList, "HealthDetail">>();
  const id = route.params.id;
  const [detail, setDetail] = useState<HealthEventDetail | null>(null);
  const [brief, setBrief] = useState<{ id: string; content: VetBriefContent } | null>(null);
  const [answer, setAnswer] = useState("");
  const [obs, setObs] = useState("");
  const [outcome, setOutcome] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get<HealthEventDetail>(`/health-events/${id}`)
      .then((row) => { if (alive) { setDetail(row); setError(null); } })
      .catch((e: unknown) => { if (alive) setError(humanizeError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, version]);

  const openQuestion = detail?.intake_steps.find((step) => !step.answer_text) ?? null;

  async function generateQuestions() {
    setBusy(true); setError(null);
    try { await api.post(`/health-events/${id}/questions`, {}); setVersion((v) => v + 1); }
    catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function submitAnswer() {
    if (!openQuestion || !answer.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/health-events/${id}/answers`, { answers: [{ question_id: openQuestion.question_id, answer: answer.trim() }] });
      setAnswer(""); setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function addObservation() {
    if (!obs.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/health-events/${id}/observations`, { texts: [obs.trim()], use_ai: true });
      setObs(""); setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function makeBrief() {
    setBusy(true); setError(null);
    try {
      const result = await api.post<{ vet_brief_id: string; content: VetBriefContent }>(`/health-events/${id}/vet-brief`, {});
      setBrief({ id: result.vet_brief_id, content: result.content });
      setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function recordOutcome() {
    if (!outcome.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/health-events/${id}/outcomes`, { outcome: outcome.trim(), notes: "" });
      setOutcome(""); setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>健康事件</Text>
          <Text style={styles.sub}>从真实观察到风险分级、就诊摘要与结局；风险等级由独立规则引擎决定。</Text>
        </View>
        {error ? <InlineError message={error} /> : null}
        {loading ? <View style={styles.loading}><Skeleton rows={4} /></View> : detail ? (
          <>
            <View style={[styles.risk, detail.latest_triage_level === "EMERGENCY" || detail.latest_triage_level === "URGENT" ? styles.riskDanger : styles.riskCalm]}>
              <Text style={styles.riskTitle}>{riskLabel(detail.latest_triage_level)}</Text>
              <Text style={styles.complaint}>{detail.chief_complaint}</Text>
              <Text style={styles.note}>不是兽医诊断；紧急等级不会被 AI 降低。</Text>
            </View>

            <OpenSection title="补充信息">
              {detail.intake_steps.filter((step) => step.answer_text).map((step) => (
                <View key={step.question_id} style={styles.item}>
                  <Text style={styles.itemTitle}>{step.question_text}</Text>
                  <Text style={styles.itemBody}>{step.answer_text}</Text>
                </View>
              ))}
              {openQuestion ? (
                <View style={styles.form}>
                  <Text style={styles.itemTitle}>{openQuestion.question_text}</Text>
                  <TextInput style={styles.input} value={answer} onChangeText={setAnswer} placeholder="按实际情况回答" placeholderTextColor={COLORS.textTertiary} />
                  <Action label={busy ? "处理中…" : "提交回答"} disabled={busy || !answer.trim()} onPress={submitAnswer} />
                </View>
              ) : (
                <Action label={busy ? "处理中…" : "生成需要补充的问题"} disabled={busy} onPress={generateQuestions} />
              )}
            </OpenSection>

            <OpenSection title="观察证据">
              {detail.observations.length ? detail.observations.map((row) => (
                <View key={row.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{row.kind}</Text>
                  <Text style={styles.itemBody}>{row.text}</Text>
                </View>
              )) : <Text style={styles.empty}>还没有补充观察。</Text>}
              <TextInput style={styles.input} value={obs} onChangeText={setObs} placeholder="补充一条真实观察" placeholderTextColor={COLORS.textTertiary} />
              <Action label="添加观察" disabled={busy || !obs.trim()} onPress={addObservation} />
            </OpenSection>

            <OpenSection title="Vet Brief · 就诊摘要" caption={detail.vet_briefs.length ? `${detail.vet_briefs.length} 份已生成` : undefined}>
              <Text style={styles.note}>摘要用于整理已记录事实，不替代兽医诊断。</Text>
              <Action label={busy ? "生成中…" : "生成就诊摘要"} disabled={busy} onPress={makeBrief} />
              {brief ? (
                <View style={styles.brief}>
                  <Text style={styles.itemTitle}>{brief.content.chief_complaint}</Text>
                  {brief.content.red_flags?.map((flag) => <Text key={flag} style={styles.redFlag}>• {flag}</Text>)}
                  {brief.content.key_findings?.slice(0, 5).map((finding, index) => (
                    <Text key={`${finding.kind}-${index}`} style={styles.itemBody}>• {finding.text}</Text>
                  ))}
                  <Text style={styles.note}>{brief.content.ai_disclaimer || brief.content.notice}</Text>
                </View>
              ) : null}
            </OpenSection>

            <OpenSection title="结局">
              {detail.outcomes.length ? detail.outcomes.map((row, index) => (
                <View key={`${row.recorded_at}-${index}`} style={styles.item}>
                  <Text style={styles.itemTitle}>{row.outcome}</Text>
                  {row.notes ? <Text style={styles.itemBody}>{row.notes}</Text> : null}
                </View>
              )) : <Text style={styles.empty}>还没有结局记录。</Text>}
              <TextInput style={styles.input} value={outcome} onChangeText={setOutcome} placeholder="例如：改善、已就诊、继续观察" placeholderTextColor={COLORS.textTertiary} />
              <Action label="记录结局" disabled={busy || !outcome.trim()} onPress={recordOutcome} />
            </OpenSection>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void | Promise<void> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => void onPress()} style={[styles.action, disabled && styles.disabled]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 3, lineHeight: 20 },
  loading: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  risk: { marginHorizontal: SPACE.s4, marginTop: SPACE.s4, borderRadius: RADIUS.xl, padding: SPACE.s4 },
  riskCalm: { backgroundColor: COLORS.brandSoftGreen },
  riskDanger: { backgroundColor: COLORS.dangerBg },
  riskTitle: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  complaint: { marginTop: SPACE.s2, fontSize: TYPE.bodyStrong, color: COLORS.textPrimary },
  note: { marginTop: SPACE.s2, fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  itemTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  itemBody: { marginTop: 3, fontSize: TYPE.body, color: COLORS.textSecondary, lineHeight: 20 },
  empty: { fontSize: TYPE.body, color: COLORS.textTertiary, paddingVertical: 8 },
  form: { marginTop: SPACE.s2 },
  input: { marginTop: SPACE.s2, borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, paddingVertical: 10, fontSize: TYPE.body, color: COLORS.textPrimary },
  action: { minHeight: 48, justifyContent: "center", marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: RADIUS.pill, paddingVertical: 11, alignItems: "center" },
  actionText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  brief: { marginTop: SPACE.s3, borderRadius: RADIUS.xl, backgroundColor: COLORS.surfaceRaised, padding: SPACE.s3 },
  redFlag: { marginTop: 4, fontSize: TYPE.sm, color: COLORS.danger, fontWeight: "600" },
});
