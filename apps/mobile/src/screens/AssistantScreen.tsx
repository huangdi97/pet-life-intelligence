/**
 * AssistantScreen — 宠物的助手 (Stage R.2 §50-53). Pet-aware: the assistant
 * always speaks about THIS pet. Ask is the primary mode; 摘要/找/计划/解释
 * are contextual capabilities (not equal-weight pills). Answers follow the
 * contract: 结论 → 依据 → 不确定性 → 下一步. Medical risk stays with the
 * deterministic rule engine.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type AiStatus, type AskAnswer } from "../api";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { TabParamList } from "../navigation";
import { PetAvatar } from "../components/media/PetAvatar";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { BriefPanel, ExplainPanel, FindPanel, PlanPanel } from "./assistant_panels";

const SUGGESTION_ACTIONS: Array<{ key: string; label: string; fill?: string; route?: "Timeline" }> = [
  { key: "explain", label: "解释变化", fill: "解释最近的变化" },
  { key: "summary", label: "生成总结", fill: "生成今天的总结" },
  { key: "records", label: "查看记录", route: "Timeline" },
  { key: "plan", label: "计划下一步", fill: "帮我计划下一步" },
];

type Tab = "ask" | "brief" | "find" | "plan" | "explain";

const TOOLS: Array<{ id: Exclude<Tab, "ask">; label: string }> = [
  { id: "brief", label: "摘要" },
  { id: "find", label: "找记录" },
  { id: "plan", label: "计划" },
  { id: "explain", label: "解释" },
];

export function AssistantScreen() {
  const { pets, petId } = usePets();
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList>>();
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
        <View style={styles.head} testID="pli.assistant.identity">
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

        {tab === "ask" ? (
          <View style={styles.askWrap} testID="pli.assistant.chat">
            <Text style={styles.askLead}>先问一件和{pet?.name ?? "这只宠物"}有关的事</Text>
            <View style={styles.askRow}>
              <TextInput
                testID="pli.assistant.ask"
                style={styles.input}
                value={question}
                onChangeText={setQuestion}
                placeholder="例如：最近有什么变化？"
                placeholderTextColor={COLORS.textTertiary}
                onSubmitEditing={() => void ask(question)}
                returnKeyType="send"
              />
              <Pressable
                testID="pli.assistant.send"
                accessibilityRole="button"
                accessibilityLabel="提问"
                accessibilityState={{ disabled: asking || !question.trim() }}
                disabled={asking || !question.trim()}
                onPress={() => void ask(question)}
                style={[styles.askBtn, (asking || !question.trim()) && styles.askBtnDisabled]}
              >
                <Text style={styles.askBtnText}>{asking ? "思考中…" : "提问"}</Text>
              </Pressable>
            </View>
            <View style={styles.suggestionRow} accessibilityLabel="常用提问">
              {SUGGESTION_ACTIONS.map((a) => (
                <Pressable
                  key={a.key}
                  testID={`pli.assistant.suggestion.${a.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  onPress={() => (a.route === "Timeline" ? tabNav.navigate("Timeline") : setQuestion(a.fill ?? ""))}
                  style={styles.suggestion}
                >
                  <Text style={styles.suggestionText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
            {askErr ? <Text style={styles.errorText}>{askErr}</Text> : null}
            {answer && !askErr ? <AnswerBlock answer={answer} citations={citations} /> : null}
            {!answer && !askErr && !asking ? (
              <View style={styles.emptyState} testID="pli.assistant.context">
                <Text style={styles.emptyTitle}>只基于已有记录，不替你猜。</Text>
                <Text style={styles.emptyBody}>回答会区分事实、推断、来源、不确定性和下一步。</Text>
                {aiOff ? <Text style={styles.emptyNote}>当前为模拟服务，回答仅为演示。</Text> : null}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.toolPanel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="回到提问"
              onPress={() => setTab("ask")}
              style={styles.backToAsk}
            >
              <Text style={styles.backToAskText}>← 回到提问</Text>
            </Pressable>
            {tab === "brief" && <BriefPanel onOpenHealth={undefined} />}
            {tab === "find" && <FindPanel />}
            {tab === "plan" && <PlanPanel />}
            {tab === "explain" && <ExplainPanel aiStatus={aiStatus} />}
          </View>
        )}

        <View style={styles.toolSection} accessibilityLabel="助手更多能力">
          <Text style={styles.toolLabel}>更多帮助</Text>
          <View style={styles.toolRow}>
            {TOOLS.map((tool) => {
              const active = tab === tool.id;
              return (
                <Pressable
                  key={tool.id}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(tool.id)}
                  style={[styles.tool, active && styles.toolActive]}
                >
                  <Text style={[styles.toolText, active && styles.toolTextActive]}>{tool.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
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
  askWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  askLead: { fontSize: TYPE.section, color: COLORS.textPrimary, fontWeight: "700", marginBottom: SPACE.s2 },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  suggestion: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: SPACE.s3, paddingVertical: 6 },
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
  askBtn: { minHeight: 44, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingHorizontal: SPACE.s4, justifyContent: "center" },
  askBtnDisabled: { opacity: 0.5 },
  askBtnText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  toolPanel: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  backToAsk: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", marginBottom: SPACE.s2 },
  backToAskText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  toolSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s6 },
  toolLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginBottom: SPACE.s2 },
  toolRow: { flexDirection: "row", gap: SPACE.s2 },
  tool: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceRaised },
  toolActive: { backgroundColor: COLORS.brandSoftGreen },
  toolText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "500" },
  toolTextActive: { color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  emptyState: { alignItems: "flex-start", paddingVertical: SPACE.s6 },
  emptyTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary, textAlign: "center" },
  emptyBody: { fontSize: TYPE.sm, color: COLORS.textTertiary, textAlign: "center", marginTop: SPACE.s2, lineHeight: 20 },
  emptyNote: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  // V4 §5 SoftPanel: warm soft surface, no white bordered box.
  answer: { marginTop: SPACE.s4, backgroundColor: COLORS.brandSoftGreen, borderRadius: RADIUS.xl, padding: SPACE.s4 },
  answerBody: { fontSize: TYPE.body, color: COLORS.textPrimary, lineHeight: 22 },
  answerSection: { marginTop: SPACE.s3 },
  sectionLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary, fontWeight: "600", marginTop: SPACE.s2 },
  factLine: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 2 },
  inferenceBody: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginTop: 2 },
  noticeBox: { backgroundColor: COLORS.attentionBg, borderRadius: RADIUS.lg, padding: SPACE.s3, marginTop: SPACE.s3 },
  noticeText: { fontSize: TYPE.sm, color: COLORS.attention },
  actionBody: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600", marginTop: SPACE.s3 },
});
