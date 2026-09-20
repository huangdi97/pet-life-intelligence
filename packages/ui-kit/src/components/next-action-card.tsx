import { cx } from "../lib/cx";

/** "What can I do" action card: action text + optional CTA. */
export function NextActionCard({
  action,
  ctaLabel = "去处理",
  onCta,
  title,
  className,
}: {
  action: string;
  ctaLabel?: string;
  onCta?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cx("pli-card", "pli-next-action", className)}>
      {title ? <div className="pli-next-action-title">{title}</div> : null}
      <p className="pli-next-action-text">{action}</p>
      {onCta ? (
        <button type="button" className="pli-btn pli-btn--primary" onClick={onCta}>
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}
