"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../../lib/hooks";

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

export function ComplaintCard({ d }: { d: HealthEventDetail }) {
  return (
    <>
      <div className="card">
        <h2>主诉 · Chief Complaint</h2>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.chief_complaint || "—"}</p>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <span className={`badge status-${d.status}`}>状态：{STATUS_LABELS[d.status] ?? d.status}</span>
          {d.onset_at && <span className="badge">起病时间：{fmtTime(d.onset_at)}</span>}
        </div>
      </div>

      <div className="card">
        <h2>起病 · Onset</h2>
        {d.onset_at ? (
          <p className="muted" style={{ margin: 0 }}>起病于 {fmtTime(d.onset_at)}。</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>暂未记录起病时间。</p>
        )}
      </div>
    </>
  );
}
