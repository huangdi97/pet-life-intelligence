/** AssistantScreen — 助手 (OWN-015 mobile port of apps/web/app/agent):
 *  Ask / Brief / Find / Plan / Explain 五个能力。Ask 的回答必须区分
 *  事实/推断/来源/不确定性/建议动作，引用真实记录；AI 未接入时诚实显示
 *  “服务暂未开放”，不编造内容。 */
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type AiStatus, type AskAnswer } from "../api";
import { usePets } from "../context";
import { COLORS } from "../tokens";
import { styles } from "./assistant_styles";
import { Badge, Card, Chip, EmptyText, ErrorText, Loading, MutedText, ScreenTitle } from "./ui";
import { BriefPanel, ExplainPanel, FindPanel, PlanPanel } from "./assistant_panels";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "ask", label: "问" },
  { id: "brief", label: "摘要" },
  { id: "find", label: "找" },
  { id: "plan", label: "计划" },
  { id: "explain", label: "解释" },
];

const SUGGESTIONS = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

type Tab = "ask" | "brief" | "find" | "plan" | "explain";

export function AssistantScreen() {
  const { petId } = usePets();
  const [tab, setTab] = useState<Tab>("ask");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);

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
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="助手" sub="回答必须引用内部真实记录；医疗风险由独立规则引擎判断，不由 AI 决定。" />

        <View style={styles.tabRow}>
          {TABS.map((x) => (
            <Chip key={x.id} label={x.label} active={tab === x.id} onPress={() => setTab(x.id)} />
          ))}
        </View>

        {tab === "ask" && (
          <Card>
            <Text style={styles.cardTitle}>提问</Text>
            <View style={styles.suggestionRow}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => void ask(s)} />
              ))}
            </View>
            <View style={styles.askRow}>
              <TextInput
                style={[styles.input, styles.askInput]}
                value={question}
                onChangeText={setQuestion}
                placeholder="问关于这只宠物的问题"
                placeholderTextColor={COLORS.inkDisabled}
                onSubmitEditing={() => void ask(question)}
                returnKeyType="send"
              />
              <Text style={styles.askBtn} onPress={() => void ask(question)}>
                {asking ? "思考中…" : "提问"}
              </Text>
            </View>
            {askErr && <ErrorText>{askErr}</ErrorText>}
            {answer && !askErr && <AnswerBlock answer={answer} citations={citations} />}
            {!answer && !askErr && !asking && (
              <MutedText>{aiOff ? "AI 服务暂未开放（当前为模拟 provider）。" : "还没有回答。输入问题开始。"}</MutedText>
            )}
          </Card>
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
      <View style={styles.answerHead}>
        <Badge text="AI 生成" color={COLORS.accent600} bg={COLORS.accent50} />
        <Text style={styles.answerTitle}>回答</Text>
      </View>
      {answer.external_blocked ? (
        <MutedText>该能力暂未开放。</MutedText>
      ) : (
        <>
          {answer.answer ? <Text style={styles.answerBody}>{answer.answer}</Text> : null}
          {answer.facts && answer.facts.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>事实</Text>
              {answer.facts.map((f, i) => (
                <Text key={i} style={styles.factLine}>
                  · {f}
                </Text>
              ))}
            </>
          ) : null}
          {answer.inference ? (
            <>
              <Text style={styles.sectionLabel}>推断</Text>
              <Text style={styles.inferenceBody}>{answer.inference}</Text>
            </>
          ) : null}
          {citations.length > 0 ? (
            <Text style={styles.sectionLabel}>
              来源：{citations.map((c) => c.label).join("、")}
            </Text>
          ) : null}
          {answer.uncertainty ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>不确定性：{answer.uncertainty}</Text>
            </View>
          ) : null}
          {answer.action ? <Text style={styles.actionBody}>建议动作：{answer.action}</Text> : null}
        </>
      )}
    </View>
  );
}

