"use client";

import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { type Async } from "../../../../../lib/hooks";
import { Icon } from "../../../../../components/icons";
import type { StateOverlay } from "./types";

interface StateOverlayCardProps {
  overlay: Async<StateOverlay>;
}

/** 当前状态（真实事实引用）：只展示有来源的指标 + 基线 + 变化 + 说明。 */
export function StateOverlayCard({ overlay }: StateOverlayCardProps) {
  const metrics = overlay.data?.metrics ?? [];
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">此刻</h2>
        <span className="v4-chip">
          <span className="v4-chip-icon">
            <Icon name="clock" size={13} />
          </span>
          有来源的数据
        </span>
      </div>
      <State
        state={overlay.state}
        error={overlay.error ? mapErrorMessage(overlay.error) : null}
        onRetry={overlay.reload}
        empty="今天还没有可展示的状态。"
      >
        {metrics.length > 0 ? (
          <div className="v4-metrics">
            {metrics.map((m) => (
              <div key={m.key + m.label} className="v4-metric">
                <span className="v4-metric-value">
                  {String(m.current)}
                  <span className="v4-metric-unit">{m.freshness}</span>
                </span>
                <div className="v4-metric-label">
                  {m.label}
                  {m.baseline_range ? ` · 基线 ${m.baseline_range}` : ""}
                  {m.delta != null ? ` · 变化 ${m.delta > 0 ? "+" : ""}${m.delta}` : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="v4-sec-sub">今天还没有记录。</p>
        )}
        {overlay.data?.note && <p className="v4-note" style={{ marginTop: 10 }}>{overlay.data.note}</p>}
      </State>
    </div>
  );
}
