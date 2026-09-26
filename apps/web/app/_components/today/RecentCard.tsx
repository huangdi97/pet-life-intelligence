"use client";

import Link from "next/link";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/i18n";
import { provenanceLabel } from "../../../lib/provenance-zh";
import { State } from "../../../components/ui";
import { Icon } from "../../../components/icons";
import { TYPE_LABELS } from "../timeline/constants";
import type { TodayData } from "./constants";

interface RecentCardProps {
  hasPet: boolean;
  today: Async<TodayData>;
}

/** OWN-001 最近 — compact life stream preview（时间 + 事件 + 来源 + 媒体），
 *  以及 Monitoring / Companion 的情境入口。 */
export function RecentCard({ hasPet, today }: RecentCardProps) {
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">最近</h2>
        <Link href="/timeline" className="v4-sec-link">
          查看完整时间线
        </Link>
      </div>
      {hasPet ? (
        <State
          state={today.state}
          error={today.error ? mapErrorMessage(today.error) : null}
          onRetry={today.reload}
          empty="今天还没有记录。"
        >
          {today.data?.events.slice(0, 4).map((e) => (
            <div key={e.event_id} className="ls-item" style={{ gridTemplateColumns: "auto 1fr" }}>
              <span className="ls-time">{fmtTime(e.occurred_at).slice(11, 16)}</span>
              <div className="ls-body">
                <div className="ls-title">
                  <span className="ls-title-icon">
                    <Icon name="clock" size={14} />
                  </span>
                  {TYPE_LABELS[e.event_type] ?? e.event_type}
                </div>
                <div className="ls-meta">
                  <span className="v4-chip v4-chip--brand">{provenanceLabel(e.source_type, e.provenance_level)}</span>
                  {(e.artifact_ids ?? []).length > 0 && (
                    <span className="ls-media">
                      <Icon name="camera" size={13} />
                      {e.artifact_ids.length} 张照片
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </State>
      ) : (
        <div className="v4-calm">
          <span className="v4-calm-icon">
            <Icon name="paw" size={18} />
          </span>
          <p className="v4-calm-body">请先在顶部选择一只宠物。</p>
        </div>
      )}
      <div className="v4-linkrow">
        <Link href="/monitoring" className="v4-action v4-action--secondary">
          <span className="v4-action-icon">
            <Icon name="eye" size={16} />
          </span>
          看看它
        </Link>
        <Link href="/companion" className="v4-action v4-action--secondary">
          <span className="v4-action-icon">
            <Icon name="heart" size={16} />
          </span>
          陪伴
        </Link>
      </div>
    </div>
  );
}
