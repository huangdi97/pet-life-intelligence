import { cx } from "../lib/cx";

/** Person chip with avatar dot: name + optional role. */
export function PersonChip({
  name,
  role,
  showDot = true,
  className,
}: {
  name: string;
  role?: string;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span className={cx("pli-person-chip", className)}>
      {showDot ? <span className="pli-person-chip-dot" aria-hidden="true" /> : null}
      <span className="pli-person-chip-name">{name}</span>
      {role ? <span className="pli-person-chip-role">{role}</span> : null}
    </span>
  );
}
