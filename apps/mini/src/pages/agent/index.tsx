/**
 * 助手 — 豆豆的助手 (Stage R.2 §50-53). Pet-aware：顶部显示宠物上下文；
 * Ask 为主模式，其余能力为情境入口（不再等权 pill tab）。
 * 数据流不变：/ask、/search、/health-events、/tasks。
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import { api, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextHeader } from "../../components/pet_visual";
import {
  AskPanel,
  BriefPanel,
  ExplainPanel,
  FindPanel,
  PlanPanel,
} from "./_components";
import {
  isExternalBlocked,
  type AnswerResult,
  type AgentTab,
  type AskState,
  type FindState,
  type HealthEventRow,
  type SearchHit,
} from "./_lib";

export default function Agent() {
  const { pets, petId } = usePets();
  const [tab, setTab] = useState<AgentTab>("ask");
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  // 问（Ask）
  const [question, setQuestion] = useState("");
  const [askState, setAskState] = useState<AskState>("idle");
  const [result, setResult] = useState<AnswerResult | null>(null);

  // 找（Find）
  const [query, setQuery] = useState("");
  const [findState, setFindState] = useState<FindState>("idle");
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

  const modes: Array<{ key: AgentTab; label: string }> = [
    { key: "ask", label: "问" },
    { key: "brief", label: "摘要" },
    { key: "find", label: "找" },
    { key: "plan", label: "计划" },
    { key: "explain", label: "解释" },
  ];

  return (
    <View className="page">
      <PetContextHeader
        pet={current ?? null}
        title={current ? `${current.name}的助手` : "宠物助手"}
        sub="回答引用真实记录；风险判断以独立规则引擎为准"
      />

      <View className="mode-row">
        {modes.map((m) => (
          <View
            key={m.key}
            className={`mode-pill${tab === m.key ? " mode-pill-active" : ""}${m.key === "ask" ? " mode-pill-primary" : ""}`}
            onClick={() => setTab(m.key)}
          >
            {m.label}
          </View>
        ))}
      </View>

      {tab === "ask" && (
        <AskPanel
          petName={current?.name}
          question={question}
          askState={askState}
          result={result}
          onQuestionChange={setQuestion}
          onAsk={ask}
        />
      )}

      {tab === "brief" && <BriefPanel healthRows={healthRows} />}

      {tab === "find" && (
        <FindPanel
          query={query}
          findState={findState}
          hits={hits}
          onQueryChange={setQuery}
          onSearch={runSearch}
        />
      )}

      {tab === "plan" && <PlanPanel tasks={tasks} onComplete={completeTask} />}

      {tab === "explain" && <ExplainPanel />}

      {askState === "blocked" && (
        <Text className="life-empty-note" style={{ display: "block", marginTop: 12 }}>
          AI 服务暂未开放，连接后即可提问。
        </Text>
      )}
    </View>
  );
}
