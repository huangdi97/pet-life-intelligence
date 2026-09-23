"use client";

import Link from "next/link";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/i18n";
import { ProvenanceBadge, State } from "../../../components/ui";
import type { TodayData } from "./constants";

interface RecentCardProps {
  hasPet: boolean;
  today: Async<TodayData>;
}

/** OWN-001 最近 — Recent Events + Monitoring/Companion entry + Timeline Preview。 */
export function RecentCard({ hasPet, today }: RecentCardProps) {
  return (
    <div className="card">
      <h2>最近</h2>
      {hasPet ? (
        <State
          state={today.state}
          error={today.error ? mapErrorMessage(today.error) : null}
          onRetry={today.reload}
          empty="今天还没有记录。"
        >
          <ul className="tl">
            {today.data?.events.slice(0, 4).map((e) => (
              <li key={e.event_id}>
                <div className="tl-head">
                  <span className="tl-type">{e.event_type}</span>
                  <ProvenanceBadge level={e.provenance_level} />
                  <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      ) : (
        <div className="state">请先在顶部选择一只宠物。</div>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/monitoring" className="btn">
          看看它
        </Link>
        <Link href="/companion" className="btn">
          陪伴
        </Link>
        <Link href="/timeline" className="btn">
          查看完整时间线
        </Link>
      </div>
    </div>
  );
}
