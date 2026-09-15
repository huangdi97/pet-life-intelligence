"use client";

import type { ReactNode } from "react";
import type { LoadState } from "../lib/useAsync";

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
  if (state === "loading") return <div className="state">加载中……</div>;
  if (state === "denied")
    return (
      <div className="state">
        没有查看此内容的权限。
        {onRetry && (
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={onRetry}>重试</button>
          </div>
        )}
      </div>
    );
  if (state === "error")
    return (
      <div className="state error">
        出错了：{error ?? "未知错误"}
        {onRetry && (
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={onRetry}>重试</button>
          </div>
        )}
      </div>
    );
  if (empty && !children) return <div className="state">{empty}</div>;
  return <>{children}</>;
}