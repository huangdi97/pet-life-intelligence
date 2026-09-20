import type { ReactNode } from "react";
import { cx } from "../lib/cx";

/** Empty state with illustration slot (children), title, description, action. */
export function EmptyState({
  title = "暂无内容",
  description,
  actionLabel,
  onAction,
  children,
  className,
}: {
  title?: string;
  description?: string | null;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("pli-empty", className)} role="status">
      {children ? <div className="pli-empty-art">{children}</div> : null}
      <div className="pli-empty-title">{title}</div>
      {description ? <div className="pli-empty-desc">{description}</div> : null}
      {onAction && actionLabel ? (
        <div className="pli-empty-actions">
          <button type="button" className="pli-btn" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
