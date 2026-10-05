"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Pet, type Task } from "@pli/api-client";
import { QuickLogSheet } from "@pli/ui-kit";
import { useAsync, useCurrentPet } from "../lib/hooks";
import { saveDraft } from "../lib/drafts";
import { mapErrorMessage } from "../lib/i18n";
import { Icon } from "../components/icons";
import { PetLivingStage, type StageAnchor } from "../components/pet-living-stage";
import { ActionCard } from "./_components/today/ActionCard";
import { AttentionCard } from "./_components/today/AttentionCard";
import { NowCard } from "./_components/today/NowCard";
import { RecentCard } from "./_components/today/RecentCard";
import { TasksCard } from "./_components/today/TasksCard";
import { QUICK_TYPES, SHEET_TYPES, type TodayData } from "./_components/today/constants";

/** OWN-001 Today — Pet Living Stage（R2-P §7.1）：宠物是首屏视觉中心，
 *  此刻/变化/注意/动作/记忆依次展开。E2E 契约保留：快速记录 → .alert.info。 */
export default function TodayPage() {
  const { petId } = useCurrentPet();
  // Demo disclosure is an environment truth, not a permanent decoration.
  // Production/real-data sessions must never be mislabeled as "示例数据".
  const demoMode = process.env.NEXT_PUBLIC_PLI_DEMO_ENV === "1";
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

  // Individual Twin (R2P3D-R3 D): same canonical per-pet asset as Life View.
  const twin = useAsync<{ models: Array<Record<string, unknown>> }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const activeTwin = twin.data?.models?.find((m) => m.status === "ACTIVE") ?? null;
  const twinDescriptor = activeTwin
    ? ((activeTwin.artifact_map as Record<string, unknown>)?.twin_descriptor as import("@pli/pet-3d").TwinDescriptor | undefined) ?? null
    : null;
  const twinVersion = Number(activeTwin?.version ?? 0) || undefined;
  const twinMeta = (activeTwin?.metadata_json as Record<string, unknown> | undefined) ?? {};
  const demoTwin = twinMeta.demo_fixture === true;
  const observedRegions = (
    (twinDescriptor as { surface?: { observed_regions?: string[] } } | null)?.surface?.observed_regions ?? []
  ).length;

  if (pets === null) return <main className="v4-main"><div className="v4-loading" role="status"><span className="spinner" aria-hidden="true" />加载中……</div></main>;
  if (pets.length === 0) {
    return (
      <main className="v4-main">
        <div className="v4-sec">
          <h1>今日</h1>
          <div className="v4-calm" style={{ marginTop: 12 }} data-testid="pli.empty.pet">
            <span className="v4-calm-icon"><Icon name="paw" size={20} /></span>
            <div>
              <p className="v4-calm-title" data-testid="pli.empty.why">还没有宠物</p>
              <p className="v4-calm-body">先创建一只宠物档案，从这里开始记录它的每一天。</p>
            </div>
          </div>
          <div className="v4-linkrow">
            <Link href="/pets/new" className="v4-action v4-action--primary" role="button" data-testid="pli.empty.action">
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
  const lastEvent = today.data?.events?.find((e) => e.event_type !== "today.viewed") ?? today.data?.events?.[0];
  const activityMinutes = (today.data?.events ?? []).reduce((sum, e) => {
    const mins = Number((e.payload as Record<string, unknown> | undefined)?.duration_minutes) || 0;
    return sum + mins;
  }, 0);
  const hints = (hint.data?.hints ?? []).filter((h) => Object.keys(h).length > 0);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const hasAttention = hints.length > 0;
  const anchorValue = (n: number, unit: string) => (n > 0 ? `${n} ${unit}` : "—");
  const anchorsAll: StageAnchor[] = [
    { id: "food", label: "进食", value: anchorValue(counts["daily.meal"] ?? 0, "次"), icon: "food" },
    { id: "water", label: "饮水", value: anchorValue(counts["daily.drink"] ?? 0, "次"), icon: "water" },
    { id: "activity", label: "活动", value: anchorValue(activityMinutes, "分钟"), icon: "walk" },
    { id: "sleep", label: "睡眠", value: anchorValue(counts["daily.sleep"] ?? 0, "次"), icon: "sleep" },
  ];
  // INVARIANT: all four state anchors always render ("—" when 0) so the
  // blind-UI contract can count pli.today.anchor.{water,food,activity,sleep}.
  const anchors = anchorsAll;
  const headline =
    totalCount === 0 ? "今天还没有新的记录" : hasAttention ? "今天有值得留意的变化" : `今天记录了 ${totalCount} 件生活片段`;
  const recent = lastEvent
    ? `最近记录 · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `今天 · ${new Date().toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}`;

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

  const identity = [current.breed || current.species].filter(Boolean).join(" · ");

  return (
    <main className="v4-main">
      {flash && <div className="alert info">{flash}</div>}

      <div data-testid="pli.today.identity">
        <PetLivingStage
          name={current.name}
          petId={current.id}
          species={current.species}
          breed={current.breed}
          variant="today"
          stageRole="today"
          realityField="warm-living"
          anchors={anchors}
          headline={headline}
          caption={recent}
          demo={demoMode || demoTwin}
          frameTarget={0.27}
          twin={twinDescriptor ? { ...twinDescriptor, version: twinVersion ?? 1 } : null}
          sourceMediaCount={observedRegions || undefined}
          stageTestId="pli.today.living-stage"
          twinTestId="pli.today.pet-twin"
          anchorTestIdPrefix="pli.today.anchor"
          headlineTestId="pli.today.change"
        />
      </div>

      <div className="v4-grid">
        <div>
          <NowCard lastEvent={lastEvent} counts={counts} />
          <AttentionCard hints={hints} />
          <ActionCard quickTypes={QUICK_TYPES} onQuickLog={quickLog} onMore={() => setSheetOpen(true)} />
          <p className="v4-note" data-testid="pli.today.health-summary" style={{ margin: "10px 0 0" }}>
            {hints.length > 0 ? `健康：${hints.length} 项需要留意` : "当前没有规则标记的健康变化"}
          </p>
        </div>
        <div className="v4-rail">
          {pets.length > 1 && (
            <div className="v4-chip" style={{ margin: "14px 0 4px" }}>
              <Icon name="users" size={13} />
              可在顶部切换多宠
            </div>
          )}
          <TasksCard hasPet={hasPet} tasks={tasks} />

          {/* AI Summary — supporting utility; memory remains the final layer. */}
          <div className="v4-sec">
            <h2 className="v4-sec-title">AI 摘要</h2>
            <p className="v4-note" style={{ margin: "6px 0 0" }}>服务暂未开放。回答会基于真实记录生成，并保留不确定性说明。</p>
          </div>

          <RecentCard hasPet={hasPet} today={today} />
        </div>
      </div>

      <QuickLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        types={SHEET_TYPES}
        onQuickLog={sheetLog}
        title="快速记录"
        identity={`${current.name} · ${identity}`}
      />
    </main>
  );
}