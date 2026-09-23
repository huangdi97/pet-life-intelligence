"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Pet, type Task } from "@pli/api-client";
import { QuickLogSheet } from "@pli/ui-kit";
import { useAsync, useCurrentPet } from "../lib/hooks";
import { saveDraft } from "../lib/drafts";
import { mapErrorMessage } from "../lib/i18n";
import { ActionCard } from "./_components/today/ActionCard";
import { AttentionCard } from "./_components/today/AttentionCard";
import { ChangeCard } from "./_components/today/ChangeCard";
import { LifeViewCard } from "./_components/today/LifeViewCard";
import { NowCard } from "./_components/today/NowCard";
import { RecentCard } from "./_components/today/RecentCard";
import { TasksCard } from "./_components/today/TasksCard";
import { EVENT_LABELS, QUICK_TYPES, SHEET_TYPES, type TodayData } from "./_components/today/constants";

/** OWN-001 Today — 产品首页（Stage H §13/§14）：回答五问，不是数据库 dashboard。
 *  E2E 契约保留：还没有宠物 / 直接快速记录按钮（喂食等）→ .alert.info 已记录。 */
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

      <LifeViewCard petId={current.id} name={current.name} species={current.species} breed={current.breed} />
      <NowCard lastEvent={lastEvent} counts={counts} labels={EVENT_LABELS} />
      <ChangeCard hints={hints} />
      <AttentionCard hints={hints} />
      <ActionCard quickTypes={QUICK_TYPES} onQuickLog={quickLog} onMore={() => setSheetOpen(true)} />

      <QuickLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        types={SHEET_TYPES}
        onQuickLog={sheetLog}
        title="快速记录"
      />

      <TasksCard hasPet={hasPet} tasks={tasks} />
      <RecentCard hasPet={hasPet} today={today} />

      {/* AI Summary — 服务未开放时诚实显示 */}
      <div className="card">
        <h2>AI 摘要</h2>
        <div className="state">服务暂未开放</div>
      </div>
    </main>
  );
}
