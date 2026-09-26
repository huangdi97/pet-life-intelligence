"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Pet, type Task } from "@pli/api-client";
import { QuickLogSheet } from "@pli/ui-kit";
import { useAsync, useCurrentPet } from "../lib/hooks";
import { saveDraft } from "../lib/drafts";
import { mapErrorMessage } from "../lib/i18n";
import { PetHero } from "../components/pet-hero";
import { Icon } from "../components/icons";
import { ActionCard } from "./_components/today/ActionCard";
import { AttentionCard } from "./_components/today/AttentionCard";
import { NowCard } from "./_components/today/NowCard";
import { RecentCard } from "./_components/today/RecentCard";
import { TasksCard } from "./_components/today/TasksCard";
import { QUICK_TYPES, SHEET_TYPES, type TodayData } from "./_components/today/constants";

/** OWN-001 Today — Living Canvas（Stage R.2）：
 *  Pet → Now → Attention/Calm → Action → Recent Memory。
 *  E2E 契约保留：还没有宠物 / 快速记录按钮（喂食等）→ .alert.info 已记录。 */
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

  if (pets === null) return <main className="v4-main"><div className="v4-loading" role="status"><span className="spinner" aria-hidden="true" />加载中……</div></main>;
  if (pets.length === 0) {
    return (
      <main className="v4-main">
        <div className="v4-sec">
          <h1>今日</h1>
          <div className="v4-calm" style={{ marginTop: 12 }}>
            <span className="v4-calm-icon"><Icon name="paw" size={20} /></span>
            <div>
              <p className="v4-calm-title">还没有宠物</p>
              <p className="v4-calm-body">先创建一只宠物档案，从这里开始记录它的每一天。</p>
            </div>
          </div>
          <div className="v4-linkrow">
            <Link href="/pets/new" className="v4-action v4-action--primary" role="button">
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

  const identity = [current.breed || current.species, today.data?.date ?? ""].filter(Boolean).join(" · ");

  return (
    <main className="v4-main">
      {flash && <div className="alert info">{flash}</div>}

      <PetHero
        name={current.name}
        petId={current.id}
        title={
          <h1 className="v4-hero-title">
            {current.name} 今天怎么样？
          </h1>
        }
        line={identity || `${current.species} · ${today.data?.date ?? ""}`}
      />
      <div className="v4-grid">
        <div>
          <NowCard lastEvent={lastEvent} counts={counts} />
          <AttentionCard hints={hints} />
          <ActionCard quickTypes={QUICK_TYPES} onQuickLog={quickLog} onMore={() => setSheetOpen(true)} />
        </div>
        <div className="v4-rail">
          {pets.length > 1 && (
            <div className="v4-chip" style={{ margin: "14px 0 4px" }}>
              <Icon name="users" size={13} />
              可在顶部切换多宠
            </div>
          )}
          <RecentCard hasPet={hasPet} today={today} />
          <TasksCard hasPet={hasPet} tasks={tasks} />

          {/* AI Summary — 服务未开放时诚实显示 */}
          <div className="v4-sec">
            <h2 className="v4-sec-title">AI 摘要</h2>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>服务暂未开放。回答会基于真实记录生成，并保留不确定性说明。</p>
          </div>
        </div>
      </div>

      <QuickLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        types={SHEET_TYPES}
        onQuickLog={sheetLog}
        title="快速记录"
      />
    </main>
  );
}
