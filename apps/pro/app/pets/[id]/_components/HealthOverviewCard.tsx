"use client";

import Link from "next/link";
import type { LifeEvent } from "@pli/api-client";
import { fmtTime, type Async } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { State, TriageBadge } from "../../../../components/ui";

export interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface TodayResp {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

export function HealthOverviewCard({
  id,
  today,
  healthEvents,
  heRows,
}: {
  id: string;
  today: Async<TodayResp>;
  healthEvents: Async<HealthEventRow[]>;
  heRows: HealthEventRow[];
}) {
  return (
    <div className="card">
      <h2>健康概览 · Health Overview</h2>
      <p className="sub" style={{ margin: "0 0 8px" }}>
        今日（{today.data?.date ?? "—"}）：
        {Object.entries(today.data?.event_counts ?? {}).map(([k, n]) => `${k} × ${n}`).join(" · ") || "今天还没有记录"}
      </p>
      <State
        state={healthEvents.state}
        error={healthEvents.error ? mapErrorMessage(healthEvents.error) : null}
        onRetry={healthEvents.reload}
        empty="暂无健康事件。"
      >
        <table className="pli-table">
          <thead>
            <tr>
              <th>主诉</th>
              <th>状态</th>
              <th>风险分级</th>
              <th>打开时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {heRows.slice(0, 8).map((h) => (
              <tr key={h.health_event_id}>
                <td>{h.chief_complaint}</td>
                <td><span className={`badge status-${h.status}`}>{STATUS_LABELS[h.status] ?? h.status}</span></td>
                <td><TriageBadge level={h.latest_triage_level} /></td>
                <td>{fmtTime(h.opened_at)}</td>
                <td>
                  <Link href={`/vet-briefs/${h.health_event_id}`} className="btn" style={{ minHeight: 32, fontSize: 13 }}>
                    就诊摘要
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </State>
      <div className="row" style={{ marginTop: 10 }}>
        <Link href={`/pets/${id}/outcome`} className="btn primary">
          记录结局 · Outcome
        </Link>
        <Link href={`/pets/${id}/timeline`} className="btn">
          完整时间线
        </Link>
      </div>
    </div>
  );
}
