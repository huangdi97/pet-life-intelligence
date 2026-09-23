"use client";

import type { LifeEvent } from "@pli/api-client";
import { InteractionCard } from "@pli/ui-kit";
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
    <div className="card">
      <h2>{t("social.interactions")}</h2>
      <State
        state={events.state}
        error={events.error ? mapErrorMessage(events.error) : null}
        onRetry={events.reload}
        empty={t("social.noData")}
      >
        <div className="tl">
          {events.data?.events.slice(0, 8).map((e) => {
            const friendId = typeof e.payload["friend_pet_id"] === "string" ? String(e.payload["friend_pet_id"]) : "";
            const q = typeof e.payload["quality"] === "string" ? String(e.payload["quality"]) : "";
            const dur = e.payload["duration_minutes"];
            return (
              <InteractionCard
                key={e.event_id}
                title={
                  e.event_type === "social.interaction_logged"
                    ? `互动 · ${friendId ? friendName(friendId) : ""}`
                    : e.event_type === "social.friend_requested"
                      ? `认识新朋友 · ${friendId ? friendName(friendId) : ""}`
                      : t("social.block")
                }
                time={fmtTime(e.occurred_at)}
                participants={friendId ? [friendName(friendId)] : undefined}
                notes={dur ? `共同玩耍：${String(dur)} min` : undefined}
                feedback={
                  q === "BAD"
                    ? `${t("social.conflict")}：有`
                    : q
                      ? `${t("social.conflict")}：${t("social.noConflict")}`
                      : undefined
                }
              />
            );
          })}
        </div>
      </State>
    </div>
  );
}
