import { cx } from "../lib/cx";

export type TrendDirection = "up" | "down" | "flat";

const DIR_LABEL: Record<TrendDirection, string> = {
  up: "上升",
  down: "下降",
  flat: "平稳",
};

/** Trend summary. Uncertainty is always emphasized: direction is a reading of
 *  historical records, never a prediction of outcome. */
export function TrendCard({
  label,
  direction,
  summary,
  evidence,
  className,
}: {
  label: string;
  direction?: TrendDirection | null;
  summary?: string | null;
  evidence?: string | null;
  className?: string;
}) {
  const dir: TrendDirection = direction ?? "flat";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return (
    <div className={cx("pli-card", "pli-trend-card", `pli-trend-card--${dir}`, className)}>
      <div className="pli-trend-head">
        <span className="pli-trend-label">{label}</span>
        <span className="pli-trend-dir" aria-label={`趋势：${DIR_LABEL[dir]}`}>
          {arrow} {DIR_LABEL[dir]}
        </span>
      </div>
      {summary ? <p className="pli-trend-summary">{summary}</p> : null}
      <div className="pli-uncertainty-note" role="note">
        趋势判断基于历史记录，存在不确定性，仅供参考，请结合实际情况判断。
      </div>
      {evidence ? <div className="pli-evidence-note">依据：{evidence}</div> : null}
    </div>
  );
}
