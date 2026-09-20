import { cx } from "../lib/cx";
import { TokenIcon } from "./icons";

/** Emergency action card. Prominent by design — never buried:
 *  role="alert", strong border, call-emergency hint always visible. */
export function EmergencyAction({
  instructions,
  contactHint,
  onCall,
  className,
}: {
  instructions: string;
  contactHint?: string | null;
  onCall?: () => void;
  className?: string;
}) {
  return (
    <div className={cx("pli-emergency-action", className)} role="alert">
      <div className="pli-emergency-action-head">
        <span className="pli-emergency-action-icon" aria-hidden="true">
          <TokenIcon name="siren" size={18} />
        </span>
        <span className="pli-emergency-action-title">紧急情况</span>
      </div>
      <p className="pli-emergency-action-text">{instructions}</p>
      <div className="pli-emergency-action-contact">
        {contactHint ??
          "请立即联系兽医或前往最近的宠物急诊；如无法联系，请拨打当地24小时宠物急诊电话。"}
      </div>
      {onCall ? (
        <button type="button" className="pli-btn pli-btn--danger" onClick={onCall}>
          <TokenIcon name="phone" size={14} />
          拨打紧急电话
        </button>
      ) : null}
    </div>
  );
}
