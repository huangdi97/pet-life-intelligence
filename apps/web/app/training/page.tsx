"use client";

import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface Goal {
  goal_id: string;
  title: string;
  status: string;
  mastery_level: number;
  steps: Array<{ description: string; status: string }>;
  target_behavior: string;
  created_at?: string;
}


/** 目标状态 → 用户语言（绝不把 raw OPEN/PAUSED/ACTIVE 展示给主人）。 */
function goalStatusZh(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "ACTIVE") return "进行中";
  if (status === "PAUSED") return "已暂停";
  if (status === "COMPLETED") return "已完成";
  if (status === "ARCHIVED") return "已归档";
  return "进行中";
}

/** v0.2 surface: Training (PLI-085..088/091/092) — reward-based only. */
export default function TrainingPage() {
  const { petId } = useCurrentPet();
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const current = pets.data?.find((p) => p.id === petId) ?? pets.data?.[0];
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

  const activeGoals = (goals.data ?? []).filter((g) => g.status === "OPEN" || g.status === "ACTIVE");

  return (
    <main>
      <div data-testid="pli.training.identity">
        <h1>训练</h1>
        <p className="sub">{current ? `${current.name} · 奖励式训练目标与会话记录。仅使用正向强化方法。` : "奖励式训练目标与会话记录。仅使用正向强化方法。"}</p>
      </div>

      <div className="card">
        <h2>新建训练目标</h2>
        <div className="row">
          <input
            style={{ maxWidth: 380 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：安静应对门铃"
          />
          <button className="btn primary" onClick={createGoal} disabled={!petId} data-testid="pli.training.action">
            创建
          </button>
        </div>
        <ErrorNote message={error} />
      </div>

      <State state={goals.state} error={goals.error} onRetry={goals.reload} empty="还没有训练目标。">
        <>
          {activeGoals.length > 0 && (
            <div className="card" data-testid="pli.training.goal">
              <h2>当前目标</h2>
              {activeGoals.slice(0, 3).map((g) => (
                <div className="tl-head" key={g.goal_id} style={{ marginTop: 8 }}>
                  <span className="tl-type">{g.title}</span>
                  <span className="badge" data-testid="pli.training.progress">掌握度 {g.mastery_level}/5</span>
                  <span className={`badge status-${g.status}`}>{goalStatusZh(g.status)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card" data-testid="pli.training.recent">
            <h2>最近训练</h2>
            <p className="muted" style={{ margin: 0 }}>每次记录训练会话后，这里会显示最近几次训练的表现。</p>
          </div>
          {goals.data?.map((g) => (
            <div className="card" key={g.goal_id}>
              <div className="tl-head">
                <span className="tl-type">{g.title}</span>
                <span className="badge">掌握度 {g.mastery_level}/5</span>
                <span className={`badge status-${g.status}`}>{goalStatusZh(g.status)}</span>
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
        </>
      </State>

      <div className="card" data-testid="pli.training.reward">
        <h2>奖励</h2>
        <p className="muted" style={{ margin: 0 }}>只使用正向强化（零食、玩具、抚摸）。训练工具库仅包含安全工具，不包含惩罚性工具。</p>
        <ul className="tl" style={{ marginTop: 8 }}>
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

      <div className="card" data-testid="pli.training.next">
        <h2>下一步</h2>
        <p className="muted" style={{ margin: 0 }}>
          {activeGoals.length > 0 ? `继续「${activeGoals[0].title}」：建议每次 3–5 分钟，结束后用奖励强化。` : "创建第一个训练目标，从 3–5 分钟的小目标开始。"}
        </p>
      </div>
    </main>
  );
}
