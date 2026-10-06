"use client";

import type { ReactElement, ReactPortal } from "react";
import { provenanceLabel, triageLabel } from "../lib/ownerLabels";
import { mapErrorMessage } from "../lib/i18n";
import type { LoadState } from "../lib/hooks";

/**
 * Synchronous renderable node subset shared safely across the React 18/19
 * ambient boundary still present in parts of the Next.js build toolchain.
 * Owner UI state slots never accept bigint or async/promise children.
 */
type StableReactNode =
  | ReactElement
  | ReactPortal
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly StableReactNode[];

/** Render a user-facing message from a string or an Error/ApiError. */
function humanize(error: string | Error | null | undefined): string | null {
  if (error == null) return null;
  if (typeof error === "string") return error;
  return mapErrorMessage(error);
}

export function State({
  state,
  error,
  empty,
  onRetry,
  children,
}: {
  state: LoadState;
  error?: string | Error | null;
  empty?: StableReactNode;
  onRetry?: () => void;
  children: StableReactNode;
}) {
  const msg = humanize(error);
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
        出错了：{msg ?? "未知错误"}
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
  // INVARIANT: the raw provenance enum is only used as a style class, never as copy.
  return <span className={`badge ${level}`}>{provenanceLabel(level)}</span>;
}

export function TriageBadge({ level }: { level: string | null }) {
  if (!level) return <span className="badge">未分级</span>;
  // INVARIANT: the raw triage level is only used as a style class, never as copy.
  return <span className={`badge ${level}`}>{triageLabel(level)}</span>;
}

export function ErrorNote({ message }: { message: string | Error | null }) {
  const msg = humanize(message);
  if (!msg) return null;
  return <div className="alert emergency">操作失败：{msg}</div>;
}
