import { useCallback, useEffect, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ApiError, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

/** Assistant（MIN-004）：5 页内 tab 问/摘要/找/计划/解释（IA §2）。
 *  AI 服务外部受阻（无 AI key）时如实显示「服务暂未开放」，不显示原始错误码。 */

type AgentTab = "ask" | "brief" | "find" | "plan" | "explain";

const TABS: Array<{ key: AgentTab; label: string }> = [
  { key: "ask", label: "问" },
  { key: "brief", label: "摘要" },
  { key: "find", label: "找" },
  { key: "plan", label: "计划" },
  { key: "explain", label: "解释" },
];

/** 建议问题（Stage H 指定 4 条）。 */
const SUGGESTED = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

interface AnswerResult {
  answer: string;
  citations: string[];
  sufficient: boolean;
  disclaimer: string;
}

interface SearchHit {
  event_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
}

/** AI/外部服务受阻 → 人类语言；绝不显示原始错误码。 */
function isExternalBlocked(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.code === "EXTERNAL_BLOCKED" || e.code.startsWith("AI_") || e.status >= 500)
  );
}

export default function Agent() {
  const { petId } = usePets();
  const [tab, setTab] = useState<AgentTab>("ask");

  // 问（Ask）
  const [question, setQuestion] = useState("");
  const [askState, setAskState] = useState<"idle" | "loading" | "ready" | "blocked" | "error">("idle");
  const [result, setResult] = useState<AnswerResult | null>(null);

  // 找（Find）
  const [query, setQuery] = useState("");
  const [findState, setFindState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [hits, setHits] = useState<SearchHit[]>([]);

  // 摘要（Brief）
  const [healthRows, setHealthRows] = useState<HealthEventRow[] | null>(null);

  // 计划（Plan）
  const [tasks, setTasks] = useState<Task[] | null>(null);

  const loadBriefAndPlan = useCallback((pid: string) => {
    api
      .get<HealthEventRow[]>(`/pets/${pid}/health-events`)
      .then((rows) => setHealthRows(rows))
      .catch(() => setHealthRows([]));
    api
      .get<Task[]>(`/pets/${pid}/tasks?status=OPEN`)
      .then((rows) => setTasks(rows))
      .catch(() => setTasks([]));
  }, []);

  useEffect(() => {
    if (petId) loadBriefAndPlan(petId);
  }, [petId, loadBriefAndPlan]);

  async function ask(q?: string) {
    const text = (q ?? question).trim();
    if (!text || !petId) return;
    setQuestion(text);
    setAskState("loading");
    try {
      const r = await api.post<AnswerResult>(`/pets/${petId}/ask`, { question: text });
      setResult(r);
      setAskState("ready");
    } catch (e: unknown) {
      if (isExternalBlocked(e)) setAskState("blocked");
      else setAskState("error");
    }
  }

  async function runSearch() {
    if (!query.trim() || !petId) return;
    setFindState("loading");
    try {
      const r = await api.get<{ hits: SearchHit[]; notice: string }>(
        `/pets/${petId}/search?q=${encodeURIComponent(query.trim())}`,
      );
      setHits(r.hits);
      setFindState("ready");
    } catch {
      setFindState("error");
    }
  }

  async function completeTask(taskId: string) {
    if (!petId) return;
    try {
      await api.post(`/tasks/${taskId}/complete`, {});
      loadBriefAndPlan(petId);
    } catch {
      /* 任务完成失败在任务页可见；此处保持安静刷新 */
    }
  }

  const latestOpen = healthRows?.find((h) => h.status !== "CLOSED") ?? null;

  return (
    <View className="page">
      <View className="h1">宠物助手</View>
      <View className="sub">回答必须引用真实事件、显示时间与来源；风险判断以独立规则引擎为准</View>

      <View className="agent-tabs">
        {TABS.map((t) => (
          <View
            key={t.key}
            className={`agent-tab${tab === t.key ? " agent-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </View>
        ))}
      </View>

      {tab === "ask" && (
        <View>
          <View className="card">
            <View className="field">
              <Text>想了解什么？</Text>
              <Input
                className="input"
                value={question}
                onInput={(e) => setQuestion(e.detail.value)}
                placeholder="例如：最近 30 天体重有什么变化？"
              />
            </View>
            <Button className="btn btn-primary" onClick={() => ask()} disabled={askState === "loading" || !question.trim()}>
              {askState === "loading" ? "分析中…" : "提问"}
            </Button>
          </View>

          <View className="card">
            <Text>建议问题</Text>
            <View className="chips" style={{ marginTop: 12 }}>
              {SUGGESTED.map((s) => (
                <View key={s} className="chip" onClick={() => ask(s)}>{s}</View>
              ))}
            </View>
          </View>

          {askState === "loading" && <View className="state">分析中……</View>}
          {askState === "blocked" && (
            <View className="state">服务暂未开放。AI 问答依赖 AI 服务（当前环境未接入），开放后可直接提问。</View>
          )}
          {askState === "error" && <View className="state state-error">暂时无法回答，请稍后重试。</View>}
          {askState === "ready" && result && (
            <View className="card">
              <Text style={{ fontSize: 28 }}>{result.answer}</Text>
              {result.citations.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text className="muted">引用的事件：</Text>
                  {result.citations.map((c, i) => (
                    <View className="tl-item" key={i}>
                      <View className="tl-body">{c}</View>
                    </View>
                  ))}
                </View>
              )}
              {!result.sufficient && <View className="muted" style={{ marginTop: 8 }}>当前记录不足以完整回答该问题。</View>}
              <View className="muted" style={{ marginTop: 12 }}>
                {result.disclaimer || "助手不做医疗诊断；风险判断以独立规则引擎为准。"}
              </View>
            </View>
          )}
        </View>
      )}

      {tab === "brief" && (
        <View>
          <View className="card">
            <Text>最新健康摘要</Text>
            {healthRows === null && <View className="muted" style={{ marginTop: 12 }}>加载中……</View>}
            {healthRows !== null && !latestOpen && (
              <View className="muted" style={{ marginTop: 12 }}>当前没有进行中的健康事件。</View>
            )}
            {latestOpen && (
              <View style={{ marginTop: 12 }}>
                <View className="tl-item">
                  <View className="tl-head">
                    <Text className="tl-type">{latestOpen.chief_complaint}</Text>
                    <Text className={`badge ${latestOpen.latest_triage_level ?? ""}`}>
                      {latestOpen.latest_triage_level ?? "未分级"}
                    </Text>
                    <Text className="tl-time">{fmtTime(latestOpen.opened_at)}</Text>
                  </View>
                </View>
              </View>
            )}
            <View className="muted" style={{ marginTop: 12 }}>
              完整流程（追问 → 红旗 → 分级 → 就诊摘要 → 结局）在健康页查看；摘要为信息整理，不是兽医诊断。
            </View>
            <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/health/index" })}>
              打开健康 ›
            </View>
          </View>
        </View>
      )}

      {tab === "find" && (
        <View>
          <View className="card">
            <View className="field">
              <Text>在时间线里找</Text>
              <Input
                className="input"
                value={query}
                onInput={(e) => setQuery(e.detail.value)}
                placeholder="关键词，例如：呕吐"
              />
            </View>
            <Button className="btn btn-primary" onClick={runSearch} disabled={findState === "loading" || !query.trim()}>
              {findState === "loading" ? "搜索中…" : "搜索"}
            </Button>
          </View>
          {findState === "error" && <View className="state state-error">搜索失败，请稍后重试。</View>}
          {findState === "ready" && hits.length === 0 && (
            <View className="state">无结果（只返回真实事件引用；无记录即无结果）。</View>
          )}
          {hits.map((h) => (
            <View className="tl-item" key={h.event_id}>
              <View className="tl-head">
                <Text className="tl-type">{h.event_type}</Text>
                <Text className="tl-time">{fmtTime(h.occurred_at)}</Text>
              </View>
              <View className="tl-body">
                {Object.entries(h.payload)
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(" · ")}
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === "plan" && (
        <View>
          <View className="card">
            <Text>今日计划（进行中任务）</Text>
            {tasks === null && <View className="muted" style={{ marginTop: 12 }}>加载中……</View>}
            {tasks !== null && tasks.length === 0 && (
              <View className="muted" style={{ marginTop: 12 }}>今天没有进行中任务。</View>
            )}
            {tasks?.slice(0, 5).map((t) => (
              <View className="tl-item" key={t.id}>
                <View className="tl-head">
                  <Text className="tl-type">{t.title}</Text>
                  <Button className="btn" size="mini" onClick={() => completeTask(t.id)}>完成</Button>
                </View>
                <View className="muted">{t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}</View>
              </View>
            ))}
            <View className="muted" style={{ marginTop: 12 }}>
              AI 生成计划服务暂未开放（当前环境未接入 AI）；可在任务页手动添加。
            </View>
            <View className="btn" style={{ marginTop: 8 }} onClick={() => Taro.navigateTo({ url: "/pages/tasks/index" })}>
              管理任务 ›
            </View>
          </View>
        </View>
      )}

      {tab === "explain" && (
        <View>
          <View className="card">
            <Text>这个系统如何得出结论？</Text>
            <View className="muted" style={{ marginTop: 12, fontSize: 26, lineHeight: 1.75 }}>
              1. 所有记录都是真实事件：谁（actor）、何时（time）、来源（source）与证据（evidence）进入统一事件图。{"\n"}
              2. 助手回答必须引用真实事件；引用可在时间线核对，不生成历史。{"\n"}
              3. 医疗风险分级来自独立红旗规则引擎，AI 不单独决定 emergency。{"\n"}
              4. 就诊摘要与照护卡是信息整理，不是兽医诊断；系统不改药、不自动停药。{"\n"}
              5. 未发现红旗不等于“没有疾病”；图片结果不写成确定诊断。
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
