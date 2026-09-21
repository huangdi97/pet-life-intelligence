"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type LifeEvent, type Pet, type Task } from "@pli/api-client";
import { QuickLogSheet, type QuickLogType } from "@pli/ui-kit";
import { fmtTime, useAsync, useCurrentPet } from "../lib/hooks";
import { saveDraft } from "../lib/drafts";
import { mapErrorMessage } from "../lib/i18n";
import { ProvenanceBadge, State } from "../components/ui";

interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

interface AbnormalHint {
  metric?: string;
  event_type?: string;
  message?: string;
  hint?: string;
  detail?: string;
}

/** OWN-001 Today — 产品首页（Stage H §13/§14）：回答五问，不是数据库 dashboard。
 *  E2E 契约保留：还没有宠物 / 直接快速记录按钮（喂食等）→ .alert.info 已记录。 */
const QUICK_TYPES: Array<{ type: string; label: string; payload: Record<string, string | number> }> = [
  { type: "daily.meal", label: "喂食", payload: { food_type: "狗粮", amount: "100", unit: "g" } },
  { type: "daily.drink", label: "饮水", payload: { amount: "200", unit: "ml" } },
  { type: "daily.elimination", label: "排泄", payload: { kind: "urine", quality: "normal" } },
  { type: "daily.walk", label: "散步", payload: { duration_minutes: 20, intensity: "normal" } },
  { type: "daily.play", label: "玩耍", payload: { duration_minutes: 15, activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", payload: { weight_kg: "12.0" } },
];

const SHEET_TYPES: QuickLogType[] = [
  ...QUICK_TYPES.map((q) => ({ type: q.type, label: q.label })),
  { type: "daily.sleep", label: "睡觉", payload: { duration_minutes: 60, quality: "normal" } },
  { type: "medication.administered", label: "用药" },
  { type: "behavior.observed", label: "行为" },
  { type: "diary.created", label: "备注", payload: {} },
];

const EVENT_LABELS: Record<string, string> = {
  "daily.meal": "进食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
};

export default function TodayPage() {
  const { petId } = useCurrentPet();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = useAsync<TodayData>(
    () => (petId ? api.get<TodayData>(`/pets/${petId}/today`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const tasks = useAsync<Task[]>(
    () =>
      petId
        ? api.get<Task[]>(`/pets/${petId}/tasks?status=OPEN`)
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );
  const hint = useAsync<{ hints?: Array<Record<string, string>> }>(
    () => (petId ? api.get(`/pets/${petId}/abnormal-day-hint`) : Promise.reject(new Error("NO_PET_SELECTED"))),
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
  const hasPet = !!petId && pets.some((p) => p.id === petId);
  const counts = today.data?.event_counts ?? {};
  const lastEvent = today.data?.events?.[0];
  const hints = (hint.data?.hints ?? []).filter((h) => Object.keys(h).length > 0);

  async function quickLog(q: (typeof QUICK_TYPES)[number]) {
    const target = current.id;
    try {
      await api.post(`/pets/${target}/events`, { event_type: q.type, payload: q.payload });
      setFlash(`已记录：${q.label}`);
      today.reload();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      // Offline UX（§63）：失败时保存草稿，恢复后可在 /offline 重试同步
      saveDraft("quicklog", { event_type: q.type, payload: q.payload });
      setFlash(`${mapErrorMessage(e)}（已保存草稿，恢复后可同步）`);
    }
  }

  async function sheetLog(type: string) {
    const q = SHEET_TYPES.find((s) => s.type === type);
    if (!q) return;
    await quickLog({ type: q.type, label: q.label, payload: (q.payload as Record<string, string | number>) ?? {} });
    setSheetOpen(false);
  }
  return (
    <main>
      <h1>{current.name} 今天怎么样？</h1>
      <p className="sub">
        {current.breed || current.species} · {today.data?.date ?? ""}
        {pets.length > 1 && " · 可在顶部切换多宠"}
      </p>
      {flash && <div className="alert info">{flash}</div>}

      {/* Living Canvas 主轴：Pet → Now → Change → Attention → Action（GOAL PHASE C）
          3D 生命视图入口始终可用；真实照片/记录是基础，不依赖 3D。 */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>{current.name} · 生命视图</h2>
            <p className="sub" style={{ margin: "4px 0 0" }}>
              {current.species}{current.breed ? ` · ${current.breed}` : ""} · 3D 形象与当前状态
            </p>
          </div>
          <Link href={`/pets/${current.id}/life-view`} className="btn primary" role="button">
            打开生命视图
          </Link>
        </div>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          3D 形象由真实照片生成并经你确认；它只描述外观，不推断任何健康信息。
        </p>
      </div>

      {/* Now — 现在怎么样（真实事实） */}
      <div className="card">
        <h2>现在</h2>
        {lastEvent ? (
          <p className="sub" style={{ margin: 0 }}>
            最后活动 · {fmtTime(lastEvent.occurred_at)}（{EVENT_LABELS[lastEvent.event_type] ?? lastEvent.event_type}）
          </p>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            今天还没有记录。
          </p>
        )}
        <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 6 }}>
          {Object.entries(counts).map(([et, n]) => (
            <span key={et} className="badge">
              {EVENT_LABELS[et] ?? et} × {n}
            </span>
          ))}
        </div>
      </div>

      {/* Change — 与它自己相比（基线对比，非诊断） */}
      <div className="card">
        <h2>变化</h2>
        {hints.length > 0 ? (
          <ul className="tl">
            {hints.slice(0, 3).map((h, i) => (
              <li key={i}>
                <div className="tl-body">
                  {h.message || h.hint || h.detail || "部分指标低于自己的近期范围"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            与它自己的近期基线相比，今天没有明显变化。
          </p>
        )}
        <p className="muted" style={{ marginTop: 8 }}>
          基于它自己的近期范围（Personal Baseline），不是医疗诊断。
        </p>
      </div>

      {/* Attention — 今天最值得注意什么 */}
      <div className="card">
        <h2>值得注意</h2>
        {hints.length > 0 ? (
          <>
            <ul className="tl">
              {hints.slice(0, 2).map((h, i) => (
                <li key={i}>
                  <div className="tl-body">{h.message || h.hint || h.detail || "值得关注"}</div>
                </li>
              ))}
            </ul>
            <div className="row" style={{ marginTop: 8 }}>
              <Link
                href={`/agent?tab=explain&ctx=${encodeURIComponent("今日值得关注的事项")}`}
                className="btn"
                style={{ fontSize: 12, minHeight: 30, padding: "3px 10px" }}
              >
                [查看依据]
              </Link>
            </div>
          </>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            没有需要特别注意的事项。
          </p>
        )}
      </div>

      {/* Action — 下一步能做什么 */}
      <div className="card">
        <h2>下一步</h2>
        <div className="quickgrid">
          {QUICK_TYPES.map((q) => (
            <button key={q.type} className="btn" onClick={() => quickLog(q)}>
              {q.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            更多记录类型 ▾
          </button>
        </div>
        <p className="muted">所有记录都会带来源（provenance）与记录人（actor）进入事件图。</p>
      </div>

      <QuickLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        types={SHEET_TYPES}
        onQuickLog={sheetLog}
        title="快速记录"
      />

      {/* Today Tasks */}
      <div className="card">
        <h2>今天</h2>
        {hasPet ? (
          <State
            state={tasks.state}
            error={tasks.error ? mapErrorMessage(tasks.error) : null}
            onRetry={tasks.reload}
            empty="没有待办任务。"
          >
            <ul className="tl">
              {tasks.data?.map((task) => (
                <li key={task.id}>
                  <div className="tl-head">
                    <span className="tl-type">{task.status === "COMPLETED" ? "✓" : "○"} {task.title}</span>
                    <span className="tl-time">{task.due_at ? `due ${fmtTime(task.due_at)}` : "无截止"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </State>
        ) : (
          <div className="state">请先在顶部选择一只宠物。</div>
        )}
      </div>

      {/* Recent Events + Monitoring/Companion entry + Timeline Preview */}
      <div className="card">
        <h2>最近</h2>
        {hasPet ? (
          <State
            state={today.state}
            error={today.error ? mapErrorMessage(today.error) : null}
            onRetry={today.reload}
            empty="今天还没有记录。"
          >
            <ul className="tl">
              {today.data?.events.slice(0, 4).map((e) => (
                <li key={e.event_id}>
                  <div className="tl-head">
                    <span className="tl-type">{e.event_type}</span>
                    <ProvenanceBadge level={e.provenance_level} />
                    <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </State>
        ) : (
          <div className="state">请先在顶部选择一只宠物。</div>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <Link href="/monitoring" className="btn">
            看看它
          </Link>
          <Link href="/companion" className="btn">
            陪伴
          </Link>
          <Link href="/timeline" className="btn">
            查看完整时间线
          </Link>
        </div>
      </div>

      {/* AI Summary — 服务未开放时诚实显示 */}
      <div className="card">
        <h2>AI 摘要</h2>
        <div className="state">服务暂未开放</div>
      </div>
    </main>
  );
}
