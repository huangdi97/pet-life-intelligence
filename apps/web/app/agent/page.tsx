"use client";

import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { Icon, type WebIconName } from "../../components/icons";
import { PetCollectionGate } from "../../components/pet-collection-gate";
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
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), [petId]);
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

  const petName = pets.data?.find((p) => p.id === petId)?.name ?? pets.data?.[0]?.name ?? "";

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

  const contextualTools = TABS.filter((item) => item.id !== "ask");

  if (pets.state !== "ready") {
    return <PetCollectionGate surface="assistant" state={pets.state} onRetry={pets.reload} />;
  }

  return (
    <main className="v4-main v5-domain-page">
      <div data-testid="pli.assistant.identity">
        <div className="v4-topline v5-page-lede">
          <h1>{petName ? `${petName}的助手` : t("agent.title")}</h1>
          <p className="v4-topline-sub">基于 {petName || "它"}已有的真实记录回答，不诊断。</p>
        </div>
      </div>

      <div className="v4-sec" data-testid="pli.assistant.context" style={{ marginBottom: 12 }}>
        <h2 className="v4-sec-title">正在帮助你理解</h2>
        <p className="v4-note" style={{ margin: "6px 0 0" }}>
          {petName ? `${petName} · 最近记录、变化与证据` : "还没有选择宠物"}
        </p>
      </div>

      <div className="v4-grid">
        <div>
          {tab === "ask" ? (
            <section className="v5-assistant-primary" aria-label="提问">
              <p className="v5-assistant-primary-lead">先问一件和{petName || "这只宠物"}有关的事</p>
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
                  if (s.href) {
                    window.location.assign(s.href);
                    return;
                  }
                  setQuestion(s.query);
                  ask(s.query);
                }}
                basePath={basePath}
              />
            </section>
          ) : (
            <section className="v5-assistant-context" aria-label="助手扩展能力">
              <button type="button" className="v5-assistant-back" onClick={() => setTab("ask")}>
                ← 回到提问
              </button>
              {tab === "brief" && <BriefPanel />}
              {tab === "find" && <FindPanel />}
              {tab === "plan" && <PlanPanel />}
              {tab === "explain" && <ExplainPanel ctx={ctx} aiStatus={aiStatus} />}
            </section>
          )}

          <section className="v5-assistant-tools" aria-label="更多帮助">
            <p className="v5-assistant-tools-label">更多帮助</p>
            <div className="v5-assistant-tools-row">
              {contextualTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  aria-pressed={tab === tool.id}
                  className={`v5-assistant-tool${tab === tool.id ? " v5-assistant-tool--active" : ""}`}
                  onClick={() => setTab(tool.id)}
                >
                  <Icon name={TAB_ICONS[tool.id]} size={15} />
                  {tool.id === "find" ? "找记录" : tool.label}
                </button>
              ))}
            </div>
          </section>
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
          <div className="v4-sec" data-testid="pli.assistant.medical-boundary">
            <h2 className="v4-sec-title">医疗动作边界</h2>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>
              助手可以整理已有记录、解释规则结果和准备就诊问题，但不会诊断、开药、改剂量或替代兽医。出现“建议尽快就医 / 建议立即就医”时，以健康页的独立风险分级与行动指引为准。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
