"use client";

import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { fmtTime, type Async } from "../../../../../lib/hooks";
import type { VisualModel } from "./types";

interface ModelVersionsCardProps {
  models: Async<{ models: VisualModel[] }>;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "已激活",
  VERIFYING: "待你确认",
  FAILED: "生成失败",
  PENDING: "生成中",
  PROCESSING: "生成中",
  RETIRED: "已停用",
};

/** 3D 形象版本列表（用户语言）：状态 / 确认标记 / 时间，不暴露内部枚举。 */
export function ModelVersionsCard({ models }: ModelVersionsCardProps) {
  const rows = models.data?.models ?? [];
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">3D 形象版本</h2>
      </div>
      <State
        state={models.state}
        error={models.error ? mapErrorMessage(models.error) : null}
        onRetry={models.reload}
        empty="还没有 3D 形象版本。"
      >
        {rows.length === 0 && (
          <p className="v4-sec-sub">还没有 3D 形象。接入真实生成服务后，这里会显示待确认与已激活的版本。</p>
        )}
        {rows.map((m) => (
          <div key={m.model_id} className="ls-item" style={{ gridTemplateColumns: "auto 1fr" }}>
            <span className="ls-time">{m.activated_at ? fmtTime(m.activated_at).slice(0, 10) : ""}</span>
            <div className="ls-body">
              <div className="ls-title">
                <span className="ls-title-icon">3D</span>
                v{m.version}
              </div>
              <div className="ls-meta">
                <span
                  className={`v4-chip${m.status === "ACTIVE" ? " v4-chip--success" : m.status === "FAILED" ? " v4-chip--danger" : m.status === "VERIFYING" ? " v4-chip--warning" : ""}`}
                >
                  {STATUS_LABELS[m.status] ?? "处理中"}
                </span>
                {m.owner_verified === true && <span className="v4-chip v4-chip--success">已确认像它</span>}
                {m.owner_verified === false && <span className="v4-chip v4-chip--warning">待重新生成</span>}
              </div>
              {m.status === "FAILED" && (
                <p className="v4-note" style={{ marginTop: 6 }}>
                  生成失败。真实生成服务接入后可以重试。
                </p>
              )}
              {m.identity_qc?.issues && m.identity_qc.issues.length > 0 && (
                <p className="v4-note" style={{ marginTop: 6 }}>待修正：{m.identity_qc.issues.join("、")}</p>
              )}
            </div>
          </div>
        ))}
      </State>
    </div>
  );
}
