"use client";

import type { Consent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";

interface ConsentsCardProps {
  consents: Async<Consent[]>;
  onToggle: (purpose: string, granted: boolean) => void;
}

/** PLI-016/215 数据同意卡片：逐项同意/撤回，SERVICE_ESSENTIAL 不可撤回。 */
export function ConsentsCard({ consents, onToggle }: ConsentsCardProps) {
  return (
    <div className="card">
      <h2>数据同意</h2>
      <State state={consents.state} error={consents.error} onRetry={consents.reload}>
        {consents.data?.map((c) => (
          <div className="row" key={c.purpose} style={{ margin: "6px 0" }}>
            <span style={{ minWidth: 220 }}>{c.purpose}</span>
            <span className={`badge ${c.granted ? "MONITOR" : "EMERGENCY"}`}>
              {c.granted ? "已同意" : "未同意"}
            </span>
            <button
              className="btn"
              disabled={c.purpose === "SERVICE_ESSENTIAL"}
              onClick={() => onToggle(c.purpose, !c.granted)}
            >
              {c.granted ? "撤回" : "同意"}
            </button>
            <span className="muted">{fmtTime(c.updated_at)}</span>
          </div>
        ))}
      </State>
      <p className="muted">SERVICE_ESSENTIAL 为产品必需同意，不可撤回（撤回即无法使用服务）。</p>
    </div>
  );
}
