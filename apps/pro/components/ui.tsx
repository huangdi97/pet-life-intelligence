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
        {error ?? "服务暂时不可用，请稍后重试。"}
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

/** 溯源徽章：AI 派生与真实记录视觉区分（badge class + CSS 非颜色线索）。 */
export function ProvenanceBadge({ level }: { level: string }) {
  const isAi = level.startsWith("AI");
  return (
    <span className={`badge ${level}${isAi ? " badge-ai" : ""}`}>
      {isAi ? `AI · ${level}` : level}
    </span>
  );
}

/** 风险分级徽章：仅展示后端 Red Flag Rule Engine 的分级结果，前端不产生分级。 */
export function TriageBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge">未分级</span>;
  return <span className={`badge ${level}`}>{level}</span>;
}

/** 写操作失败提示（非 emergency 视觉，避免误当医疗紧急情况）。 */
export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="alert warn">操作未完成：{message}</div>;
}
