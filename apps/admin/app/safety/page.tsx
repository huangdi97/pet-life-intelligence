"use client";

import { api } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/**
 * ADM-005 Safety — 红旗规则 / triage 审计 / 医疗安全事件。
 * 红旗规则引擎状态来自 /ops/status（真实接口）；triage 审计与医疗安全事件
 * 的管理端查询接口尚未接入（Step 0 盘点无 /admin/safety），渲染诚实状态。
 */
export default function SafetyPage() {
  const status = useAsync<{
    counts: Record<string, number>;
    rule_engine?: { version?: string; rules?: number };
  }>(() => api.get("/ops/status"), []);

  return (
    <main>
      <h1>医疗安全</h1>
      <p className="sub">红旗规则引擎 / triage 审计 / 医疗安全事件（红线：LLM 不单独决定紧急）</p>

      <div className="card">
        <h2>红旗规则引擎（Red Flag Rule Engine）</h2>
        <State state={status.state} error={status.error} onRetry={status.reload} empty="暂无引擎状态">
          <div className="row">
            {status.data?.rule_engine ? (
              <span className="badge on">
                独立运行 · v{status.data.rule_engine.version ?? "?"} · {status.data.rule_engine.rules ?? "?"} 条规则
              </span>
            ) : (
              <span className="badge off">规则引擎状态不可用</span>
            )}
          </div>
          <p className="muted">
            医疗风险分级由独立规则引擎给出；AI 不单独决定紧急等级，也不能降低规则结果。
          </p>
        </State>
      </div>

      <div className="card">
        <h2>triage 审计</h2>
        <div className="state">
          能力未开放
          <br />
          <span className="muted">管理端的分级审计查询接口尚未接入，此页暂不展示数据。</span>
        </div>
      </div>

      <div className="card">
        <h2>医疗安全事件</h2>
        <div className="state">
          能力未开放
          <br />
          <span className="muted">医疗安全事件的专用列表接口尚未接入；通用事件追踪见“事件追踪”页。</span>
        </div>
      </div>
    </main>
  );
}
