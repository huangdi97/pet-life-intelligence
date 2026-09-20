import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";
import { provenanceBadgeClass } from "../lib/provenance";
import { TokenIcon, type IconName } from "./icons";

export interface TimelineItemProps {
  icon?: IconName;
  title: string;
  timestamp: string;
  actor?: string | null;
  source?: string | null;
  provenance_level?: string | null;
  summary?: string | null;
  evidence?: string[];
  outcome?: string | null;
  version?: number | null;
}

/** Timeline list item (use inside a <ul>). AI-derived provenance gets the
 *  distinct visual class "tl-item tl-ai"; real records render "tl-item".
 *  Source text stays visible — never icon-only. */
export function TimelineItem({
  icon,
  title,
  timestamp,
  actor,
  source,
  provenance_level,
  summary,
  evidence,
  outcome,
  version,
}: TimelineItemProps) {
  const isAi = typeof provenance_level === "string" && provenance_level.startsWith("AI");
  return (
    <li className={isAi ? "tl-item tl-ai" : "tl-item"}>
      <div className="tl-item-head">
        {icon ? (
          <span className="tl-item-icon" aria-hidden="true">
            <TokenIcon name={icon} size={14} />
          </span>
        ) : null}
        <span className="tl-item-title">{title}</span>
        <time className="tl-item-time" dateTime={timestamp}>
          {formatDateTime(timestamp)}
        </time>
      </div>
      {actor || source || provenance_level || typeof version === "number" ? (
        <div className="tl-item-meta">
          {actor ? <span className="tl-item-actor">{actor}</span> : null}
          {source ? <span className="tl-item-source">{source}</span> : null}
          {provenance_level ? (
            <span className={cx("pli-badge", provenanceBadgeClass(provenance_level))}>
              {provenance_level}
            </span>
          ) : null}
          {typeof version === "number" ? (
            <span className="tl-item-version">v{version}</span>
          ) : null}
        </div>
      ) : null}
      {summary ? <div className="tl-item-summary">{summary}</div> : null}
      {outcome ? <div className="tl-item-outcome">结果：{outcome}</div> : null}
      {evidence && evidence.length > 0 ? (
        <ul className="tl-item-evidence">
          {evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
