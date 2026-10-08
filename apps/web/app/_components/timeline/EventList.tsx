"use client";

import Link from "next/link";
import type { LifeEvent } from "@pli/api-client";
import { Icon, type WebIconName } from "../../../components/icons";
import { provenanceLabelForSource } from "../../../lib/provenance-zh";
import { eventPayloadSummary, eventTypeLabel } from "../../../lib/ownerLabels";
import { TYPE_LABELS } from "./constants";

interface EventListProps {
  events: LifeEvent[];
  /** Current pet name for honest empty copy. */
  petName?: string;
}

const TYPE_ICONS: Record<string, WebIconName> = {
  "daily.meal": "food",
  "daily.drink": "water",
  "daily.elimination": "toilet",
  "daily.walk": "walk",
  "daily.play": "play",
  "daily.weight": "weight",
  "daily.sleep": "sleep",
  "medication.plan_created": "medication",
  "medication.administered": "medication",
  "medication.missed": "medication",
  "behavior.observed": "eye",
  "health.event_opened": "heart",
  "health.triage_assigned": "alert",
  "health.red_flag": "alert",
  "health.outcome_recorded": "heart",
  "care.task_completed": "check",
  "care.task_conflict": "users",
  "care.handoff_started": "users",
  "social.interaction_logged": "users",
  "training.goal_created": "target",
  "milestone.recorded": "sparkles",
  "diary.created": "note",
};

/** 时间线的 day-group 相对标签：只描述当天，绝不拿当前状态冒充历史。 */
function dayLabel(isoDay: string): { main: string; relative: string } {
  const today = new Date();
  const target = new Date(`${isoDay}T00:00:00`);
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()) /
      86400000,
  );
  const main = `${target.getMonth() + 1}月${target.getDate()}日`;
  if (diff === 0) return { main, relative: "今天" };
  if (diff === 1) return { main, relative: "昨天" };
  return { main, relative: "" };
}

/** OWN-003 Timeline — Life Stream：Day Group + time spine，不再逐条独立白卡。 */
export function EventList({ events, petName = "它" }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="v4-sec">
        <div className="v4-calm">
          <span className="v4-calm-icon">
            <Icon name="timeline" size={18} />
          </span>
          <div>
            <p className="v4-calm-title">{petName}的时间线还很安静</p>
            <p className="v4-calm-body">第一次喂食、散步或健康记录会从这里开始。</p>
            <div className="v4-attn-actions">
              <Link href="/" className="v4-action v4-action--secondary" style={{ minHeight: 34, padding: "7px 14px", fontSize: 13 }}>
                快速记录
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 按日分组；同日内按时间倒序（API 已按时间返回时保持原序）
  const byDay = new Map<string, LifeEvent[]>();
  for (const e of events) {
    const day = (e.occurred_at ?? "").slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(e);
    byDay.set(day, list);
  }

  return (
    <ul className="v4-ls" data-testid="pli.timeline.stream">
      {Array.from(byDay.entries()).map(([day, rows]) => {
        const { main, relative } = dayLabel(day);
        return (
          <li key={day} className="ls-day" data-testid="pli.timeline.group">
            <div className="ls-day-title">
              {main}
              {relative && <span className="ls-day-relative">{relative}</span>}
            </div>
            {rows.map((e) => {
              const label = eventTypeLabel(e.event_type);
              const time = (e.occurred_at ?? "").slice(11, 16);
              const summary = eventPayloadSummary(e.payload);
              return (
                <div key={e.event_id} className={`ls-item${e.retracted_at ? " ls-item--retracted" : ""}`} data-testid={`pli.timeline.row.${e.event_id}`}>
                  <div>
                    <div className="ls-dot" aria-hidden="true" />
                    <div className="ls-time">{time}</div>
                  </div>
                  <div className="ls-body">
                    <div className="ls-title" data-testid="pli.timeline.meaning">
                      <span className="ls-title-icon">
                        <Icon name={TYPE_ICONS[e.event_type] ?? "note"} size={15} />
                      </span>
                      {label}
                      <Link
                        href={`/agent?tab=explain&ctx=${encodeURIComponent(label)}`}
                        className="ls-why"
                        aria-label={`解释为什么发生 ${label}`}
                      >
                        为什么
                      </Link>
                    </div>
                    {summary && <p className="ls-summary">{summary}</p>}
                    <div className="ls-meta" data-testid="pli.timeline.source">
                      <span className="v4-chip v4-chip--brand">
{provenanceLabelForSource(e.source_type, e.provenance_level)}
                      </span>
                      {e.actor_name && <span>{e.actor_name}</span>}
                      {(e.artifact_ids ?? []).length > 0 && (
                        <span className="ls-media">
                          <Icon name="camera" size={13} />
                          {e.artifact_ids.length} 张照片
                        </span>
                      )}
                      {e.supersedes_event_id && <span className="v4-chip">修订版本</span>}
                      {e.retracted_at && <span className="v4-chip v4-chip--danger">已撤回</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </li>
        );
      })}
    </ul>
  );
}
