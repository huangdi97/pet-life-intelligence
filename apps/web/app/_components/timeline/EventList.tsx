"use client";

import Link from "next/link";
import type { LifeEvent } from "@pli/api-client";
import { EmptyState } from "@pli/ui-kit";
import { fmtTime } from "../../../lib/hooks";
import { ProvenanceBadge } from "../../../components/ui";
import { TYPE_LABELS } from "./constants";

interface EventListProps {
  events: LifeEvent[];
}

/** OWN-003 Timeline 事件流：AI 生成与真实记录视觉区分（tl-ai 类 + AI 徽章，非仅颜色）。 */
export function EventList({ events }: EventListProps) {
  return events.length === 0 ? (
    <EmptyState title="暂无事件" description="去 Today 快速记录一条，时间线会在这里累积带来源的事件。" />
  ) : (
    <ul className="tl">
      {events.map((e) => {
        const isAi = e.provenance_level.startsWith("AI");
        const outcome = typeof e.payload["outcome"] === "string" ? String(e.payload["outcome"]) : "";
        return (
          <li key={e.event_id} className={`${e.retracted_at ? "retracted" : ""} ${isAi ? "tl-ai" : ""}`}>
            <div className="tl-head">
              <span className="tl-type">
                {TYPE_LABELS[e.event_type] ?? e.event_type}
                <span className="tl-type-raw" style={{ marginLeft: 6, fontSize: 11, color: "var(--pli-ink-muted, #7c7369)", fontWeight: 400 }}>
                  {e.event_type}
                </span>
              </span>
              <ProvenanceBadge level={e.provenance_level} />
              <span className="badge">{e.actor_name ?? e.actor_id}</span>
              <Link
                href={`/agent?tab=explain&ctx=${encodeURIComponent(TYPE_LABELS[e.event_type] ?? e.event_type)}`}
                className="btn"
                style={{ fontSize: 12, minHeight: 30, padding: "3px 10px" }}
                aria-label={`解释为什么发生 ${TYPE_LABELS[e.event_type] ?? e.event_type}`}
              >
                [为什么]
              </Link>
              {e.retracted_at && <span className="badge EMERGENCY">已撤回</span>}
              {e.supersedes_event_id && <span className="badge">修订版本</span>}
              <span className="tl-time">{fmtTime(e.occurred_at)}</span>
            </div>
            <div className="tl-body">
              {e.source_ref && <div className="muted">source: {e.source_ref}</div>}
              {Object.keys(e.payload).length > 0 && (
                <div>
                  {Object.entries(e.payload)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </div>
              )}
              {(e.artifact_ids ?? []).length > 0 && (
                <div className="muted">证据：{e.artifact_ids.length} 个附件</div>
              )}
              {outcome && <div>结果：{outcome}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
