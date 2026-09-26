"use client";

import Link from "next/link";
import { State } from "../../../../../components/ui";
import { mapErrorMessage } from "../../../../../lib/i18n";
import { type Async } from "../../../../../lib/hooks";
import { Icon } from "../../../../../components/icons";
import type { VisualStatus } from "./types";

interface ProviderStatusCardProps {
  status: Async<VisualStatus>;
  providerBlocked: boolean;
  generating: boolean;
  petId: string;
  onStartGeneration: () => void;
}

/** 3D 形象服务状态（用户语言）：无真实生成服务时诚实显示，不暴露内部 provider 信息。 */
export function ProviderStatusCard({
  status,
  providerBlocked,
  generating,
  petId,
  onStartGeneration,
}: ProviderStatusCardProps) {
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">3D 形象</h2>
      </div>
      <State state={status.state} error={status.error ? mapErrorMessage(status.error) : null} onRetry={status.reload} empty="—">
        {providerBlocked ? (
          <>
            <div className="v4-calm" style={{ marginTop: 4 }}>
              <span className="v4-calm-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <p className="v4-calm-title">3D 形象尚未创建</p>
                <p className="v4-calm-body">连接真实生成服务后，可以用它自己的照片生成一个更接近它的 3D 形象，并经过你确认后才显示。</p>
              </div>
            </div>
            <div className="v4-linkrow">
              <Link href={`/pets/${petId}/capture`} className="v4-action v4-action--primary">
                <span className="v4-action-icon">
                  <Icon name="camera" size={16} />
                </span>
                拍摄宠物照片
              </Link>
              <button
                type="button"
                className="v4-action v4-action--soft"
                disabled={generating}
                onClick={onStartGeneration}
              >
                {generating ? "提交中…" : "尝试提交生成请求"}
              </button>
            </div>
          </>
        ) : (
          <p className="v4-sec-sub">3D 形象生成服务已就绪。</p>
        )}
      </State>
    </div>
  );
}