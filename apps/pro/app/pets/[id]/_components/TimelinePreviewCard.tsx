"use client";

import Link from "next/link";
import type { LifeEvent } from "@pli/api-client";
import { fmtTime, type Async } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { ProvenanceBadge, State } from "../../../../components/ui";
import type { TodayResp } from "./HealthOverviewCard";

export function TimelinePreviewCard({
  id,
  today,
  todayEvents,
}: {
  id: string;
  today: Async<TodayResp>;
  todayEvents: LifeEvent[];
}) {
  return (
    <div className="card">
      <h2>时间线 · Timeline 预览</h2>
      <State
        state={today.state}
        error={today.error ? mapErrorMessage(today.error) : null}
        onRetry={today.reload}
        empty="今天还没有记录。"
      >
        <ul className="tl">
          {todayEvents.slice(0, 8).map((e) => (
            <li key={e.event_id} className={e.provenance_level.startsWith("AI") ? "tl-ai" : ""}>
              <div className="tl-head">
                <span className="tl-type">{e.event_type}</span>
                <ProvenanceBadge level={e.provenance_level} />
                <span className="tl-time">{fmtTime(e.occurred_at)}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href={`/pets/${id}/timeline`} className="btn">
            查看完整时间线
          </Link>
        </div>
      </State>
    </div>
  );
}
