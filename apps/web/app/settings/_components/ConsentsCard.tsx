"use client";

import type { Consent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { consentPurposeLabel } from "../../../lib/ownerLabels";

interface ConsentsCardProps {
  consents: Async<Consent[]>;
  onToggle: (purpose: string, granted: boolean) => void;
}


/** PLI-016/215 数据同意：逐项同意/撤回，owner copy never leaks raw enums. */
export function ConsentsCard({ consents, onToggle }: ConsentsCardProps) {
  return (
    <section className="v5-me-section">
      <h2>隐私与数据同意</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        你可以逐项查看并调整用途。核心服务所需数据不可单独撤回，否则服务无法继续运行。
      </p>
      <State state={consents.state} error={consents.error} onRetry={consents.reload}>
        <div className="v5-me-list">
          {consents.data?.map((c) => {
            const essential = c.purpose === "SERVICE_ESSENTIAL";
            return (
              <div className="v5-me-row" key={c.purpose}>
                <div className="v5-me-row-main">
                  <strong>{consentPurposeLabel(c.purpose)}</strong>
                  <span>最近更新 {fmtTime(c.updated_at)}</span>
                </div>
                <span className={`v4-chip ${c.granted ? "v4-chip--success" : ""}`}>
                  {c.granted ? "已同意" : "未同意"}
                </span>
                <button
                  className="btn"
                  disabled={essential}
                  aria-label={essential ? "核心服务所需数据不可单独撤回" : `${c.granted ? "撤回" : "同意"}：${consentPurposeLabel(c.purpose)}`}
                  onClick={() => onToggle(c.purpose, !c.granted)}
                >
                  {essential ? "服务必需" : c.granted ? "撤回" : "同意"}
                </button>
              </div>
            );
          })}
        </div>
      </State>
    </section>
  );
}
