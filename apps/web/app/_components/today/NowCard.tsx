"use client";

import type { LifeEvent } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";

interface NowCardProps {
  lastEvent: LifeEvent | undefined;
  counts: Record<string, number>;
  labels: Record<string, string>;
}

/** OWN-001 Now — 现在怎么样（真实事实）。 */
export function NowCard({ lastEvent, counts, labels }: NowCardProps) {
  return (
    <div className="card">
      <h2>现在</h2>
      {lastEvent ? (
        <p className="sub" style={{ margin: 0 }}>
          最后活动 · {fmtTime(lastEvent.occurred_at)}（{labels[lastEvent.event_type] ?? lastEvent.event_type}）
        </p>
      ) : (
        <p className="sub" style={{ margin: 0 }}>
          今天还没有记录。
        </p>
      )}
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 6 }}>
        {Object.entries(counts).map(([et, n]) => (
          <span key={et} className="badge">
            {labels[et] ?? et} × {n}
          </span>
        ))}
      </div>
    </div>
  );
}
