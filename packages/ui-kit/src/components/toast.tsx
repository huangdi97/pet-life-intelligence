import { cx } from "../lib/cx";
import { TokenIcon } from "./icons";

export type ToastKind = "info" | "emergency";

/** Transient toast. `emergency` uses role="alert" + assertive live region. */
export function Toast({
  message,
  visible,
  kind = "info",
  className,
}: {
  message: string;
  visible: boolean;
  kind?: ToastKind;
  className?: string;
}) {
  if (!visible) return null;
  const emergency = kind === "emergency";
  return (
    <div
      className={cx("pli-toast", emergency && "pli-toast--emergency", className)}
      role={emergency ? "alert" : "status"}
      aria-live={emergency ? "assertive" : "polite"}
    >
      <TokenIcon name={emergency ? "siren" : "info"} size={16} />
      <span>{message}</span>
    </div>
  );
}
