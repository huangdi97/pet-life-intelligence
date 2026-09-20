import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { TokenIcon } from "./icons";

/** Bottom sheet. aria-modal dialog pinned to the viewport bottom. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="pli-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={cx("pli-sheet", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pli-sheet-head">
          <div className="pli-sheet-title">{title}</div>
          <button type="button" className="pli-close" onClick={onClose} aria-label="关闭">
            <TokenIcon name="x" size={16} />
          </button>
        </div>
        <div className="pli-sheet-body">{children}</div>
        {footer ? <div className="pli-sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
