import { useEffect, useRef } from "react";
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
  children: unknown;
  footer?: unknown;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

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
        <div className="pli-sheet-body">{children as any}</div>
        {footer ? <div className="pli-sheet-foot">{footer as any}</div> : null}
      </div>
    </div>
  );
}
