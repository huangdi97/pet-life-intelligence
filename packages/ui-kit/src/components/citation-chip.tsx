import { cx } from "../lib/cx";

/** Citation chip. Clickable (button) when `onClick` is provided; static span otherwise. */
export function CitationChip({
  label,
  eventId,
  onClick,
  className,
}: {
  label: string;
  eventId?: string;
  onClick?: (eventId?: string) => void;
  className?: string;
}) {
  if (!onClick) {
    return <span className={cx("pli-chip", "pli-chip--static", className)}>{label}</span>;
  }
  return (
    <button type="button" className={cx("pli-chip", className)} onClick={() => onClick(eventId)}>
      {label}
    </button>
  );
}
