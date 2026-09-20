import { cx } from "../lib/cx";

/** Compact metric: label / value / unit / optional trend note. */
export function MetricCard({
  label,
  value,
  unit,
  trend,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: string | null;
  className?: string;
}) {
  return (
    <div className={cx("pli-card", "pli-metric-card", className)}>
      <div className="pli-metric-label">{label}</div>
      <div className="pli-metric-value">
        {value}
        {unit ? <span className="pli-metric-unit">{unit}</span> : null}
      </div>
      {trend ? <div className="pli-metric-trend">{trend}</div> : null}
    </div>
  );
}
