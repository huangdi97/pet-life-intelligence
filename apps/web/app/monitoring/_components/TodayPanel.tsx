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

/** OWN-013 Monitoring — 今天（设备事件汇总）卡片。 */
export function TodayPanel({ summary }: TodayPanelProps) {
  const counts = summary.data?.today_counts ?? {};
  return (
    <div className="card">
      <h2>{t("monitoring.today")}</h2>
      <State
        state={summary.state}
        error={summary.error ? mapErrorMessage(summary.error) : null}
        onRetry={summary.reload}
        empty={t("monitoring.noData")}
      >
        {Object.entries(counts).map(([kind, n]) => (
          <MetricCard key={kind} label={KIND_LABELS[kind] ?? kind} value={Number(n)} />
        ))}
        {Object.keys(counts).length === 0 && (
          <EmptyState title="还没有设备数据" description="设备接入后，这里会显示今天的进食/饮水/排泄/活动/睡眠汇总。" />
        )}
        {summary.data?.note && (
          <p className="muted" style={{ marginTop: 8 }}>
            {summary.data.note}
          </p>
        )}
      </State>
    </div>
  );
}
