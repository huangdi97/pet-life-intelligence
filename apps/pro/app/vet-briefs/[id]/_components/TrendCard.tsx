"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../../lib/hooks";

export function TrendCard({ d }: { d: HealthEventDetail }) {
  return (
    <div className="card">
      <h2>趋势 · Trend</h2>
      {d.outcomes.length > 0 ? (
        <table className="pli-table">
          <thead>
            <tr>
              <th>结局</th>
              <th>备注</th>
              <th>记录时间</th>
            </tr>
          </thead>
          <tbody>
            {d.outcomes.map((o, i) => (
              <tr key={`${o.recorded_at}-${i}`}>
                <td><span className={`badge status-${o.outcome}`}>{o.outcome}</span></td>
                <td>{o.notes || "—"}</td>
                <td>{fmtTime(o.recorded_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ margin: 0 }}>暂无结局记录；趋势需多次观察/结局后才有意义。</p>
      )}
    </div>
  );
}
