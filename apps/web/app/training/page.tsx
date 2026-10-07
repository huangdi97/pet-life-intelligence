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

interface TrainingSession {
  session_id: string;
  goal_id: string | null;
  session_at: string;
  duration_minutes: number;
  focus: string;
  notes: string;
  pet_response: string;
  rewards_used: string[];
}

function responseLabel(response: string): string {
  if (response === "GREAT") return "表现很好";
  if (response === "GOOD") return "表现好";
  if (response === "POOR") return "遇到困难";
  return "已记录";
}


/** 目标状态 → 用户语言（绝不把 raw OPEN/PAUSED/ACTIVE 展示给主人）。 */
function goalStatusZh(status: string): string {
  if (status === "OPEN") return "进行中";
  if (status === "ACTIVE") return "进行中";
  if (status === "PAUSED") return "已暂停";
  if (status === "COMPLETED" || status === "ACHIEVED") return "已完成";
  if (status === "ARCHIVED") return "已归档";
  return "状态已记录";
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
  const sessions = useAsync<TrainingSession[]>(
    () =>
      petId
        ? api.get<TrainingSession[]>(`/pets/${petId}/training-sessions?limit=8`)
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
    sessions.reload();
  }

  const activeGoals = (goals.data ?? []).filter((g) => g.status === "OPEN" || g.status === "ACTIVE");

  return (
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.training.identity">
        <h1>训练</h1>
        <p className="sub">{current ? `${current.name} · 奖励式训练目标与会话记录。仅使用正向强化方法。` : "奖励式训练目标与会话记录。仅使用正向强化方法。"}</p>
      </div>

      <State state={goals.state} error={goals.error} onRetry={goals.reload} empty="还没有训练目标。">
        <>
          {activeGoals.length > 0 && (
            <div className="v5-progress-surface" data-testid="pli.training.goal">
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

          <div className="v5-progress-surface" data-testid="pli.training.recent">
            <h2>最近会话与结果</h2>
            <State
              state={sessions.state}
              error={sessions.error}
              onRetry={sessions.reload}
              empty="还没有记录过训练会话。"
            >
              <ul className="tl" style={{ marginTop: 8 }}>
                {(sessions.data ?? []).slice(0, 5).map((session) => {
                  const goal = (goals.data ?? []).find((item) => item.goal_id === session.goal_id);
                  return (
                    <li key={session.session_id}>
                      <div className="tl-head">
                        <span className="tl-type">{goal?.title ?? "训练会话"}</span>
                        <span className="badge">结果：{responseLabel(session.pet_response)}</span>
                        <span className="tl-time">{fmtTime(session.session_at)}</span>
                      </div>
                      <div className="muted">
                        {session.duration_minutes} 分钟
                        {session.focus ? ` · ${session.focus}` : ""}
                        {session.rewards_used?.length ? ` · 奖励：${session.rewards_used.join("、")}` : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </State>
            <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
              掌握度只由已经提交的训练会话更新；不会根据猜测或一次表现自动判定“学会了”。
            </p>
          </div>
          {goals.data?.map((g) => (
            <div className="v5-goal-card" key={g.goal_id}>
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

      <section className="v4-sec">
        <h2 className="v4-sec-title">开始一个新目标</h2>
        <p className="v4-sec-sub">先看当前目标与最近进展；需要时再添加一个新的小目标。</p>
        <div className="row" style={{ marginTop: 10 }}>
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
      </section>

      <section className="v4-sec" data-testid="pli.training.reward">
        <h2 className="v4-sec-title">奖励</h2>
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
      </section>

      <section className="v4-sec" data-testid="pli.training.next">
        <h2 className="v4-sec-title">下一步</h2>
        <p className="muted" style={{ margin: 0 }}>
          {activeGoals.length > 0 ? `继续「${activeGoals[0].title}」：建议每次 3–5 分钟，结束后用奖励强化。` : "创建第一个训练目标，从 3–5 分钟的小目标开始。"}
        </p>
      </section>
    </main>
  );
}
