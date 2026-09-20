import { cx } from "../lib/cx";

/** Loading skeleton. `line` renders text-shaped bars, `card` a block. */
export function Skeleton({
  variant = "line",
  lines = 1,
  className,
}: {
  variant?: "line" | "card";
  lines?: number;
  className?: string;
}) {
  const count = Math.max(1, lines);
  return (
    <div
      className={cx("pli-skeleton", className)}
      role="status"
      aria-label="内容加载中"
      aria-busy="true"
    >
      {variant === "card" ? (
        <div className="pli-skeleton-card" />
      ) : (
        Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="pli-skeleton-line"
            style={count > 1 && i === count - 1 ? { width: "55%" } : undefined}
          />
        ))
      )}
    </div>
  );
}
