import { cx } from "../lib/cx";
import { CitationChip } from "./citation-chip";

export interface AISource {
  label: string;
  event_id?: string;
}

/** AI answer block. Facts / inference / clickable citation chips / uncertainty
 *  (always rendered when present) / optional action. Always carries the
 *  "AI 生成" badge — AI output is never presented as a fact source itself. */
export function AIAnswer({
  facts,
  inference,
  sources,
  uncertainty,
  action,
  onCitation,
  title,
  className,
}: {
  facts?: string[];
  inference?: string | null;
  sources?: AISource[];
  uncertainty?: string | null;
  action?: string | null;
  onCitation?: (eventId?: string) => void;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cx("pli-ai-answer", className)}>
      <div className="pli-ai-answer-head">
        <span className="pli-badge pli-badge--ai">AI 生成</span>
        {title ? <span className="pli-ai-answer-title">{title}</span> : null}
      </div>
      {facts && facts.length > 0 ? (
        <ul className="pli-ai-facts">
          {facts.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : null}
      {inference ? <p className="pli-ai-inference">{inference}</p> : null}
      {uncertainty ? (
        <div className="pli-ai-uncertainty pli-notice" role="note">
          不确定性：{uncertainty}
        </div>
      ) : null}
      {sources && sources.length > 0 ? (
        <div className="pli-ai-citations">
          <span className="pli-ai-citations-label">来源</span>
          {sources.map((s, i) => (
            <CitationChip
              key={`${s.event_id ?? s.label}-${i}`}
              label={s.label}
              eventId={s.event_id}
              onClick={onCitation}
            />
          ))}
        </div>
      ) : null}
      {action ? <div className="pli-ai-action">建议：{action}</div> : null}
    </div>
  );
}
