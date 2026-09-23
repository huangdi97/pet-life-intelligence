"use client";

import Link from "next/link";
import type { BehaviorEvent } from "@pli/api-client";
import { fmtTime, type Async } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { State } from "../../../../components/ui";

export function BehaviorOverviewCard({
  id,
  behaviorEvents,
  beRows,
}: {
  id: string;
  behaviorEvents: Async<BehaviorEvent[]>;
  beRows: BehaviorEvent[];
}) {
  return (
    <div className="card">
      <h2>行为概览 · Behavior Overview</h2>
      <State
        state={behaviorEvents.state}
        error={behaviorEvents.error ? mapErrorMessage(behaviorEvents.error) : null}
        onRetry={behaviorEvents.reload}
        empty="暂无行为记录。"
      >
        {beRows.slice(0, 3).map((b) => (
          <div key={b.behavior_event_id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="badge">{fmtTime(b.occurred_at)}</span>
              {b.intensity && <span className="badge">强度 {b.intensity}</span>}
            </div>
            <div className="abc">
              <div className="abc-col">
                <div className="abc-head">发生前 Antecedent</div>
                <div>{b.antecedent || "—"}</div>
              </div>
              <div className="abc-col">
                <div className="abc-head">行为 Behavior</div>
                <div>{b.behavior}</div>
              </div>
              <div className="abc-col">
                <div className="abc-head">之后 Consequence</div>
                <div>{b.consequence || "—"}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <Link href={`/pets/${id}/timeline`} className="btn">
            查看全部行为时间线
          </Link>
        </div>
      </State>
    </div>
  );
}
