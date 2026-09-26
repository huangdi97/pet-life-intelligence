"use client";

import type { LifeEvent } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";
import { EVENT_LABELS } from "./constants";

interface NowCardProps {
  lastEvent: LifeEvent | undefined;
  counts: Record<string, number>;
}

/** OWN-001 Now — 此刻（真实事实，不编造）。 */
export function NowCard({ lastEvent, counts }: NowCardProps) {
  const entries = Object.entries(counts);
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">此刻</h2>
        {lastEvent && (
          <span className="v4-chip">
            <span className="v4-chip-icon">最近记录 {fmtTime(lastEvent.occurred_at)}</span>
          </span>
        )}
      </div>
      {entries.length > 0 ? (
        <div className="v4-metrics">
          {entries.map(([et, n]) => (
            <div key={et} className="v4-metric">
              <span className="v4-metric-value">{n}</span>
              <span className="v4-metric-label">{EVENT_LABELS[et] ?? et}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="v4-sec-sub" style={{ marginTop: 0 }}>
          今天还没有足够记录。记录第一条喂食、饮水或散步后会出现在这里。
        </p>
      )}
    </div>
  );
}
