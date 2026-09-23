"use client";

import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { fmtTime, type Async } from "../../../../../lib/hooks";
import type { VisualModel } from "./types";

interface ModelVersionsCardProps {
  models: Async<{ models: VisualModel[] }>;
}

/** 3D 形象版本列表：ACTIVE/VERIFYING/FAILED 状态、来源与确认标记。 */
export function ModelVersionsCard({ models }: ModelVersionsCardProps) {
  return (
    <div className="card">
      <h2>3D 形象版本</h2>
      <State
        state={models.state}
        error={models.error ? mapErrorMessage(models.error) : null}
        onRetry={models.reload}
        empty="还没有 3D 形象版本。"
      >
        {models.data?.models.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            还没有 3D 形象。你可以尝试提交生成请求；真实生成服务接入后，这里会显示待确认与已激活的版本。
          </p>
        )}
        <ul className="tl">
          {models.data?.models.map((m) => (
            <li key={m.model_id}>
              <div className="tl-head">
                <span className="tl-type">v{m.version}</span>
                <span className={`badge ${m.status === "ACTIVE" ? "MONITOR" : m.status === "FAILED" ? "EMERGENCY" : ""}`}>
                  {m.status}
                </span>
                <span className="badge">{m.provenance_kind}</span>
                {m.owner_verified === true && <span className="badge">已确认像它</span>}
                {m.owner_verified === false && <span className="badge">待重新生成</span>}
                {m.activated_at && <span className="tl-time">激活于 {fmtTime(m.activated_at)}</span>}
              </div>
              {m.failure_reason && (
                <div className="tl-body muted">
                  失败原因：{m.failure_reason}（真实生成服务未接入，不会伪装成功）
                </div>
              )}
              {m.identity_qc?.issues && m.identity_qc.issues.length > 0 && (
                <div className="tl-body muted">待修正：{m.identity_qc.issues.join("、")}</div>
              )}
            </li>
          ))}
        </ul>
      </State>
    </div>
  );
}
