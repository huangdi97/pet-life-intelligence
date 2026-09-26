"use client";

import { Icon } from "../../../components/icons";
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
 *  AI 服务未接入时只展示规则/事实，不编造推断。 */
export function ExplainPanel({ ctx, aiStatus }: ExplainPanelProps) {
  const aiReady = aiStatus.data?.status === "REAL_PROVIDER_READY";
  const sections: { title: string; body: string }[] = [
    {
      title: t("agent.explainFacts"),
      body: ctx
        ? `当前解释对象：「${ctx}」—— 它来自事件与观察记录（来源与时间见时间线）。`
        : "选择 Today 中“值得注意”的条目，或输入一个现象，即可查看它的依据。",
    },
    {
      title: t("agent.explainBaseline"),
      body: "与它自己相比：对照它近期的个人范围与变化幅度，不是医疗诊断，也不与其他宠物比较。",
    },
    {
      title: t("agent.explainInference"),
      body: aiReady
        ? "AI 推断会标注不确定度与证据来源。"
        : "AI 服务暂未开放：只展示来自确定性规则的事实与结论，不编造推断。",
    },
    {
      title: t("agent.explainNext"),
      body: "下一步：查看该现象的原始记录（时间线）、在生命视图中查看状态，或快速记录一次新的观察。",
    },
  ];
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }}>
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">{t("agent.tabExplain")}</h2>
        <span className="v4-chip v4-chip--info">
          <span className="v4-chip-icon">
            <Icon name="check" size={13} />
          </span>
          基于真实记录
        </span>
      </div>
      <p className="v4-sec-sub">{t("agent.explainDesc")}</p>
      {sections.map((s) => (
        <section key={s.title} style={{ margin: "14px 0 0" }}>
          <h3 className="v4-sec-title" style={{ fontSize: 14 }}>{s.title}</h3>
          <p className="v4-note" style={{ margin: "5px 0 0", color: "var(--v4-text-secondary)", fontSize: 13 }}>
            {s.body}
          </p>
        </section>
      ))}
      <State
        state={aiStatus.state}
        error={aiStatus.error ? mapErrorMessage(aiStatus.error) : null}
        onRetry={aiStatus.reload}
        empty="—"
      >
        <div className="v4-statsline" style={{ marginTop: 14 }}>
          <span className="v4-chip">AI 服务：{aiReady ? "已接入" : "暂未开放"}</span>
          <span className="v4-chip v4-chip--success">风险规则：独立运行</span>
        </div>
      </State>
    </div>
  );
}
