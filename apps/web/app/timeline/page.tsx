"use client";

import { useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ProvenanceBadge, State } from "../../components/ui";

/** Surfaces 4 + PLI-185/186: unified timeline with event-type filters,
 *  provenance/actor display, superseded/retracted states. */
export default function TimelinePage() {
  const { petId } = useCurrentPet();
  const [filter, setFilter] = useState("");
  const timeline = useAsync<{ events: LifeEvent[]; count: number }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=100${filter ? `&event_type=${filter}` : ""}`,
          )
        : Promise.reject(new Error("no pet")),
    [petId, filter],
  );

  const FILTERS = [
    "", "daily.meal", "daily.drink", "daily.elimination", "daily.walk",
    "daily.play", "daily.weight", "care.task_completed", "care.task_conflict",
    "care.handoff_started", "behavior.observed", "health.event_opened",
    "health.triage_assigned", "health.red_flag", "health.outcome_recorded",
    "medication.plan_created", "medication.administered", "medication.missed",
  ];

  return (
    <main>
      <h1>生命时间线</h1>
      <p className="sub">同一宠物 ID 下带来源的连续事件（PLI-185/186）。点开任何记录都能看到“谁记录的、来源是什么”。</p>
      <div className="row" style={{ marginBottom: 8 }}>
        <select
          style={{ maxWidth: 260 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="按事件类型过滤"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "" ? "全部事件" : f}
            </option>
          ))}
        </select>
        <button className="btn" onClick={timeline.reload}>
          刷新
        </button>
      </div>
      <State
        state={timeline.state}
        error={timeline.error}
        onRetry={timeline.reload}
        empty="暂无事件。去 Today 快速记录一条吧。"
      >
        <ul className="tl">
          {timeline.data?.events.map((e) => (
            <li key={e.event_id} className={e.retracted_at ? "retracted" : ""}>
              <div className="tl-head">
                <span className="tl-type">{e.event_type}</span>
                <ProvenanceBadge level={e.provenance_level} />
                <span className="badge">{e.actor_name ?? e.actor_id}</span>
                {e.retracted_at && <span className="badge EMERGENCY">已撤回</span>}
                {e.supersedes_event_id && <span className="badge">修订版本</span>}
                <span className="tl-time">{fmtTime(e.occurred_at)}</span>
              </div>
              <div className="tl-body">
                {e.source_ref && <div className="muted">source: {e.source_ref}</div>}
                {Object.keys(e.payload).length > 0 && (
                  <div>
                    {Object.entries(e.payload)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </State>
    </main>
  );
}
