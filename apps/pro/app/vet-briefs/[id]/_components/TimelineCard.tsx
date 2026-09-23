"use client";

import Link from "next/link";
import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../../lib/hooks";

/** 相关时间线：起病 + 观察记录时间点（来自健康事件详情，真实数据，不虚构）。 */
function relevantTimes(d: HealthEventDetail): Array<{ label: string; at: string }> {
  const out: Array<{ label: string; at: string }> = [];
  if (d.onset_at) out.push({ label: "起病 Onset", at: d.onset_at });
  for (const o of d.observations.slice(0, 12)) {
    out.push({ label: o.kind === "AI_OBSERVATION" ? "AI 观察" : "观察记录", at: o.created_at });
  }
  return out;
}

export function TimelineCard({ d }: { d: HealthEventDetail }) {
  return (
    <div className="card">
      <h2>相关时间线 · Relevant Timeline</h2>
      <ul className="tl">
        {d.onset_at && (
          <li>
            <div className="tl-head">
              <span className="tl-type">起病</span>
              <span className="tl-time">{fmtTime(d.onset_at)}</span>
            </div>
          </li>
        )}
        {relevantTimes(d).map((t) => (
          <li key={`${t.label}-${t.at}`}>
            <div className="tl-head">
              <span className="tl-type">{t.label}</span>
              <span className="tl-time">{fmtTime(t.at)}</span>
            </div>
          </li>
        ))}
      </ul>
      {d.pet_id && (
        <div className="row no-print" style={{ marginTop: 8 }}>
          <Link href={`/pets/${d.pet_id}/timeline`} className="btn">
            打开完整时间线
          </Link>
        </div>
      )}
    </div>
  );
}
