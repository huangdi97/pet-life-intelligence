"use client";

import type { HealthEventDetail } from "@pli/api-client";

export function MedicationHistoryCard({ d }: { d: HealthEventDetail }) {
  return (
    <>
      <div className="card">
        <h2>用药 · Medication</h2>
        {d.current_meds_text ? (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.current_meds_text}</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>暂无在用药物记录。</p>
        )}
      </div>

      <div className="card">
        <h2>病史 · History</h2>
        {d.relevant_history_text ? (
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.relevant_history_text}</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>暂无相关病史记录。</p>
        )}
      </div>
    </>
  );
}
