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
import { PetCollectionGate } from "../components/pet-collection-gate";
import { ActionCard } from "./_components/today/ActionCard";
import { AttentionCard, type TodayAttentionState } from "./_components/today/AttentionCard";
import { ChangeCard } from "./_components/today/ChangeCard";
import { NowCard } from "./_components/today/NowCard";
import { RecentCard } from "./_components/today/RecentCard";
import { TasksCard } from "./_components/today/TasksCard";
import { SHEET_TYPES, type TodayData } from "./_components/today/constants";
import { observedActivityMinutes } from "./_components/today/activity";
import { poseForEvent } from "@pli/pet-3d";

interface TodayHealthEvent {
  status?: string | null;
  latest_triage_level?: string | null;
  chief_complaint?: string | null;
}

type DayHintEntry = string | Record<string, string>;

interface DayHintExplanation {
  metric: string;
  label: string;
  unit: string;
  current_value: number;
  same_time_baseline: number | null;
  sample_count: number;
  window_days: number;
  deviation_percent: number | null;
  direction: "LOWER" | "HIGHER" | "SIMILAR" | "INSUFFICIENT";
  notable: boolean;
  fact: string;
  comparison: string;
  uncertainty: string;
  next_step: string;
}

interface DayHintResponse {
  status?: "INSUFFICIENT" | "STABLE" | "NOTABLE";
  hints?: DayHintEntry[];
  rule?: string;
  explanations?: DayHintExplanation[];
}

function ownerFacingHealthText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  if (!text) return fallback;
  // Backend fixture / workflow identifiers are evidence keys, not owner copy.
  // Preserve the health state while keeping internal ids out of the product UI.
  if (/^(?:BW|HE|EV)-[A-Za-z0-9_-]+$/i.test(text)) return fallback;
  return text;
}

/** OWN-001 Today — Pet Living Stage（R2-P §7.1）：宠物是首屏视觉中心，
 *  此刻/变化/注意/动作/记忆依次展开。E2E 契约保留：快速记录 → .alert.info。 */
export default function TodayPage() {
  const { petId } = useCurrentPet();
  // Demo disclosure is an environment truth, not a permanent decoration.
  // Production/real-data sessions must never be mislabeled as "示例数据".
  const demoMode = process.env.NEXT_PUBLIC_PLI_DEMO_ENV === "1";
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), [petId]);
  // A Quick Log form is owned by the pet active when it opened. Changing the
  // selected pet must unmount its inputs, not silently retarget draft facts.
  const [sheetPetId, setSheetPetId] = useState<string | null>(null);
  useEffect(() => { setSheetPetId(null); }, [petId]);
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
  const hint = useAsync<DayHintResponse>(
    () => (petId ? api.get(`/pets/${petId}/abnormal-day-hint`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const health = useAsync<TodayHealthEvent[]>(
    () => (petId ? api.get(`/pets/${petId}/health-events`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const [flash, setFlash] = useState<string | null>(null);

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

  if (pets.state !== "ready") {
    return <PetCollectionGate surface="today" state={pets.state} onRetry={pets.reload} />;
  }
  const petRows = pets.data ?? [];
  if (petRows.length === 0) {
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

  const current = petRows.find((p) => p.id === petId) ?? petRows[0];
  const hasPet = !!petId && petRows.some((p) => p.id === petId);
  const counts = today.data?.event_counts ?? {};
  const lastEvent = today.data?.events?.find((e) => e.event_type !== "today.viewed") ?? today.data?.events?.[0];
  const representativePose = poseForEvent(lastEvent?.event_type ?? null) ?? "Idle";
  const activityMinutes = observedActivityMinutes(today.data?.events ?? []);
  const hintMessages = (hint.data?.hints ?? [])
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : entry.message || entry.hint || entry.detail || "",
    )
    .filter((value): value is string => Boolean(value.trim()));
  const abnormalChange =
    hintMessages.find(
      (value) => !value.includes("暂未出现需要突出显示的变化") && !value.includes("无明显异常"),
    ) ?? null;
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const changeDetail =
    hint.data?.explanations?.find((row) => row.notable) ??
    hint.data?.explanations?.find((row) => row.direction !== "INSUFFICIENT") ??
    hint.data?.explanations?.[0];
  const baselineInsufficient = hint.state === "ready" && hint.data?.status === "INSUFFICIENT";
  const changeUnknown = hint.state !== "ready" || baselineInsufficient;
  const changeSummary =
    hint.state !== "ready"
      ? "今天的自身基线暂时没有完整读取到。"
      : baselineInsufficient
        ? "与它自己相比：同期基线记录还不够，暂时不能判断变化。"
        : abnormalChange
          ? abnormalChange
          : "与它自己相比：今天暂未出现需要突出显示的变化。";
  const changeEvidence =
    hint.state !== "ready"
      ? "不会把未知状态显示成“没有变化”"
      : baselineInsufficient
        ? changeDetail?.comparison ?? "至少需要 3 天同一时间点的可比记录。"
        : changeDetail?.comparison ?? hint.data?.rule ?? "只比较同一时间点、同一指标口径的已记录事实";

  const attentionState: TodayAttentionState = (() => {
    if (health.state !== "ready") {
      return {
        kind: "unknown",
        body: "健康记录没有完整读取到。",
        footer: "不会把未知状态显示成“没有风险”",
      };
    }
    const rows = Array.isArray(health.data) ? health.data : [];
    const danger = rows.find(
      (row) => row.latest_triage_level === "URGENT" || row.latest_triage_level === "EMERGENCY",
    );
    if (danger) {
      return {
        kind: "danger",
        body: ownerFacingHealthText(danger.chief_complaint, "有一条健康记录触发了高风险分级。"),
        footer: "由独立风险分级规则判定；不是模型生成的诊断",
      };
    }
    const focus = rows.find((row) => row.status !== "CLOSED" && Boolean(row.latest_triage_level));
    if (focus) {
      return {
        kind: "attention",
        body: ownerFacingHealthText(focus.chief_complaint, "有一条仍在跟进的健康记录。"),
        footer: "来自已记录的健康事件；不是诊断结论",
      };
    }
    return {
      kind: "calm",
      body: "当前已读取的健康记录没有触发需要立即处理的规则。",
      footer: "这不等同于“健康正常”",
    };
  })();
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
  const headline = totalCount === 0 ? "今天还没有新的记录" : `今天记录了 ${totalCount} 件生活片段`;
  const recent = lastEvent
    ? `最近记录 · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `今天 · ${new Date().toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}`;

  async function quickLog(
    eventType: string,
    label: string,
    payload: Record<string, string | number>,
    artifactIds: string[] = [],
  ) {
    const target = current.id;
    try {
      await api.post(`/pets/${target}/events`, {
        event_type: eventType,
        payload,
        artifact_ids: artifactIds,
      });
      setFlash(`已记录：${label}${artifactIds.length ? ` · 已绑定 ${artifactIds.length} 个媒体` : ""}`);
      today.reload();
      setTimeout(() => setFlash(null), 2500);
    } catch (e) {
      // Offline UX（§63）：失败时保存草稿，恢复后可在 /offline 重试同步。
      // Already-uploaded artifact ids are retained in the draft so recovery
      // does not silently drop evidence.
      saveDraft("quicklog", { pet_id: target, event_type: eventType, payload, artifact_ids: artifactIds });
      setFlash(`${mapErrorMessage(e)}（已保存草稿，恢复后可同步）`);
    }
  }

  async function sheetLog(
    type: string,
    textValue?: string,
    files: File[] = [],
    fields: Record<string, string> = {},
  ) {
    const q = SHEET_TYPES.find((s) => s.type === type);
    if (!q) return;
    if (type === "diary.created") {
      const text = textValue?.trim();
      if (!text) return;
      try {
        await api.post(`/pets/${current.id}/diary`, { text });
        setFlash("已记录：备注");
        today.reload();
        setSheetPetId(null);
        setTimeout(() => setFlash(null), 2500);
      } catch (e) {
        saveDraft("quicklog", { pet_id: current.id, endpoint: `/pets/${current.id}/diary`, text });
        setFlash(`${mapErrorMessage(e)}（备注已保存为草稿，恢复后可同步）`);
      }
      return;
    }
    const artifactIds: string[] = [];
    try {
      for (const file of files.slice(0, 3)) {
        const uploaded = await api.upload<{ artifact_id: string }>(`/pets/${current.id}/artifacts`, file);
        artifactIds.push(uploaded.artifact_id);
      }
    } catch (e) {
      // The event has NOT been saved. File objects are not recoverable from
      // localStorage; retain the open form instead of silently losing media.
      setFlash(`媒体上传失败，记录尚未保存：${mapErrorMessage(e)}`);
      throw e;
    }
    const payload: Record<string, string | number> = {};
    for (const [key, raw] of Object.entries(fields)) {
      const value = raw.trim();
      if (!value) continue;
      if (key === "duration_minutes") {
        const minutes = Number.parseInt(value, 10);
        if (Number.isFinite(minutes) && minutes >= 0) payload[key] = Math.min(minutes, 24 * 60);
        continue;
      }
      payload[key] = value;
    }
    await quickLog(q.type, q.label, payload, artifactIds);
    setSheetPetId(null);
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
          frameTarget={0.57}
          twin={twinDescriptor ? { ...twinDescriptor, version: twinVersion ?? 1 } : null}
          pose={twinDescriptor ? representativePose : null}
          sourceMediaCount={observedRegions || undefined}
          stageTestId="pli.today.living-stage"
          twinTestId="pli.today.pet-twin"
          anchorTestIdPrefix="pli.today.anchor"
          headlineTestId="pli.today.now-headline"
        />
      </div>

      <div className="v4-grid">
        <div>
          <NowCard lastEvent={lastEvent} counts={counts} />
          <ChangeCard
            summary={changeSummary}
            evidence={changeEvidence}
            fact={hint.state !== "ready" ? "今天的同期基线暂时没有完整读取到。" : changeDetail?.fact}
            comparison={changeDetail?.comparison}
            uncertainty={changeUnknown ? (changeDetail?.uncertainty ?? "记录不足或读取失败时，不会把未知状态显示成“没有变化”。") : changeDetail?.uncertainty}
            nextStep={changeDetail?.next_step}
            unknown={changeUnknown}
          />
          <AttentionCard state={attentionState} />
          <ActionCard petId={current.id} onMore={() => setSheetPetId(current.id)} />
        </div>
        <div className="v4-rail">
          {petRows.length > 1 && (
            <div className="v4-chip" style={{ margin: "14px 0 4px" }}>
              <Icon name="users" size={13} />
              可在顶部切换多宠
            </div>
          )}
          <RecentCard hasPet={hasPet} today={today} />

          <TasksCard hasPet={hasPet} tasks={tasks} />
        </div>
      </div>

      <QuickLogSheet
        key={current.id}
        open={sheetPetId === current.id}
        onClose={() => setSheetPetId(null)}
        types={SHEET_TYPES}
        onQuickLog={sheetLog}
        title="快速记录"
        identity={`${current.name} · ${identity}`}
      />
    </main>
  );
}