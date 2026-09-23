"use client";

import type { LifeEvent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";

interface LastSeenPanelProps {
  recent: Async<{ events: LifeEvent[] }>;
}

/** OWN-013 Monitoring — 最近看到卡片。 */
export function LastSeenPanel({ recent }: LastSeenPanelProps) {
  return (
    <div className="card">
      <h2>{t("monitoring.lastSeen")}</h2>
      <State
        state={recent.state}
        error={recent.error ? mapErrorMessage(recent.error) : null}
        onRetry={recent.reload}
        empty={t("monitoring.noData")}
      >
        {recent.data?.events?.[0] ? (
          <p className="sub" style={{ margin: 0 }}>
            {fmtTime(recent.data.events[0].occurred_at)} · {recent.data.events[0].event_type}
          </p>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            {t("monitoring.noData")}
          </p>
        )}
      </State>
    </div>
  );
}
