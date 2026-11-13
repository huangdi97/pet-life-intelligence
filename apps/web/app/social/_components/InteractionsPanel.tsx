"use client";

import type { LifeEvent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";

interface InteractionsPanelProps {
  events: Async<{ events: LifeEvent[] }>;
  friendName: (id: string) => string;
}

/** OWN-012 Social — 互动历史（最近 8 条）。 */
export function InteractionsPanel({ events, friendName }: InteractionsPanelProps) {
  return (
    <section className="v4-sec">
      <h2 className="v4-sec-title">{t("social.interactions")}</h2>
      <State
        state={events.state}
        error={events.error ? mapErrorMessage(events.error) : null}
        onRetry={events.reload}
        empty={t("social.noData")}
      >
        <div className="v5-interaction-list">
          {events.data?.events.slice(0, 8).map((e) => {
            const friendId = typeof e.payload["friend_pet_id"] === "string" ? String(e.payload["friend_pet_id"]) : "";
            const q = typeof e.payload["quality"] === "string" ? String(e.payload["quality"]) : "";
            const dur = e.payload["duration_minutes"];
            const qualityLabel =
              q === "GOOD" ? "相处顺利" :
              q === "NEUTRAL" ? "相处平静" :
              q === "TENSE" ? "有些紧张" :
              q === "BAD" ? "发生冲突" :
              "未记录相处状态";
            const title =
              e.event_type === "social.interaction_logged"
                ? `和${friendId ? friendName(friendId) : "伙伴"}互动`
                : e.event_type === "social.friend_requested"
                  ? `认识${friendId ? friendName(friendId) : "新伙伴"}`
                  : "关系状态有更新";
            return (
              <div className="v5-interaction-row" key={e.event_id}>
                <div className="v5-interaction-main">
                  <strong>{title}</strong>
                  <span>{qualityLabel}{dur ? ` · ${String(dur)} 分钟` : ""}</span>
                </div>
                <time className="v5-interaction-time">{fmtTime(e.occurred_at)}</time>
              </div>
            );
          })}
        </div>
      </State>
    </section>
  );
}
