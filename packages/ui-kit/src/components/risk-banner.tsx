import { cx } from "../lib/cx";
import { TokenIcon, type IconName } from "./icons";

export type RiskLevel = "NORMAL" | "NOTICE" | "MONITOR" | "VET_SOON" | "URGENT" | "EMERGENCY";

/** Presentation labels; mirrors tokens.risk_status (color/icon stay in tokens.css). */
const RISK_META: Record<RiskLevel, { label: string; label_en: string; icon: IconName }> = {
  NORMAL: { label: "正常", label_en: "Normal", icon: "circle" },
  NOTICE: { label: "注意", label_en: "Notice", icon: "info" },
  MONITOR: { label: "观察", label_en: "Monitor", icon: "eye" },
  VET_SOON: { label: "建议就医", label_en: "Vet Soon", icon: "clock" },
  URGENT: { label: "紧急", label_en: "Urgent", icon: "alert-triangle" },
  EMERGENCY: { label: "危及生命", label_en: "Emergency", icon: "siren" },
};

/** Risk banner. Level maps to Chinese label + secondary English + color class
 *  (pli-risk-*, defined in @pli/ui-tokens/css). Never color-only: icon + label
 *  text are always rendered. URGENT/EMERGENCY use role="alert". */
export function RiskBanner({
  level,
  reasons,
  next_action,
  className,
}: {
  level: RiskLevel;
  reasons?: string[];
  next_action?: string | null;
  className?: string;
}) {
  const meta = RISK_META[level];
  const severe = level === "URGENT" || level === "EMERGENCY";
  return (
    <div
      className={cx(
        "pli-risk-banner",
        `pli-risk-${level.toLowerCase()}`,
        severe && "pli-risk-banner--severe",
        className,
      )}
      role={severe ? "alert" : "status"}
    >
      <div className="pli-risk-banner-head">
        <span className="pli-risk-banner-icon" aria-hidden="true">
          <TokenIcon name={meta.icon} size={18} />
        </span>
        <span className="pli-risk-banner-label">{meta.label}</span>
        <span className="pli-risk-banner-label-en">{meta.label_en}</span>
      </div>
      {reasons && reasons.length > 0 ? (
        <ul className="pli-risk-reasons">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {next_action ? <div className="pli-risk-next">建议下一步：{next_action}</div> : null}
    </div>
  );
}
