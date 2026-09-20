import type { ReactNode } from "react";

export type LoadState = "loading" | "ready" | "error" | "denied";

/** Drop-in replacement for apps/web/components/ui.tsx `State`:
 *  same props signature and semantics (loading / denied / error / empty / ready). */
export function State({
  state,
  error,
  empty,
  onRetry,
  children,
}: {
  state: LoadState;
  error?: string | null;
  empty?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (state === "loading")
    return (
      <div className="pli-state pli-state--loading" role="status">
        <span className="pli-spinner" aria-hidden="true" />
        加载中……
      </div>
    );
  if (state === "denied")
    return (
      <div className="pli-state pli-state--denied" role="status">
        没有查看此内容的权限。如需访问，请联系宠物主人授权。
        {onRetry && (
          <div className="pli-state-actions">
            <button type="button" className="pli-btn" onClick={onRetry}>
              重试
            </button>
          </div>
        )}
      </div>
    );
  if (state === "error")
    return (
      <div className="pli-state pli-state--error" role="alert">
        出错了：{error ?? "未知错误"}
        {onRetry && (
          <div className="pli-state-actions">
            <button type="button" className="pli-btn" onClick={onRetry}>
              重试
            </button>
          </div>
        )}
      </div>
    );
  if (empty && !children) return <div className="pli-state">{empty}</div>;
  return <>{children}</>;
}
