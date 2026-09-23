"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime, type Async } from "../../../../../lib/hooks";
import { mapErrorMessage } from "../../../../../lib/errors";
import { State, TriageBadge } from "../../../../../components/ui";

export interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
}

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

export function SelectHealthEventCard({
  healthEvents,
  rows,
  selected,
  onSelect,
  detail,
}: {
  healthEvents: Async<HealthEventRow[]>;
  rows: HealthEventRow[];
  selected: string;
  onSelect: (value: string) => void;
  detail: Async<HealthEventDetail | null>;
}) {
  const sel = detail.data;
  return (
    <div className="card">
      <h2>选择健康事件</h2>
      <State
        state={healthEvents.state}
        error={healthEvents.error ? mapErrorMessage(healthEvents.error) : null}
        onRetry={healthEvents.reload}
        empty="暂无健康事件，无法记录结局。"
      >
        <label className="field">
          健康事件
          <select value={selected} onChange={(e) => { onSelect(e.target.value); }} aria-label="选择健康事件">
            <option value="">（请选择）</option>
            {rows.map((h) => (
              <option key={h.health_event_id} value={h.health_event_id}>
                {h.chief_complaint}（{STATUS_LABELS[h.status] ?? h.status}）
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <State
            state={detail.state}
            error={detail.error ? mapErrorMessage(detail.error) : null}
            onRetry={detail.reload}
          >
            {sel && (
              <>
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  <span className={`badge status-${sel.status}`}>当前状态：{STATUS_LABELS[sel.status] ?? sel.status}</span>
                  <TriageBadge level={sel.latest_triage_level} />
                </div>
                {sel.outcomes.length > 0 ? (
                  <>
                    <h3>已有结局记录</h3>
                    <table className="pli-table">
                      <thead>
                        <tr>
                          <th>结局</th>
                          <th>备注</th>
                          <th>记录时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sel.outcomes.map((o, i) => (
                          <tr key={`${o.recorded_at}-${i}`}>
                            <td><span className={`badge status-${o.outcome}`}>{o.outcome}</span></td>
                            <td>{o.notes || "—"}</td>
                            <td>{fmtTime(o.recorded_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p className="muted" style={{ marginBottom: 0 }}>暂无结局记录。</p>
                )}
              </>
            )}
          </State>
        )}
      </State>
    </div>
  );
}
