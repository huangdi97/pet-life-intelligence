import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";
import { PersonChip } from "./person-chip";

/** Social interaction record card: title / time / participants / notes / feedback. */
export function InteractionCard({
  title,
  time,
  participants,
  notes,
  feedback,
  className,
}: {
  title: string;
  time?: string | null;
  participants?: string[];
  notes?: string | null;
  feedback?: string | null;
  className?: string;
}) {
  return (
    <div className={cx("pli-card", "pli-interaction-card", className)}>
      <div className="pli-interaction-head">
        <span className="pli-interaction-title">{title}</span>
        {time ? (
          <time className="pli-interaction-time" dateTime={time}>
            {formatDateTime(time)}
          </time>
        ) : null}
      </div>
      {participants && participants.length > 0 ? (
        <div className="pli-interaction-participants">
          {participants.map((p) => (
            <PersonChip key={p} name={p} />
          ))}
        </div>
      ) : null}
      {notes ? (
        <div className="pli-interaction-notes">
          <span className="pli-interaction-label">记录</span>
          {notes}
        </div>
      ) : null}
      {feedback ? (
        <div className="pli-interaction-feedback">
          <span className="pli-interaction-label">反馈</span>
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
