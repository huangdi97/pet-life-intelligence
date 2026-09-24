"use client";

import { State } from "../../../components/ui";
import type { Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";

interface AiStatus {
  provider?: string;
  real_provider?: boolean;
  status?: string;
}

interface ExplainPanelProps {
  ctx: string;
  aiStatus: Async<AiStatus>;
}

/** OWN-015 Agent — Explain 面板：情境化解释（v3.3 §34.5 Explain Sheet）。
 *  四段式模板：事实 / 与它自己相比 / 推断与不确定 / 下一步。
 *  AI 服务未接入时只展示规则/事实（Red Flag Rule Engine 独立运行），
 *  不编造推断；“推断”段落显式标注 NOT_AVAILABLE。 */
export function ExplainPanel({ ctx, aiStatus }: ExplainPanelProps) {
  const aiReady = aiStatus.data?.status === "REAL_PROVIDER_READY";
  const sections: { title: string; body: string }[] = [
    {
      title: t("agent.explainFacts"),
      body: ctx
        ? `当前解释对象：「${ctx}」—— 它来自事件与观察记录（来源与时间见 Timeline）。`
        : "选择 Today 中“值得注意”的条目，或输入一个现象，即可查看它的依据。",
    },
    {
      title: t("agent.explainBaseline"),
      body: "与它自己相比：对照它近期的个人范围（Personal Baseline）与基线差（delta），不是医疗诊断，也不与其他宠物比较。",
    },
    {
      title: t("agent.explainInference"),
      body: aiReady
        ? "AI 推断将标注不确定度与证据来源。（当前 provider 状态：已接入）"
        : "推断：AI 服务暂未接入（NOT_AVAILABLE）—— 仅展示来自确定性规则的结论（例如 Red Flag Rule Engine），不编造推断。",
    },
    {
      title: t("agent.explainNext"),
      body: "下一步：查看该现象的原始记录（Timeline）、在生命视图中查看状态 Overlay，或快速记录一次新的观察。",
    },
  ];
  return (
    <div className="card">
      <h2>{t("agent.tabExplain")}</h2>
      <p className="sub">{t("agent.explainDesc")}</p>
      {sections.map((s) => (
        <section key={s.title} style={{ margin: "10px 0 0" }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>{s.title}</h3>
          <p className="muted" style={{ margin: "4px 0 0" }}>{s.body}</p>
        </section>
      ))}
      <State
        state={aiStatus.state}
        error={aiStatus.error ? mapErrorMessage(aiStatus.error) : null}
        onRetry={aiStatus.reload}
        empty="—"
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <span className="badge">
            AI provider: {aiReady ? "已接入" : "服务暂未开放"}
          </span>
          <span className="badge">Red Flag Rule Engine: 独立运行</span>
        </div>
      </State>
    </div>
  );
}
