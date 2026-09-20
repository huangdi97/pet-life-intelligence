import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";
import { provenanceBadgeClass } from "../lib/provenance";

export interface EventCardEvent {
  event_type: string;
  occurred_at: string;
  actor_name?: string | null;
  source_type: string;
  provenance_level: string;
  payload?: Record<string, unknown> | null;
}

function formatPayloadValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null || v === undefined) return "";
  return JSON.stringify(v);
}

/** Timeline event card: What / When / Who / Source, compact or expanded. */
export function EventCard({
  event,
  variant = "compact",
  className,
}: {
  event: EventCardEvent;
  variant?: "compact" | "expanded";
  className?: string;
}) {
  const entries = event.payload
    ? Object.entries(event.payload).filter(([, v]) => v !== null && v !== undefined)
    : [];
  return (
    <div
      className={cx(
        "pli-event-card",
        variant === "expanded" && "pli-event-card--expanded",
        className,
      )}
    >
      <div className="pli-event-card-head">
        <span className="pli-event-card-type">{event.event_type}</span>
        <time className="pli-event-card-time" dateTime={event.occurred_at}>
          {formatDateTime(event.occurred_at)}
        </time>
      </div>
      <div className="pli-event-card-meta">
        {event.actor_name ? (
          <span className="pli-event-card-actor">{event.actor_name}</span>
        ) : (
          <span className="pli-event-card-actor pli-event-card-actor--unknown">未知操作者</span>
        )}
        <span className={cx("pli-badge", provenanceBadgeClass(event.source_type))}>
          {event.source_type}
        </span>
        <span className={cx("pli-badge", provenanceBadgeClass(event.provenance_level))}>
          {event.provenance_level}
        </span>
      </div>
      {variant === "expanded" && entries.length > 0 ? (
        <dl className="pli-event-card-payload">
          {entries.map(([k, v]) => (
            <div key={k} className="pli-event-card-payload-row">
              <dt>{k}</dt>
              <dd>{formatPayloadValue(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
