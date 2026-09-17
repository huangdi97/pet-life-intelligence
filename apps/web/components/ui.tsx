"use client";

import type { ReactNode } from "react";
import type { LoadState } from "../lib/hooks";

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
      <div className="state loading" role="status">
        加载中……
      </div>
    );
  if (state === "denied")
    return (
      <div className="state denied">
        没有查看此内容的权限。如需访问，请联系宠物主人授权。
        {onRetry && (
          <div style={{ marginTop: 10 }}>
            <button className="btn" onClick={onRetry}>
              重试
            </button>
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
            <button className="btn" onClick={onRetry}>
              重试
            </button>
          </div>
        )}
      </div>
    );
  if (empty && !children) return <div className="state">{empty}</div>;
  return <>{children}</>;
}

export function ProvenanceBadge({ level }: { level: string }) {
  return <span className={`badge ${level}`}>{level}</span>;
}

export function TriageBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge">未分级</span>;
  return <span className={`badge ${level}`}>{level}</span>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert emergency">操作失败：{message}</div>;
}
