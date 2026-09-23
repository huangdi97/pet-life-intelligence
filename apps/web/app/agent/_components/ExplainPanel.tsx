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

/** OWN-015 Agent — Explain 面板：解释依据与来源（AI 服务接入前显示可用规则/事实，不编造）。 */
export function ExplainPanel({ ctx, aiStatus }: ExplainPanelProps) {
  return (
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
  );
}
