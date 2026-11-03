"use client";

import type { LifeEvent } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";
import { EVENT_LABELS } from "./constants";

interface NowCardProps {
  lastEvent: LifeEvent | undefined;
  counts: Record<string, number>;
}

/** OWN-001 Now — factual, one-dimensional life summary; never a dashboard grid. */
export function NowCard({ lastEvent, counts }: NowCardProps) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const lastLabel = lastEvent ? EVENT_LABELS[lastEvent.event_type] ?? "生活记录" : null;

  return (
    <section className="v4-sec" data-pli-type="section" data-testid="pli.today.now">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title v4-sec-title--accent">此刻</h2>
      </div>
      {lastEvent ? (
        <div className="v5-observation-list">
          <div className="v5-observation-row">
            <span className="v5-observation-label">最近发生</span>
            <span className="v5-observation-value">
              {lastLabel} · {fmtTime(lastEvent.occurred_at)}
            </span>
          </div>
          <div className="v5-observation-row">
            <span className="v5-observation-label">今天已记录</span>
            <span className="v5-observation-value">{total} 件生活片段</span>
          </div>
        </div>
      ) : (
        <p className="v4-sec-sub" style={{ marginTop: 0 }}>
          今天还没有新的生活记录。第一次喂食、饮水或散步会从这里开始。
        </p>
      )}
    </section>
  );
}
