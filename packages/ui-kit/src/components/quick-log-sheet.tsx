import type { ReactNode } from "react";
import { Sheet } from "./sheet";

export interface QuickLogType {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
}

/** Quick log bottom sheet: grid of configured log types, loading state while writing. */
export function QuickLogSheet({
  open,
  onClose,
  types,
  onQuickLog,
  loading = false,
  title = "快速记录",
  hint,
}: {
  open: boolean;
  onClose: () => void;
  types: QuickLogType[];
  onQuickLog: (type: string) => void;
  loading?: boolean;
  title?: string;
  hint?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {hint ? <p className="pli-quicklog-hint">{hint}</p> : null}
      {types.length === 0 ? (
        <div className="pli-empty" role="status">
          <div className="pli-empty-title">暂无可用的记录类型</div>
          <div className="pli-empty-desc">可记录的类型由当前页面配置。</div>
        </div>
      ) : (
        <div className="pli-quicklog-grid">
          {types.map((t) => (
            <button
              key={t.type}
              type="button"
              className="pli-quicklog-btn"
              disabled={loading}
              onClick={() => onQuickLog(t.type)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="pli-state pli-state--loading" role="status">
          <span className="pli-spinner" aria-hidden="true" />
          记录中……
        </div>
      ) : null}
    </Sheet>
  );
}
