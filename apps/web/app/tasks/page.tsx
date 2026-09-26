"use client";

import { useState } from "react";
import { api, type Task } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

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
    <main>
      <h1>照护任务</h1>
      <p className="sub">创建、完成、重复任务与冲突提醒。</p>
      <div className="card">
        <h2>新建任务</h2>
        <div className="grid2">
          <label className="field">
            标题
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：晚上喂食" />
          </label>
          <label className="field">
            类型
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {["FEED", "WALK", "MEDICATION", "GROOMING", "VET_VISIT", "OTHER"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            截止时间
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="field">
            重复
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              <option value="NONE">不重复</option>
              <option value="DAILY">每天</option>
              <option value="WEEKLY">每周</option>
            </select>
          </label>
        </div>
        <ErrorNote message={error} />
        <button className="btn primary" onClick={create} disabled={!petId}>
          创建
        </button>
      </div>

      {conflict && <div className="alert emergency">{conflict}</div>}

      <State state={tasks.state} error={tasks.error} onRetry={tasks.reload} empty="还没有任务。">
        <ul className="tl">
          {tasks.data?.map((t) => (
            <li key={t.id}>
              <div className="tl-head">
                <span className="tl-type">{t.title}</span>
                <span className={`badge status-${t.status}`}>{t.status}</span>
                <span className="badge">{t.task_type}</span>
                {t.repeat_rule !== "NONE" && <span className="badge">{t.repeat_rule}</span>}
                {t.conflict_count > 0 && (
                  <span className="badge EMERGENCY">{t.conflict_count} 次重复尝试</span>
                )}
                <span className="tl-time">{t.due_at ? `due ${fmtTime(t.due_at)}` : ""}</span>
              </div>
              {t.status === "OPEN" && (
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn primary" onClick={() => complete(t)}>
                    完成
                  </button>
                </div>
              )}
              {t.status === "COMPLETED" && (
                <div className="muted">
                  由 {t.completed_by_user_id} 完成于 {fmtTime(t.completed_at)}
                </div>
              )}
            </li>
          ))}
        </ul>
      </State>
    </main>
  );
}
