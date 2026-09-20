import { useState } from "react";
import { cx } from "../lib/cx";
import { TokenIcon, type IconName } from "./icons";

const DEFAULT_PROTOTYPE_NOTICE =
  "此能力为前端原型（PROTOTYPE），尚未接入真实设备；操作不会产生真实效果，也不会伪装成功。";

/** Companion enrichment control. When prototype=true renders a "PROTOTYPE"
 *  tag and does NOT fake success — onClick shows the prototype notice state
 *  instead of performing the action. */
export function CompanionControl({
  label,
  icon,
  disabled = false,
  prototype = false,
  onClick,
  noticeText,
  className,
}: {
  label: string;
  icon?: IconName;
  disabled?: boolean;
  prototype?: boolean;
  onClick?: () => void;
  noticeText?: string;
  className?: string;
}) {
  const [showNotice, setShowNotice] = useState(false);

  const handleClick = () => {
    if (prototype) {
      setShowNotice(true);
      return;
    }
    onClick?.();
  };

  return (
    <div className={cx("pli-companion-control", className)}>
      <button
        type="button"
        className="pli-companion-btn"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <TokenIcon name={icon ?? "paw"} size={16} />
        <span className="pli-companion-label">{label}</span>
        {prototype ? <span className="pli-tag pli-tag--prototype">PROTOTYPE</span> : null}
      </button>
      {showNotice ? (
        <div className="pli-companion-notice pli-notice" role="status">
          {noticeText ?? DEFAULT_PROTOTYPE_NOTICE}
        </div>
      ) : null}
    </div>
  );
}
