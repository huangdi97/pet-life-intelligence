import { EmptyState } from "./empty-state";
import { formatDateTime } from "../lib/format";

export interface EvidenceItem {
  id: string;
  kind: string;
  text: string;
  created_at: string;
}

/** Evidence list with explicit empty state. */
export function EvidenceList({
  items,
  title,
  emptyText,
  className,
}: {
  items: EvidenceItem[];
  title?: string;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {title ? <div className="pli-evidence-list-title">{title}</div> : null}
      {items.length === 0 ? (
        <EmptyState
          title={emptyText ?? "暂无证据记录"}
          description="上传照片或补充记录后，这里会显示相关证据。"
        />
      ) : (
        <ul className="pli-evidence-items">
          {items.map((item) => (
            <li key={item.id} className="pli-evidence-item">
              <div className="pli-evidence-item-head">
                <span className="pli-badge">{item.kind}</span>
                <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
              </div>
              <div className="pli-evidence-item-text">{item.text}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

