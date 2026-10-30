"use client";

import { useState } from "react";
import { api } from "@pli/api-client";
import { fmtTime, useAsync } from "../../../lib/hooks";
import { State } from "../../../components/ui";

interface RecoveryItem {
  description: string;
  due_at?: string | null;
  status: "PENDING" | "DONE" | "SKIPPED";
}

interface RecoveryPlan {
  plan_id: string;
  health_event_id: string;
  items: RecoveryItem[];
  created_at: string;
  updated_at: string;
}

interface Trend {
  health_event_id: string;
  observations_per_day: Record<string, number>;
  triage_timeline: Array<{ level: string | null; at: string }>;
  notice: string;
}

const STATUS_LABEL: Record<RecoveryItem["status"], string> = {
  PENDING: "待完成",
  DONE: "已完成",
  SKIPPED: "已跳过",
};

/**
 * PLI-061/062 — owner-authored recovery checklist + deterministic symptom trend.
 * This card never invents a treatment plan: every checklist item is explicitly
 * entered by the owner, while trend data is a count of recorded observations
 * and rule-engine triage events.
 */
export function RecoveryCard({ healthEventId }: { healthEventId: string }) {
  const plans = useAsync<RecoveryPlan[]>(
    () => api.get<RecoveryPlan[]>(`/health-events/${healthEventId}/recovery-plans`),
    [healthEventId],
  );
  const trend = useAsync<Trend>(
    () => api.get<Trend>(`/health-events/${healthEventId}/trend`),
    [healthEventId],
  );
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const latest = plans.data?.[0] ?? null;

  async function createPlan() {
    if (!description.trim() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/health-events/${healthEventId}/recovery-plan`, {
        items: [{
          description: description.trim(),
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        }],
      });
      setDescription("");
      setDueAt("");
      plans.reload();
      trend.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setItemStatus(planId: string, index: number, status: RecoveryItem["status"]) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.patch(`/recovery-plans/${planId}/items/${index}`, { status });
      plans.reload();
      trend.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const days = Object.entries(trend.data?.observations_per_day ?? {});
  const triage = trend.data?.triage_timeline ?? [];

  return (
    <div className="card" data-testid="pli.health.recovery">
      <h2>恢复与复盘</h2>
      <p className="muted">
        这里只记录你已经确认的照护安排，并汇总已发生的观察记录；不会自动生成治疗方案，也不替代兽医建议。
      </p>

      <State state={plans.state} error={plans.error} onRetry={plans.reload} empty="还没有恢复计划。">
        {latest ? (
          <div style={{ marginTop: 10 }}>
            <div className="muted">最近计划 · {fmtTime(latest.updated_at)}</div>
            {latest.items.map((item, index) => (
              <div className="tl-item" key={`${latest.plan_id}-${index}`} style={{ marginTop: 8 }}>
                <div className="tl-head">
                  <strong>{item.description || "未命名事项"}</strong>
                  <span className="badge">{STATUS_LABEL[item.status] ?? item.status}</span>
                </div>
                {item.due_at ? <div className="muted">计划时间：{fmtTime(item.due_at)}</div> : null}
                {item.status === "PENDING" ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <button className="btn" disabled={busy} onClick={() => void setItemStatus(latest.plan_id, index, "DONE")}>标记完成</button>
                    <button className="btn" disabled={busy} onClick={() => void setItemStatus(latest.plan_id, index, "SKIPPED")}>跳过</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </State>

      <div className="grid2" style={{ marginTop: 14 }}>
        <label className="field">
          新的照护事项
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：按兽医已给出的安排复查"
          />
        </label>
        <label className="field">
          计划时间（可选）
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
        </label>
      </div>
      <button className="btn" disabled={busy || !description.trim()} onClick={() => void createPlan()}>
        {busy ? "保存中…" : "记录照护事项"}
      </button>
      {actionError ? <p className="alert error">{actionError}</p> : null}

      <div style={{ marginTop: 18 }} data-testid="pli.health.trend">
        <h3>变化趋势</h3>
        <State state={trend.state} error={trend.error} onRetry={trend.reload} empty="目前还没有可统计的观察。">
          {trend.data ? (
            <>
              {days.length ? (
                <div className="tl">
                  {days.map(([day, count]) => (
                    <div className="tl-item" key={day}>
                      <div className="tl-head"><strong>{day}</strong><span>{count} 条观察</span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="muted">目前还没有可统计的观察。</p>}
              {triage.length ? (
                <p className="muted" style={{ marginTop: 8 }}>
                  风险分级记录：{triage.map((row) => `${row.level ?? "未分级"} · ${fmtTime(row.at)}`).join("；")}
                </p>
              ) : null}
              <p className="muted">{trend.data.notice}</p>
            </>
          ) : null}
        </State>
      </div>
    </div>
  );
}
