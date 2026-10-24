"use client";

import { useState } from "react";
import { api, type Task } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

const TASK_TYPE_LABELS: Record<string, string> = {
  FEED: "喂食",
  WALK: "散步",
  MEDICATION: "用药",
  GROOMING: "清洁护理",
  VET_VISIT: "就诊",
  OTHER: "其他",
};

function taskStatusLabel(status: string): string {
  if (status === "OPEN") return "待完成";
  if (status === "COMPLETED") return "已完成";
  if (status === "CANCELLED") return "已取消";
  return "进行中";
}

function repeatLabel(rule: string): string {
  if (rule === "DAILY") return "每天";
  if (rule === "WEEKLY") return "每周";
  return "不重复";
}

/** Surface 6: Tasks (PLI-026/027/028) — create, complete, conflict warnings. */
export default function TasksPage() {
  const { petId } = useCurrentPet();
  const tasks = useAsync<Task[]>(
    () =>
      petId ? api.get<Task[]>(`/pets/${petId}/tasks`) : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState("OTHER");
  const [due, setDue] = useState("");
  const [repeat, setRepeat] = useState("NONE");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function create() {
    if (!petId || !title.trim()) return;
    setError(null);
    try {
      await api.post(`/pets/${petId}/tasks`, {
        title: title.trim(),
        task_type: type,
        due_at: due ? new Date(due).toISOString() : null,
        repeat_rule: repeat,
      });
      setTitle("");
      setCreateOpen(false);
      tasks.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function complete(t: Task) {
    setConflict(null);
    setError(null);
    try {
      await api.post(`/tasks/${t.id}/complete`, { note: "" });
      tasks.reload();
    } catch (e) {
      const err = e as { code?: string; message?: string; details?: Record<string, unknown> };
      if (err.code === "TASK_CONFLICT") {
        setConflict(
          `冲突：该任务已由 ${String(err.details?.completed_by ?? "他人")} 于此前完成；本次尝试已记录为冲突，未覆盖原记录。`,
        );
      } else {
        setError(err.message ?? String(e));
      }
      tasks.reload();
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <h1>照护任务</h1>
        <p className="sub">今天要做的事、重复照护与多人协作冲突，都围绕同一只宠物记录。</p>
      </div>
      {conflict && (
        <div className="v4-attn">
          <div>
            <p className="v4-attn-title">这项任务已经被其他照护人处理</p>
            <p className="v4-attn-body">{conflict}</p>
          </div>
        </div>
      )}

      <section className="v5-utility-surface">
        <div className="v4-sec-head">
          <div>
            <h2>当前任务</h2>
            <p className="v4-sec-sub">待完成事项优先；已经完成的任务保留记录但降低视觉权重。</p>
          </div>
          {tasks.data ? <span className="v4-chip">{tasks.data.filter((t) => t.status === "OPEN").length} 项待完成</span> : null}
        </div>
        <State state={tasks.state} error={tasks.error} onRetry={tasks.reload} empty="还没有任务。">
          <ul className="tl">
            {tasks.data
              ?.slice()
              .sort((a, b) => (a.status === "OPEN" ? 0 : 1) - (b.status === "OPEN" ? 0 : 1))
              .map((t) => (
                <li key={t.id} style={t.status === "COMPLETED" ? { opacity: 0.68 } : undefined}>
                  <div className="tl-head">
                    <span className="tl-type">{t.title}</span>
                    <span className={`badge status-${t.status}`}>{taskStatusLabel(t.status)}</span>
                    <span className="badge">{TASK_TYPE_LABELS[t.task_type] ?? "其他"}</span>
                    {t.repeat_rule !== "NONE" && <span className="badge">{repeatLabel(t.repeat_rule)}</span>}
                    {t.conflict_count > 0 && (
                      <span className="badge EMERGENCY">{t.conflict_count} 次重复尝试</span>
                    )}
                    <span className="tl-time">{t.due_at ? `截至 ${fmtTime(t.due_at)}` : ""}</span>
                  </div>
                  {t.status === "OPEN" && (
                    <div className="v4-actions" style={{ marginTop: 8 }}>
                      <button className="v4-action v4-action--primary" onClick={() => complete(t)}>
                        完成
                      </button>
                    </div>
                  )}
                  {t.status === "COMPLETED" && (
                    <div className="muted">
                      由照护成员完成 · {fmtTime(t.completed_at)}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </State>
      </section>
      <section className="v4-sec v5-domain-create" data-form-open={createOpen ? "true" : "false"}>
        <div className="v4-sec-head">
          <div>
            <h2 className="v4-sec-title">新建任务</h2>
            <p className="v4-sec-sub">先完成当前待办；确有新的照护事项时再创建任务。</p>
          </div>
          <button
            type="button"
            className="btn"
            data-testid="pli.tasks.create.toggle"
            aria-expanded={createOpen}
            aria-controls="pli-tasks-create-form"
            onClick={() => {
              setCreateOpen((value) => !value);
              setError(null);
            }}
          >
            {createOpen ? "收起" : "+ 新建任务"}
          </button>
        </div>
        {createOpen ? (
          <div id="pli-tasks-create-form" className="v5-form-surface v5-form-surface--inline">
            <div className="grid2">
              <label className="field">标题<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：晚上喂食" /></label>
              <label className="field">类型<select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}</select></label>
              <label className="field">截止时间<input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></label>
              <label className="field">重复<select value={repeat} onChange={(e) => setRepeat(e.target.value)}><option value="NONE">不重复</option><option value="DAILY">每天</option><option value="WEEKLY">每周</option></select></label>
            </div>
            <ErrorNote message={error} />
            <button data-testid="pli.tasks.create.submit" className="btn primary" onClick={create} disabled={!petId || !title.trim()}>创建任务</button>
          </div>
        ) : null}
      </section>

    </main>
  );
}
