"use client";

import { useEffect, useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { Icon, type WebIconName } from "../../components/icons";
import { TABS, type AskAnswer, type Tab } from "./constants";
import { AskPanel } from "./_components/AskPanel";
import { BriefPanel } from "./_components/BriefPanel";
import { ExplainPanel } from "./_components/ExplainPanel";
import { FindPanel } from "./_components/FindPanel";
import { PlanPanel } from "./_components/PlanPanel";

const TAB_ICONS: Record<Tab, WebIconName> = {
  ask: "sparkles",
  brief: "note",
  find: "search",
  plan: "target",
  explain: "eye",
};

/** OWN-015 Agent — Pet-aware Assistant（Stage R.2 §50-§53）：
 *  Ask/Brief/Find/Plan/Explain；回答结构「结论→依据→不确定性→下一步」保持不变。 */
export default function AgentPage() {
  const { petId } = useCurrentPet();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("tab");
      if (t === "ask" || t === "brief" || t === "find" || t === "plan" || t === "explain") return t;
    }
    return "ask";
  });
  const [ctx, setCtx] = useState<string>(() => {
    if (typeof window !== "undefined") return new URLSearchParams(window.location.search).get("ctx") ?? "";
    return "";
  });
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AskAnswer | null>(null);

  const aiStatus = useAsync<{ provider?: string; real_provider?: boolean; status?: string }>(
    () => api.get("/ai/status"),
    [],
  );
  const aiOff =
    aiStatus.data != null &&
    aiStatus.data.real_provider === false &&
    aiStatus.data.status !== "REAL_PROVIDER_READY";

  useEffect(() => {
    api
      .get<Pet[]>("/pets")
      .then(setPets)
      .catch(() => setPets([]));
  }, [petId]);

  const petName = pets?.find((p) => p.id === petId)?.name ?? pets?.[0]?.name ?? "";

  async function ask(q: string) {
    if (!petId || !q.trim()) return;
    setAsking(true);
    setAskErr(null);
    try {
      const r = await api.post<AskAnswer>(`/pets/${petId}/ask`, { question: q.trim() });
      setAnswer(r);
    } catch (e) {
      setAskErr(mapErrorMessage(e));
      setAnswer(null);
    } finally {
      setAsking(false);
    }
  }

  const citations: Array<{ label: string; event_id?: string }> = (
    answer?.citations ??
    answer?.sources ??
    []
  )
    .map((c) =>
      typeof c === "string" ? { label: c } : { label: c.label ?? c.event_id ?? "记录", event_id: c.event_id },
    )
    .filter((c) => !!c.label);

  function basePath(): string {
    return process.env.NEXT_BASE_PATH || "";
  }

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>{petName ? `${petName}的助手` : t("agent.title")}</h1>
        <p className="v4-topline-sub">基于 {petName || "它"}已有的真实记录回答，不诊断。</p>
      </div>

      <div className="v4-grid">
        <div>
          <div className="v4-tabs" role="tablist" aria-label="助手功能">
            {TABS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={tab === x.id}
                className={`v4-tab${tab === x.id ? " v4-tab--active" : ""}`}
                onClick={() => setTab(x.id)}
              >
                <span className="v4-tab-icon">
                  <Icon name={TAB_ICONS[x.id]} size={16} />
                </span>
                {x.label}
              </button>
            ))}
          </div>

          {tab === "ask" && (
            <AskPanel
              question={question}
              onQuestionChange={setQuestion}
              asking={asking}
              askErr={askErr}
              answer={answer}
              citations={citations}
              aiOff={aiOff}
              petName={petName}
              onAsk={ask}
              onSuggestion={(s) => {
                setQuestion(s);
                ask(s);
              }}
              basePath={basePath}
            />
          )}
          {tab === "brief" && <BriefPanel />}
          {tab === "find" && <FindPanel />}
          {tab === "plan" && <PlanPanel />}
          {tab === "explain" && <ExplainPanel ctx={ctx} aiStatus={aiStatus} />}
        </div>

        <div className="v4-rail">
          <div className="v4-sec">
            <h2 className="v4-sec-title">它可以帮你做什么</h2>
            <ul className="v4-rule-list" style={{ marginTop: 8 }}>
              <li>问：基于记录回答你的问题</li>
              <li>摘要：健康事件的就诊摘要</li>
              <li>找：全局查找事件与内容</li>
              <li>计划：今天的任务与训练</li>
              <li>解释：为什么发生、查看依据</li>
            </ul>
          </div>
          <div className="v4-sec">
            <h2 className="v4-sec-title">回答如何产生</h2>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>
              回答会给出结论、依据、不确定性与下一步；医疗风险由独立规则引擎判断，不由 AI 决定。AI 无法回答时会明确说明，不会编造。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
