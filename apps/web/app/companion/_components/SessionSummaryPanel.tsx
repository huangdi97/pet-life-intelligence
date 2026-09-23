"use client";

import { fmtTime } from "../../../lib/hooks";
import { t } from "../../../lib/i18n";
import type { RemoteInteractionSession } from "./types";

interface SessionSummaryPanelProps {
  session: RemoteInteractionSession;
  timer: number;
}

/** OWN-014 Companion — 本次会话摘要（原型，不产生后端写入）。 */
export function SessionSummaryPanel({ session, timer }: SessionSummaryPanelProps) {
  return (
    <div className="card">
      <h2>{t("companion.summary")}</h2>
      <ul className="tl">
        <li>
          <div className="tl-head">
            <span className="tl-type">原型会话</span>
            <span className="badge pli-tag--prototype">{t("companion.gateTitle")}</span>
            <span className="tl-time">{fmtTime(session.started_at)}</span>
          </div>
          <div className="tl-body">
            互动 {session.interaction_types.length} 次 · 时长 {Math.floor(timer / 60)} min · 未连接真实设备（不产生后端写入）
          </div>
        </li>
      </ul>
    </div>
  );
}
