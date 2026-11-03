"use client";

import type { LifeEvent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";

interface LastSeenPanelProps {
  recent: Async<{ events: LifeEvent[] }>;
}

const EVENT_LABELS: Record<string, string> = {
  "daily.meal": "进食记录",
  "daily.drink": "饮水记录",
  "daily.walk": "散步记录",
  "daily.play": "玩耍记录",
  "daily.weight": "体重记录",
  "daily.sleep": "睡眠记录",
  "behavior.observed": "行为观察",
  "training.session_logged": "训练记录",
  "health.event_opened": "健康记录",
  "social.interaction_logged": "互动记录",
  "welfare.observation_recorded": "生活质量观察",
};

function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? "生活记录";
}

/** OWN-013 Monitoring — 最近看到使用 owner-safe 文案，不暴露原始事件枚举。 */
export function LastSeenPanel({ recent }: LastSeenPanelProps) {
  const latest = recent.data?.events?.find((event) => event.event_type !== "today.viewed");

  return (
    <section className="v5-utility-surface" data-testid="pli.monitoring.last-seen">
      <div className="v4-sec-head">
        <div>
          <h2>{t("monitoring.lastSeen")}</h2>
          <p className="v4-sec-sub">最近一次真实记录，帮助你从生活上下文理解设备状态。</p>
        </div>
      </div>
      <State
        state={recent.state}
        error={recent.error ? mapErrorMessage(recent.error) : null}
        onRetry={recent.reload}
        empty={t("monitoring.noData")}
      >
        {latest ? (
          <div className="v5-last-seen">
            <strong>{eventLabel(latest.event_type)}</strong>
            <span>{fmtTime(latest.occurred_at)}</span>
          </div>
        ) : (
          <div className="v4-calm">
            <div>
              <p className="v4-calm-title">还没有可展示的最近记录</p>
              <p className="v4-calm-body">继续记录日常，最近看到会从真实生活记录中更新。</p>
            </div>
          </div>
        )}
      </State>
    </section>
  );
}
