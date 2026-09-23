import { useCallback, useEffect, useState } from "react";
import { View } from "@tarojs/components";
import { api, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import {
  AgentTabs,
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

/** Assistant（MIN-004）：5 页内 tab 问/摘要/找/计划/解释（IA §2）。
 *  AI 服务外部受阻（无 AI key）时如实显示「服务暂未开放」，不显示原始错误码。 */

export default function Agent() {
  const { petId } = usePets();
  const [tab, setTab] = useState<AgentTab>("ask");

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

  return (
    <View className="page">
      <View className="h1">宠物助手</View>
      <View className="sub">回答必须引用真实事件、显示时间与来源；风险判断以独立规则引擎为准</View>

      <AgentTabs tab={tab} onChange={setTab} />

      {tab === "ask" && (
        <AskPanel
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
    </View>
  );
}
