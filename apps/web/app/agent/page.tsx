"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { CitationChip } from "@pli/ui-kit";
import { State } from "../../components/ui";

interface AskAnswer {
  question?: string;
  answer?: string;
  facts?: string[];
  inference?: string | null;
  citations?: Array<{ label?: string; event_id?: string } | string>;
  sources?: Array<{ label?: string; event_id?: string } | string>;
  uncertainty?: string | null;
  action?: string | null;
  sufficient?: boolean;
  detail?: string;
  note?: string;
  limited?: boolean;
  external_blocked?: boolean;
}

type Tab = "ask" | "brief" | "find" | "plan" | "explain";

const SUGGESTIONS = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

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

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "ask", label: t("agent.tabAsk") },
    { id: "brief", label: t("agent.tabBrief") },
    { id: "find", label: t("agent.tabFind") },
    { id: "plan", label: t("agent.tabPlan") },
    { id: "explain", label: t("agent.tabExplain") },
  ];

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
        <div className="card">
          <h2>{t("agent.ask")}</h2>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="btn"
                style={{ fontSize: 13 }}
                onClick={() => {
                  setQuestion(s);
                  ask(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="row">
            <input
              style={{ flex: 1, minWidth: 240 }}
              value={question}
              placeholder={t("agent.askPlaceholder")}
              aria-label="问题"
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(question);
              }}
            />
            <button className="btn primary" disabled={asking || !question.trim()} onClick={() => ask(question)}>
              {asking ? "思考中……" : t("agent.ask")}
            </button>
          </div>
          {askErr && (
            <div className="alert emergency" role="alert">
              {askErr}
            </div>
          )}
          {answer && !askErr && (
            <div className="pli-state" style={{ textAlign: "left", marginTop: 12 }}>
              <div className="pli-ai-answer-head">
                <span className="badge pli-badge--ai">{t("agent.aiBadge")}</span>
                <span className="pli-ai-answer-title">{t("agent.answer")}</span>
              </div>
              {answer.answer && <p style={{ margin: "8px 0 0" }}>{answer.answer}</p>}
              {answer.facts && answer.facts.length > 0 && (
                <>
                  <div className="muted" style={{ marginTop: 8 }}>
                    {t("agent.facts")}
                  </div>
                  <ul className="pli-ai-facts">
                    {answer.facts.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
              {answer.inference && (
                <>
                  <div className="muted" style={{ marginTop: 8 }}>
                    {t("agent.inference")}
                  </div>
                  <div className="pli-ai-inference">{answer.inference}</div>
                </>
              )}
              {citations.length > 0 && (
                <div className="pli-ai-citations">
                  <span className="pli-ai-citations-label">{t("agent.sources")}：</span>
                  {citations.map((c, i) => (
                    <CitationChip
                      key={i}
                      label={c.label}
                      eventId={c.event_id}
                      onClick={
                        c.event_id
                          ? (eventId) => {
                              window.location.href = new URL(
                                `${basePath()}/timeline?event=${eventId}`,
                                window.location.origin,
                              ).toString();
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
              {answer.uncertainty && (
                <div className="pli-ai-uncertainty pli-notice">
                  {t("agent.uncertainty")}：{answer.uncertainty}
                </div>
              )}
              {answer.action && (
                <div className="pli-ai-action">
                  {t("agent.action")}：{answer.action}
                </div>
              )}
            </div>
          )}
          {!answer && !askErr && !asking && aiOff && <div className="state">{t("agent.off")}</div>}
          {!answer && !askErr && !asking && !aiOff && <div className="state">{t("agent.noAnswer")}</div>}
        </div>
      )}

      {tab === "brief" && (
        <div className="card">
          <h2>{t("agent.tabBrief")}</h2>
          <p className="sub">健康事件的就诊摘要（信息整理，不是兽医诊断）。</p>
          <div className="row">
            <Link href="/health" className="btn primary">
              {t("agent.briefLink")}
            </Link>
          </div>
        </div>
      )}

      {tab === "find" && (
        <div className="card">
          <h2>{t("agent.tabFind")}</h2>
          <p className="sub">全局查找事件与内容。</p>
          <div className="row">
            <Link href="/search" className="btn primary">
              {t("agent.findLink")}
            </Link>
          </div>
        </div>
      )}

      {tab === "plan" && (
        <div className="card">
          <h2>{t("agent.tabPlan")}</h2>
          <p className="sub">今日任务与训练计划。</p>
          <div className="row">
            <Link href="/tasks" className="btn primary">
              任务
            </Link>
            <Link href="/training" className="btn">
              训练
            </Link>
          </div>
        </div>
      )}

      {tab === "explain" && (
        <div className="card">
          <h2>{t("agent.tabExplain")}</h2>
          <p className="sub">{t("agent.explainDesc")}</p>
          {ctx && (
            <div className="alert info" role="status">
              正在解释：<strong>{ctx}</strong> —— 查看这个现象的依据与来源（AI 服务接入前显示可用的规则/事实，不编造）。
            </div>
          )}
          <State
            state={aiStatus.state}
            error={aiStatus.error ? mapErrorMessage(aiStatus.error) : null}
            onRetry={aiStatus.reload}
            empty="—"
          >
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="badge">
                AI provider: {aiStatus.data?.status === "REAL_PROVIDER_READY" ? "已接入" : "服务暂未开放"}
              </span>
              <span className="badge">Red Flag Rule Engine: 独立运行</span>
            </div>
          </State>
        </div>
      )}
    </main>
  );
}
