"use client";

import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { type Async } from "../../../../../lib/hooks";
import type { StateOverlay } from "./types";

interface StateOverlayCardProps {
  overlay: Async<StateOverlay>;
}

/** 当前状态（真实事实引用）：指标 + 基线 + 变化 + 说明。 */
export function StateOverlayCard({ overlay }: StateOverlayCardProps) {
  return (
    <div className="card">
      <h2>当前状态</h2>
      <State
        state={overlay.state}
        error={overlay.error ? mapErrorMessage(overlay.error) : null}
        onRetry={overlay.reload}
        empty="今天还没有可展示的状态。"
      >
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {overlay.data?.metrics.map((m) => (
            <span key={m.key + m.label} className="badge">
              {m.label}：{String(m.current)}
              {m.baseline_range ? ` · 基线 ${m.baseline_range}` : ""}
              {m.delta != null ? ` · 变化 ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}
              {m.freshness ? ` · ${m.freshness}` : ""}
            </span>
          ))}
        </div>
        {overlay.data?.metrics.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            今天还没有记录。
          </p>
        )}
        {overlay.data?.note && (
          <p className="muted" style={{ marginTop: 8 }}>
            {overlay.data.note}
          </p>
        )}
      </State>
    </div>
  );
}
