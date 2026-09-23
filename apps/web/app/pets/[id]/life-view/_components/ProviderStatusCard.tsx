"use client";

import Link from "next/link";
import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { type Async } from "../../../../../lib/hooks";
import type { VisualStatus } from "./types";

interface ProviderStatusCardProps {
  status: Async<VisualStatus>;
  providerBlocked: boolean;
  generating: boolean;
  petId: string;
  onStartGeneration: () => void;
}

/** 3D 形象服务状态：无真实 provider 时诚实显示不可用，不伪装成功。 */
export function ProviderStatusCard({
  status,
  providerBlocked,
  generating,
  petId,
  onStartGeneration,
}: ProviderStatusCardProps) {
  return (
    /* Provider status — 诚实 */
    <div className="card">
      <h2>3D 形象服务</h2>
      <State state={status.state} error={status.error ? mapErrorMessage(status.error) : null} onRetry={status.reload} empty="—">
        {providerBlocked ? (
          <>
            <div className="state">
              3D 生成服务暂未开放
              <div className="muted" style={{ marginTop: 6 }}>
                当前未接入真实 3D 生成服务（provider: {status.data?.provider}）。此页面不会伪装生成成功。
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" disabled={generating} onClick={onStartGeneration}>
                {generating ? "提交中…" : "尝试提交生成请求"}
              </button>
              <Link href={`/pets/${petId}/capture`} className="btn primary">
                拍摄宠物照片
              </Link>
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            3D 生成服务已就绪（provider: {status.data?.provider}）。
          </p>
        )}
      </State>
    </div>
  );
}
