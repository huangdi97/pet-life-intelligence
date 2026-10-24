"use client";

import { EmptyState, MetricCard } from "@pli/ui-kit";
import { State } from "../../../components/ui";
import type { Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import type { HomeSummary } from "./types";

const KIND_LABELS: Record<string, string> = {
  feeding: "进食",
  drinking: "饮水",
  elimination: "排泄",
  activity: "活动",
  sleep: "睡眠",
};

interface TodayPanelProps {
  summary: Async<HomeSummary>;
}

/** OWN-013 Monitoring — 今天的设备记录保持低密度，作为生活证据而不是 IoT dashboard。 */
export function TodayPanel({ summary }: TodayPanelProps) {
  const counts = summary.data?.today_counts ?? {};
  return (
    <section className="v5-utility-surface" data-testid="pli.monitoring.today">
      <div className="v4-sec-head">
        <div>
          <h2>{t("monitoring.today")}</h2>
          <p className="v4-sec-sub">只汇总设备今天真实同步到的生活记录；没有数据时保持未知。</p>
        </div>
      </div>
      <State
        state={summary.state}
        error={summary.error ? mapErrorMessage(summary.error) : null}
        onRetry={summary.reload}
        empty={t("monitoring.noData")}
      >
        <div className="v5-monitoring-metrics">
          {Object.entries(counts).map(([kind, n]) => (
            <MetricCard key={kind} label={KIND_LABELS[kind] ?? "其他"} value={Number(n)} />
          ))}
        </div>
        {Object.keys(counts).length === 0 ? (
          <EmptyState title="还没有设备数据" description="设备接入并产生真实同步后，这里才会出现今天的生活汇总。" />
        ) : null}
        {summary.data?.note ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {summary.data.note}
          </p>
        ) : null}
      </State>
    </section>
  );
}
