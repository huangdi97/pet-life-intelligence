import { cx } from "../lib/cx";

/** Error state in human language — never raw error codes. */
export function ErrorState({
  title = "出错了，请稍后再试",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cx("pli-state", "pli-state--error", className)} role="alert">
      <div className="pli-state-title">{title}</div>
      {description ? <div className="pli-state-desc">{description}</div> : null}
      {onRetry && (
        <div className="pli-state-actions">
          <button type="button" className="pli-btn" onClick={onRetry}>
            重试
          </button>
        </div>
      )}
    </div>
  );
}
