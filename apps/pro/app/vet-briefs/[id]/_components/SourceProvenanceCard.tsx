"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { STATUS_LABELS } from "./ComplaintCard";

export function SourceProvenanceCard({ d }: { d: HealthEventDetail }) {
  return (
    <div className="card">
      <h2>来源与溯源 · Source & Provenance</h2>
      <table className="pli-table">
        <tbody>
          <tr>
            <th>健康事件 ID</th>
            <td>{d.health_event_id}</td>
          </tr>
          <tr>
            <th>事件状态</th>
            <td><span className={`badge status-${d.status}`}>{STATUS_LABELS[d.status] ?? d.status}</span></td>
          </tr>
          <tr>
            <th>主人备注</th>
            <td>{d.owner_notes || "—"}</td>
          </tr>
          <tr>
            <th>已生成 Vet Brief</th>
            <td>
              {d.vet_briefs.length > 0 ? (
                <span className="badge">{d.vet_briefs.length} 份（{d.vet_briefs.join("、")}）</span>
              ) : (
                <span className="muted">暂无（生成入口在健康全流程，web 端）</span>
              )}
            </td>
          </tr>
          <tr>
            <th>分级引擎</th>
            <td>{d.triage_history.length ? `${d.triage_history[d.triage_history.length - 1].engine}${d.triage_history[d.triage_history.length - 1].version ? ` · ${d.triage_history[d.triage_history.length - 1].version}` : ""}` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
        所有记录带 pet / actor / time / source；AI 输出与真实记录在时间线中视觉区分。
      </p>
    </div>
  );
}
