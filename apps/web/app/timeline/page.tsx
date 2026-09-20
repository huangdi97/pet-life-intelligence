"use client";

import { useMemo, useState } from "react";
import { api, type LifeEvent } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { ProvenanceBadge, State } from "../../components/ui";
import { EmptyState, Skeleton } from "@pli/ui-kit";
/** OWN-003 Timeline（Stage H §17-18）：PLI 核心资产。
 *  What/When/Who/Source/Evidence/Outcome + Filter/Search；
 *  AI 生成内容与真实记录视觉区分（tl-ai 类 + AI 徽章，非仅颜色）。
 *  E2E 契约保留：.tl / .tl-type / .tl-body / OWNER_REPORTED / 事件类型过滤 select。 */

interface VisualModelRow {
  version: number;
  status: string;
  provenance_kind: string;
  activated_at: string | null;
  retired_at: string | null;
}

const FILTERS = [
  "", "daily.meal", "daily.drink", "daily.elimination", "daily.walk",
  "daily.play", "daily.weight", "daily.sleep", "care.task_completed", "care.task_conflict",
  "care.handoff_started", "behavior.observed", "health.event_opened",
  "health.triage_assigned", "health.red_flag", "health.outcome_recorded",
  "medication.plan_created", "medication.administered", "medication.missed",
  "social.interaction_logged", "milestone.recorded",
];

const DOMAIN_CHIPS: Array<{ id: string; label: string; match: (et: string) => boolean }> = [
  { id: "", label: "全部", match: () => true },
  { id: "health", label: "健康", match: (et) => et.startsWith("health.") },
  { id: "behavior", label: "行为", match: (et) => et.startsWith("behavior.") },
  { id: "training", label: "训练", match: (et) => et.startsWith("training.") },
  { id: "care", label: "照护", match: (et) => et.startsWith("care.") },
  { id: "daily", label: "日常", match: (et) => et.startsWith("daily.") },
  { id: "media", label: "媒体", match: (et) => et.startsWith("artifact") },
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
  "medication.plan_created": "用药计划",
  "medication.administered": "给药",
  "medication.missed": "漏用",
  "social.interaction_logged": "社交互动",
  "milestone.recorded": "里程碑",
  "diary.created": "备注",
};

export default function TimelinePage() {
  const { petId } = useCurrentPet();
  const [filter, setFilter] = useState("");
  const [domain, setDomain] = useState("");
  const [source, setSource] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const visual = useAsync<{ models: VisualModelRow[] }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const timeline = useAsync<{ events: LifeEvent[]; count: number }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=100${filter ? `&event_type=${filter}` : ""}`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId, filter],
  );

  const events = useMemo(() => {
    let rows = timeline.data?.events ?? [];
    if (day) {
      const target = day; // yyyy-mm-dd
      rows = rows.filter((e) => (e.occurred_at ?? "").slice(0, 10) === target);
    }
    if (domain) {
      const chip = DOMAIN_CHIPS.find((c) => c.id === domain);
      if (chip) rows = rows.filter((e) => chip.match(e.event_type));
    }
    if (source) rows = rows.filter((e) => e.source_type === source);
    if (mediaOnly) rows = rows.filter((e) => (e.artifact_ids ?? []).length > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (e) =>
          e.event_type.toLowerCase().includes(q) ||
          Object.entries(e.payload).some(([k, v]) => `${k}: ${String(v)}`.toLowerCase().includes(q)) ||
          (e.actor_name ?? e.actor_id).toLowerCase().includes(q),
      );
    }
    return rows;
  }, [timeline.data, domain, source, mediaOnly, search]);

  return (
    <main>
      <h1>{t("timeline.title")}</h1>
      <p className="sub">
        同一宠物 ID 下带来源的连续事件。点开任何记录都能看到谁记录的、来源是什么；AI 生成与真实记录有视觉区分。
      </p>
      {day && (
        <div className="card">
          <h2>回到那一天 · {day}</h2>
          <p className="sub" style={{ margin: 0 }}>
            这里只展示 {day} 的真实照片/视频/事件/观察；不会用当前 3D 形象伪装过去的真实外观。
          </p>
          {(() => {
            const onDay = (visual.data?.models ?? []).filter(
              (m) => m.activated_at && m.activated_at.slice(0, 10) === day,
            );
            return onDay.length > 0 ? (
              <p className="muted" style={{ marginTop: 6 }}>
                当日激活的 3D 形象版本：{onDay.map((m) => `v${m.version}（${m.provenance_kind}）`).join("、")}
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 6 }}>
                当天没有激活的 3D 形象版本。
              </p>
            );
          })()}
        </div>
      )}

      {/* Filter chips（域） */}
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
      </div>

      <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <select
          style={{ maxWidth: 260 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="按事件类型过滤"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "" ? "全部事件" : (TYPE_LABELS[f] ?? f)}
            </option>
          ))}
        </select>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }} role="group" aria-label="按来源筛选">
          {["", "OWNER_REPORTED", "SYSTEM_CALCULATED", "PROFESSIONAL_REVIEWED", "DEVICE"].map((s) => (
            <button
              key={s || "all"}
              className={`btn ${source === s ? "primary" : ""}`}
              style={{ fontSize: 12, minHeight: 30 }}
              onClick={() => setSource(s)}
              aria-pressed={source === s}
            >
              {s === "" ? "全部来源" : s}
            </button>
          ))}
        </div>
        <label className="pet-label" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={mediaOnly} onChange={(e) => setMediaOnly(e.target.checked)} />
          仅含媒体证据
        </label>
        <input
          style={{ flex: 1, minWidth: 160, maxWidth: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("timeline.search")}
          aria-label={t("timeline.search")}
        />
        <input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="回到那一天"
          style={{ maxWidth: 170 }}
        />
        {day && (
          <button className="btn" onClick={() => setDay("")} aria-label="清除日期">
            清除日期
          </button>
        )}
        <button className="btn" onClick={timeline.reload}>
          刷新
        </button>
      </div>

      {timeline.state === "loading" ? (
        <div className="card">
          <Skeleton lines={4} />
        </div>
      ) : (
        <State
          state={timeline.state}
          error={timeline.error ? mapErrorMessage(timeline.error) : null}
          onRetry={timeline.reload}
          empty="暂无事件。去 Today 快速记录一条吧。"
        >
          {events.length === 0 ? (
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
          )}
        </State>
      )}
    </main>
  );
}
