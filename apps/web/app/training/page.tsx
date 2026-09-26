"use client";

import { useState } from "react";
import { api } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface Goal {
  goal_id: string;
  title: string;
  status: string;
  mastery_level: number;
  steps: Array<{ description: string; status: string }>;
  target_behavior: string;
}

/** v0.2 surface: Training (PLI-085..088/091/092) — reward-based only. */
export default function TrainingPage() {
  const { petId } = useCurrentPet();
  const goals = useAsync<Goal[]>(
    () =>
      petId
        ? api.get<Goal[]>(`/pets/${petId}/training-goals`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const tools = useAsync<{ tools: Array<{ name: string; use: string }>; banned_note: string }>(
    () => api.get("/training/tools"),
    [],
  );
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createGoal() {
    if (!petId || !title.trim()) return;
    setError(null);
    try {
      await api.post(`/pets/${petId}/training-goals`, { title: title.trim() });
      setTitle("");
      goals.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function logSession(goalId: string, response: string) {
    if (!petId) return;
    await api.post(`/pets/${petId}/training-sessions`, {
      goal_id: goalId,
      duration_minutes: 5,
      pet_response: response,
      rewards_used: ["零食"],
    });
    goals.reload();
  }

  return (
    <main>
      <h1>训练</h1>
      <p className="sub">奖励式训练目标与会话记录。仅使用正向强化方法。</p>
      <div className="card">
        <h2>新建训练目标</h2>
        <div className="row">
          <input
            style={{ maxWidth: 380 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：安静应对门铃"
          />
          <button className="btn primary" onClick={createGoal} disabled={!petId}>
            创建
          </button>
        </div>
        <ErrorNote message={error} />
      </div>

      <State state={goals.state} error={goals.error} onRetry={goals.reload} empty="还没有训练目标。">
        {goals.data?.map((g) => (
          <div className="card" key={g.goal_id}>
            <div className="tl-head">
              <span className="tl-type">{g.title}</span>
              <span className="badge">掌握度 {g.mastery_level}/5</span>
              <span className={`badge status-${g.status}`}>{g.status}</span>
            </div>
            <div className="muted">{g.target_behavior}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => logSession(g.goal_id, "GOOD")}>
                记录会话：表现好
              </button>
              <button className="btn" onClick={() => logSession(g.goal_id, "GREAT")}>
                表现很好
              </button>
              <button className="btn" onClick={() => logSession(g.goal_id, "POOR")}>
                遇到困难
              </button>
            </div>
          </div>
        ))}
      </State>

      <div className="card">
        <h2>训练工具库（v1.0.0，仅安全工具）</h2>
        <ul className="tl">
          {tools.data?.tools.map((t) => (
            <li key={t.name}>
              <div className="tl-head">
                <span className="tl-type">{t.name}</span>
                <span className="badge">{t.use}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="notice-ai">{tools.data?.banned_note}</p>
      </div>
    </main>
  );
}
