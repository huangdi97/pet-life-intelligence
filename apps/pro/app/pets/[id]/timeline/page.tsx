"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, type BehaviorEvent, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { ProvenanceBadge, State } from "../../../../components/ui";

interface EventsResp {
  events: LifeEvent[];
  count: number;
}

const NO_PET = "NO_PET_SELECTED";

/** 事件类型过滤 chips（按域，客户端过滤；与 web 端时间线同一交互契约）。 */
const DOMAIN_CHIPS: Array<{ id: string; label: string; match: (et: string) => boolean }> = [
  { id: "", label: "全部", match: () => true },
  { id: "health", label: "健康", match: (et) => et.startsWith("health.") },
  { id: "behavior", label: "行为", match: (et) => et.startsWith("behavior.") },
  { id: "care", label: "照护", match: (et) => et.startsWith("care.") },
  { id: "daily", label: "日常", match: (et) => et.startsWith("daily.") },
  { id: "medication", label: "用药", match: (et) => et.startsWith("medication.") },
];

const TYPE_LABELS: Record<string, string> = {
  "daily.meal": "喂食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
  "care.task_completed": "任务完成",
  "care.task_conflict": "任务冲突",
  "care.handoff_started": "交接开始",
  "care.handoff_ended": "交接结束",
  "behavior.observed": "行为记录",
  "health.event_opened": "健康事件",
  "health.triage_assigned": "风险分级",
  "health.red_flag": "红旗",
  "health.outcome_recorded": "结局",
  "health.vet_brief_generated": "生成 Vet Brief",
  "health.vet_brief_shared": "分享 Vet Brief",
  "medication.plan_created": "用药计划",
  "medication.administered": "给药",
  "medication.missed": "漏用",
  "milestone.recorded": "里程碑",
};

/** PRO-005 专业时间线：What/When/Who/Source/Provenance + 过滤；
 *  behavior.* 事件显示显式 ABC 三列（发生前 Antecedent / 行为 Behavior / 之后 Consequence）；
 *  AI 派生与真实记录视觉区分（tl-ai 边条 + AI 徽章，非仅颜色）。 */
export default function ProfessionalTimelinePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [domain, setDomain] = useState("");

  const timeline = useAsync<EventsResp>(
    () =>
      id
        ? api.get<EventsResp>(`/pets/${id}/events?limit=100`)
        : Promise.reject(new Error(NO_PET)),
    [id],
  );
  const behaviorEvents = useAsync<BehaviorEvent[]>(
    () =>
      id
        ? api.get<BehaviorEvent[]>(`/pets/${id}/behavior-events`)
        : Promise.reject(new Error(NO_PET)),
    [id],
  );

  /** behavior_event_id → 完整 ABC 记录（life event payload 只有 behavior/intensity，
   *  ABC 三列来自 behavior-events 端点）。 */
  const beMap = useMemo(
    () => new Map((behaviorEvents.data ?? []).map((b) => [b.behavior_event_id, b])),
    [behaviorEvents.data],
  );

  const events = useMemo(() => {
    const rows = timeline.data?.events ?? [];
    if (!domain) return rows;
    const chip = DOMAIN_CHIPS.find((c) => c.id === domain);
    return chip ? rows.filter((e) => chip.match(e.event_type)) : rows;
  }, [timeline.data, domain]);

  return (
    <main>
      <h1>专业时间线</h1>
      <p className="sub">
        同一患者下带来源的连续事件；AI 生成与真实记录有视觉区分；行为记录展示 ABC 三列结构。
      </p>

      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 6 }} role="group" aria-label="按域筛选">
        {DOMAIN_CHIPS.map((c) => (
          <button
            key={c.id}
            className={`btn ${domain === c.id ? "primary" : ""}`}
            style={{ fontSize: 13, minHeight: 32 }}
            onClick={() => setDomain(c.id)}
            aria-pressed={domain === c.id}
          >
            {c.label}
          </button>
        ))}
        <button className="btn" style={{ fontSize: 13, minHeight: 32 }} onClick={timeline.reload}>
          刷新
        </button>
      </div>

      <State
        state={timeline.state}
        error={timeline.error ? mapErrorMessage(timeline.error) : null}
        onRetry={timeline.reload}
        empty="暂无事件。"
      >
        <ul className="tl">
          {events.map((e) => {
            const isAi = e.provenance_level.startsWith("AI");
            const be = e.event_type === "behavior.observed"
              ? beMap.get(String(e.payload["behavior_event_id"] ?? ""))
              : undefined;
            return (
              <li key={e.event_id} className={`${e.retracted_at ? "retracted " : ""}${isAi ? "tl-ai" : ""}`}>
                <div className="tl-head">
                  <span className="tl-type">{TYPE_LABELS[e.event_type] ?? e.event_type}</span>
                  <ProvenanceBadge level={e.provenance_level} />
                  <span className="badge">{e.actor_name || e.actor_id}</span>
                  {e.retracted_at && <span className="badge EMERGENCY">已撤回</span>}
                  {e.supersedes_event_id && <span className="badge">修订版本</span>}
                  <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                </div>
                <div className="tl-body">
                  {e.source_ref && <div className="muted">source: {e.source_ref}</div>}
                  {be ? (
                    <div className="abc" aria-label="行为 ABC 记录">
                      <div className="abc-col">
                        <div className="abc-head">发生前 Antecedent</div>
                        <div>{be.antecedent || "—"}</div>
                      </div>
                      <div className="abc-col">
                        <div className="abc-head">行为 Behavior</div>
                        <div>{be.behavior}</div>
                      </div>
                      <div className="abc-col">
                        <div className="abc-head">之后 Consequence</div>
                        <div>{be.consequence || "—"}</div>
                      </div>
                    </div>
                  ) : (
                    Object.keys(e.payload).length > 0 && (
                      <div>
                        {Object.entries(e.payload)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </div>
                    )
                  )}
                  {(e.artifact_ids ?? []).length > 0 && (
                    <div className="muted">证据：{e.artifact_ids.length} 个附件</div>
                  )}
                  {!be && e.event_type === "behavior.observed" && (
                    <div className="muted">ABC 三列详情未随此事件记录（仅行为摘要）。</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </State>
    </main>
  );
}
