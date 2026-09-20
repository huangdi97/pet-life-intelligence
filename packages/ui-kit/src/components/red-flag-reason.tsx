export interface RedFlagReasonItem {
  rule_id: string;
  reason: string;
}

/** Red Flag Rule Engine output list (rule_id + reason). Display only —
 *  rule provenance stays traceable, never silently rewritten. */
export function RedFlagReason({
  reasons,
  title,
  emptyText,
  className,
}: {
  reasons: RedFlagReasonItem[];
  title?: string;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {title ? <div className="pli-redflag-title">{title}</div> : null}
      {reasons.length === 0 ? (
        <div className="pli-redflag-empty" role="status">
          {emptyText ?? "未触发红旗规则。"}
        </div>
      ) : (
        <ul className="pli-redflag-list">
          {reasons.map((r) => (
            <li key={r.rule_id}>
              <span className="pli-redflag-rule">{r.rule_id}</span>
              <span className="pli-redflag-text">{r.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
