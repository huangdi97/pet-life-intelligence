/**
 * AssistantScreen — 豆豆的助手 (Stage R.2 §50-53). Pet-aware: the assistant
 * always speaks about THIS pet. Ask is the primary mode; 摘要/找/计划/解释
 * are contextual capabilities (not equal-weight pills). Answers follow the
 * contract: 结论 → 依据 → 不确定性 → 下一步. Medical risk stays with the
 * deterministic rule engine.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type AiStatus, type AskAnswer } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { PetAvatar } from "../components/media/PetAvatar";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { BriefPanel, ExplainPanel, FindPanel, PlanPanel } from "./assistant_panels";

const SUGGESTIONS = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

type Tab = "ask" | "brief" | "find" | "plan" | "explain";

const MODES: Array<{ id: Tab; label: string }> = [
  { id: "ask", label: "问" },
  { id: "brief", label: "摘要" },
  { id: "find", label: "找" },
  { id: "plan", label: "计划" },
  { id: "explain", label: "解释" },
];

export function AssistantScreen() {
  const { pets, petId } = usePets();
  const [tab, setTab] = useState<Tab>("ask");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    let alive = true;
    api
      .get<AiStatus>("/ai/status")
      .then((r) => {
        if (alive) setAiStatus(r);
      })
      .catch(() => {
        if (alive) setAiStatus(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const aiOff = aiStatus != null && aiStatus.real_provider === false && aiStatus.status !== "REAL_PROVIDER_READY";

  async function ask(q: string) {
    if (!petId || !q.trim() || asking) return;
    setAsking(true);
    setAskErr(null);
    try {
      const r = await api.post<AskAnswer>(`/pets/${petId}/ask`, { question: q.trim() });
      setAnswer(r);
    } catch (e: unknown) {
      setAskErr(humanizeError(e));
      setAnswer(null);
    } finally {
      setAsking(false);
    }
  }

  const citations: Array<{ label: string; event_id?: string }> = (answer?.citations ?? answer?.sources ?? [])
    .map((c) => (typeof c === "string" ? { label: c } : { label: c.label ?? c.event_id ?? "记录", event_id: c.event_id }))
    .filter((c) => !!c.label);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {pet ? (
            <View style={styles.petChip}>
              <PetAvatar pet={pet} uri={resolvePetMediaUri(pet)} size={40} />
              <View style={styles.petText}>
                <Text style={styles.petName}>{pet.name}的助手</Text>
                <Text style={styles.petSub}>正在帮助你理解：{pet.name}</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.title}>助手</Text>
              <Text style={styles.sub}>选择一只宠物后开始。</Text>
            </View>
          )}
        </View>

        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const active = tab === m.id;
            const primary = m.id === "ask";
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                onPress={() => setTab(m.id)}
                style={[styles.mode, active && styles.modeActive, primary && styles.modePrimary, active && primary && styles.modePrimaryActive]}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive, primary && styles.modePrimaryText, active && primary && styles.modePrimaryTextActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "ask" && (
          <View style={styles.askWrap}>
            <View style={styles.suggestionRow}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => void ask(s)} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.askRow}>
              <TextInput
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="问关于这只宠物的问题"
                placeholderTextColor={COLORS.textTertiary}
                onSubmitEditing={() => void ask(question)}
                returnKeyType="send"
              />
              <Pressable accessibilityRole="button" accessibilityLabel="提问" onPress={() => void ask(question)} style={styles.askBtn}>
                <Text style={styles.askBtnText}>{asking ? "思考中…" : "提问"}</Text>
              </Pressable>
            </View>
            {askErr ? <Text style={styles.errorText}>{askErr}</Text> : null}
            {answer && !askErr ? <AnswerBlock answer={answer} citations={citations} /> : null}
            {!answer && !askErr && !asking ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>我会基于{pet?.name ?? "宠物"}已有的真实记录回答。</Text>
                <Text style={styles.emptyBody}>你可以问最近变化、任务、训练、健康记录。</Text>
                {aiOff ? <Text style={styles.emptyNote}>当前为模拟服务，回答仅为演示。</Text> : null}
              </View>
            ) : null}
          </View>
        )}
        {tab === "brief" && <BriefPanel onOpenHealth={undefined} />}
        {tab === "find" && <FindPanel />}
        {tab === "plan" && <PlanPanel />}
        {tab === "explain" && <ExplainPanel aiStatus={aiStatus} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnswerBlock({ answer, citations }: { answer: AskAnswer; citations: Array<{ label: string; event_id?: string }> }) {
  return (
    <View style={styles.answer}>
      {answer.external_blocked ? (
        <Text style={styles.emptyBody}>该能力暂未开放。</Text>
      ) : (
        <>
          {answer.answer ? <Text style={styles.answerBody}>{answer.answer}</Text> : null}
          {answer.facts && answer.facts.length > 0 ? (
            <View style={styles.answerSection}>
              <Text style={styles.sectionLabel}>依据</Text>
              {answer.facts.map((f, i) => (
                <Text key={i} style={styles.factLine}>
                  · {f}
                </Text>
              ))}
            </View>
          ) : null}
          {answer.inference ? (
            <View style={styles.answerSection}>
              <Text style={styles.sectionLabel}>推断（非事实）</Text>
              <Text style={styles.inferenceBody}>{answer.inference}</Text>
            </View>
          ) : null}
          {citations.length > 0 ? <Text style={styles.sectionLabel}>来源：{citations.map((c) => c.label).join("、")}</Text> : null}
          {answer.uncertainty ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>不确定性：{answer.uncertainty}</Text>
            </View>
          ) : null}
          {answer.action ? <Text style={styles.actionBody}>下一步：{answer.action}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  petChip: { flexDirection: "row", alignItems: "center", gap: SPACE.s3 },
  petText: { flex: 1 },
  petName: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  petSub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  modeRow: { flexDirection: "row", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s4 },
  mode: { paddingHorizontal: SPACE.s4, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  modeActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  modePrimary: { backgroundColor: COLORS.brandPrimary, borderColor: COLORS.brandPrimary },
  modePrimaryActive: { backgroundColor: COLORS.brandPrimaryDeep },
  modeText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  modeTextActive: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  modePrimaryText: { color: COLORS.textInverse, fontWeight: "600" },
  modePrimaryTextActive: { color: COLORS.textInverse },
  askWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  suggestion: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: SPACE.s3, paddingVertical: 6 },
  suggestionText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  askRow: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s3 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s4,
    paddingVertical: 10,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  askBtn: { backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingHorizontal: SPACE.s4, justifyContent: "center" },
  askBtnText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  emptyState: { alignItems: "center", paddingVertical: SPACE.s8 },
  emptyTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary, textAlign: "center" },
  emptyBody: { fontSize: TYPE.sm, color: COLORS.textTertiary, textAlign: "center", marginTop: SPACE.s2, lineHeight: 20 },
  emptyNote: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  answer: { marginTop: SPACE.s4, backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.dividerSubtle, padding: SPACE.s4 },
  answerBody: { fontSize: TYPE.body, color: COLORS.textPrimary, lineHeight: 22 },
  answerSection: { marginTop: SPACE.s3 },
  sectionLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary, fontWeight: "600", marginTop: SPACE.s2 },
  factLine: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 2 },
  inferenceBody: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 2 },
  noticeBox: { backgroundColor: COLORS.attentionBg, borderRadius: RADIUS.lg, padding: SPACE.s3, marginTop: SPACE.s3 },
  noticeText: { fontSize: TYPE.sm, color: COLORS.attention },
  actionBody: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600", marginTop: SPACE.s3 },
});
