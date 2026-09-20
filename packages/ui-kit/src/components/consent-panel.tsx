import { cx } from "../lib/cx";

export interface ConsentItem {
  purpose: string;
  granted: boolean;
  description?: string;
}

/** Consent panel: purpose list with granted state and onChange. */
export function ConsentPanel({
  purposes,
  onChange,
  disabled = false,
  title,
  className,
}: {
  purposes: ConsentItem[];
  onChange?: (purpose: string, granted: boolean) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cx("pli-consent", className)}
      role="group"
      aria-label={title ?? "隐私授权"}
    >
      {title ? <div className="pli-consent-title">{title}</div> : null}
      {purposes.map((p) => (
        <label key={p.purpose} className="pli-consent-row">
          <input
            type="checkbox"
            checked={p.granted}
            disabled={disabled}
            onChange={(e) => onChange?.(p.purpose, e.target.checked)}
          />
          <span className="pli-consent-body">
            <span className="pli-consent-purpose">{p.purpose}</span>
            {p.description ? <span className="pli-consent-desc">{p.description}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
