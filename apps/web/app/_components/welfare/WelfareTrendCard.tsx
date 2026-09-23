"use client";

import type { LifeEvent } from "@pli/api-client";
import { EmptyState, TrendCard } from "@pli/ui-kit";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { ProvenanceBadge, State } from "../../../components/ui";
import { KIND_LABELS } from "./constants";

interface WelfareTrendCardProps {
  events: Async<{ events: LifeEvent[] }>;
  welfareEvents: LifeEvent[];
}

/** OWN-011 趋势（基于福祉相关日常事件频次，非医疗结论）。 */
export function WelfareTrendCard({ events, welfareEvents }: WelfareTrendCardProps) {
  return (
    <div className="card">
      <h2>{t("welfare.trend")}</h2>
      <State
        state={events.state}
        error={events.error ? mapErrorMessage(events.error) : null}
        onRetry={events.reload}
        empty={t("welfare.noData")}
      >
        {welfareEvents.length === 0 ? (
          <EmptyState title="还没有福祉记录" description="记录观察后，这里会显示基于事件频次的趋势。" />
        ) : (
          <>
            <TrendCard
              label={t("welfare.trend")}
              summary={`近 ${Math.min(welfareEvents.length, 10)} 条福祉相关记录 · 与自己近期范围对比`}
              evidence={welfareEvents
                .slice(0, 4)
                .map((e) => `${KIND_LABELS[e.event_type] ?? e.event_type} · ${fmtTime(e.occurred_at)}`)
                .join("；")}
            />
            <ul className="tl">
              {welfareEvents.slice(0, 10).map((e) => (
                <li key={e.event_id}>
                  <div className="tl-head">
                    <span className="tl-type">{KIND_LABELS[e.event_type] ?? e.event_type}</span>
                    <ProvenanceBadge level={e.provenance_level} />
                    <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                  </div>
                  <div className="tl-body">
                    {Object.entries(e.payload)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted">
              趋势基于事件频次与自己的历史范围；{t("welfare.uncertainty")}；不是医疗结论。
            </p>
          </>
        )}
      </State>
    </div>
  );
}
