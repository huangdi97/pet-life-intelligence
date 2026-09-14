"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type LifeEvent, type Pet, type Task } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../lib/hooks";
import { ProvenanceBadge, State } from "../components/ui";

interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

const QUICK_TYPES: Array<{ type: string; label: string; payload: Record<string, string | number> }> = [
  { type: "daily.meal", label: "喂食", payload: { food_type: "狗粮", amount: "100", unit: "g" } },
  { type: "daily.drink", label: "饮水", payload: { amount: "200", unit: "ml" } },
  { type: "daily.elimination", label: "排泄", payload: { kind: "urine", quality: "normal" } },
  { type: "daily.walk", label: "散步", payload: { duration_minutes: 20, intensity: "normal" } },
  { type: "daily.play", label: "玩耍", payload: { duration_minutes: 15, activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", payload: { weight_kg: "12.0" } },
];

export default function TodayPage() {
  const { petId } = useCurrentPet();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const today = useAsync<TodayData>(
    () => (petId ? api.get<TodayData>(`/pets/${petId}/today`) : Promise.reject(new Error("no pet"))),
    [petId],
  );
  const tasks = useAsync<Task[]>(
    () =>
      petId
        ? api.get<Task[]>(`/pets/${petId}/tasks?status=OPEN`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Pet[]>("/pets")
      .then((rows) => setPets(rows))
      .catch(() => setPets([]));
  }, [petId]);

  if (pets === null) return <div className="state loading">加载中……</div>;
  if (pets.length === 0) {
    return (
      <main>
        <h1>今日</h1>
        <div className="state">
          还没有宠物。先创建一只吧。
          <div style={{ marginTop: 12 }}>
            <Link href="/pets/new" className="btn primary" role="button">
              创建宠物档案
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const current = pets.find((p) => p.id === petId) ?? pets[0];

  async function quickLog(t: (typeof QUICK_TYPES)[number]) {
    const target = current.id;
    try {
      await api.post(`/pets/${target}/events`, { event_type: t.type, payload: t.payload });
      setFlash(`已记录：${t.label}`);
      today.reload();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      setFlash(e instanceof Error ? `失败：${e.message}` : "失败");
    }
  }

  return (
    <main>
      <h1>{current.name} 今天怎么样？</h1>
      <p className="sub">
        {current.breed || current.species} · {today.data?.date ?? ""}
        {pets.length > 1 && " · 可在顶部切换多宠"}
      </p>
      {flash && <div className="alert info">{flash}</div>}

      <div className="card">
        <h2>快速记录</h2>
        <div className="quickgrid">
          {QUICK_TYPES.map((t) => (
            <button key={t.type} className="btn" onClick={() => quickLog(t)}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="muted">所有记录都会带来源（provenance）与记录人（actor）进入事件图。</p>
      </div>

      <div className="card">
        <h2>今日概览</h2>
        <div className="row">
          {today.data &&
            Object.entries(today.data.event_counts).map(([t, n]) => (
              <span key={t} className="badge">
                {t} × {n}
              </span>
            ))}
        </div>
        <State
          state={today.state}
          error={today.error}
          onRetry={today.reload}
          empty="今天还没有记录。"
        >
          <ul className="tl">
            {today.data?.events.map((e) => (
              <li key={e.event_id}>
                <div className="tl-head">
                  <span className="tl-type">{e.event_type}</span>
                  <ProvenanceBadge level={e.provenance_level} />
                  <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                </div>
                <div className="tl-body">
                  {Object.entries(e.payload)
                    .filter(([k]) => k !== "health_event_id" && k !== "task_id")
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </State>
      </div>

      <div className="card">
        <h2>待办任务</h2>
        <State state={tasks.state} error={tasks.error} onRetry={tasks.reload} empty="没有待办任务。">
          <ul className="tl">
            {tasks.data?.map((t) => (
              <li key={t.id}>
                <div className="tl-head">
                  <span className="tl-type">{t.title}</span>
                  <span className={`badge status-${t.status}`}>{t.status}</span>
                  <span className="tl-time">{t.due_at ? `due ${fmtTime(t.due_at)}` : "无截止"}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/tasks" className="btn">
            管理任务
          </Link>
          <Link href="/timeline" className="btn">
            查看完整时间线
          </Link>
        </div>
      </div>
    </main>
  );
}
