"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../../lib/hooks";
import { ProvenanceBadge } from "../../../../components/ui";

export function EvidenceCard({ d }: { d: HealthEventDetail }) {
  return (
    <div className="card">
      <h2>证据 · Evidence</h2>
      {d.observations.length > 0 ? (
        <table className="pli-table">
          <thead>
            <tr>
              <th>来源类型</th>
              <th>观察</th>
              <th>记录时间</th>
            </tr>
          </thead>
          <tbody>
            {d.observations.map((o) => (
              <tr key={o.id}>
                <td><ProvenanceBadge level={o.kind === "AI_OBSERVATION" ? "AI_DERIVED" : o.kind === "OWNER_STATEMENT" ? "OWNER_REPORTED" : o.kind} /></td>
                <td>{o.text}</td>
                <td>{fmtTime(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ margin: 0 }}>暂无观察证据。</p>
      )}
    </div>
  );
}
