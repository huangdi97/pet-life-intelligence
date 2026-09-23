"use client";

import { useState } from "react";
import { api } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { TABS, type AskAnswer, type Tab } from "./constants";
import { AskPanel } from "./_components/AskPanel";
import { BriefPanel } from "./_components/BriefPanel";
import { ExplainPanel } from "./_components/ExplainPanel";
import { FindPanel } from "./_components/FindPanel";
import { PlanPanel } from "./_components/PlanPanel";

/** OWN-015 Agent — Assistant IA（Stage H §45-47）：Ask/Brief/Find/Plan/Explain。
 *  AI Answer: Facts/Inference/Sources/Uncertainty/Action；点击 Citation → Timeline Event。
 *  无 AI provider 时诚实显示「服务暂未开放」，不编造内容。 */
export default function AgentPage() {
  const { petId } = useCurrentPet();
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
    <main>
      <h1>{t("agent.title")}</h1>
      <p className="sub">{t("agent.sub")}</p>

      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 6 }} role="tablist" aria-label="助手功能">
        {TABS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            className={`btn ${tab === x.id ? "primary" : ""}`}
            onClick={() => setTab(x.id)}
          >
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
    </main>
  );
}
