"use client";

import { use, useMemo, useState } from "react";

import Link from "next/link";
import { api, type LifeEvent } from "@pli/api-client";
import { useAsync } from "../../../../lib/hooks";
import { t } from "../../../../lib/i18n";
import { Icon } from "../../../../components/icons";
import { PetLivingStage, type StageAnchor } from "../../../../components/pet-living-stage";
import { LivingModeSwitcher, type LivingMode } from "../../../../components/living-mode-switcher";
import { RealPhotoCard } from "./_components/RealPhotoCard";
import { EVENT_LABELS } from "../../../_components/today/constants";
import { EventList } from "../../../_components/timeline/EventList";
import { poseForEvent } from "@pli/pet-3d";
import { observedActivityMinutes } from "../../../_components/today/activity";
import { eventTypeLabel, provenanceLabel } from "../../../../lib/ownerLabels";

interface PetRow {
  name: string;
  species?: string | null;
  breed?: string | null;
  weight_note?: string | null;
}

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  computed_at: string;
}

interface TaskMini { status: string; }
interface DeviceMini { status: string; }
interface HealthMini { latest_triage_level: string | null; }
type TimeScope = "now" | "today" | "7d" | "30d" | "date";
interface VisualModelMini {
  version?: number;
  status?: string;
  activated_at?: string | null;
  retired_at?: string | null;
  artifact_map?: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
}

interface TodayMini {
  // /today and /events both return the canonical serialized LifeEvent shape.
  // Keep this boundary truthful so historical media/provenance fields survive
  // all the way into the shared timeline renderer.
  events?: LifeEvent[];
  event_counts?: Record<string, number>;
}

/** PET 3D LIFE VIEW — Pet Living Stage（R2-P §7.3 / v3.4 §46.8）。
 *  宠物是主视觉、状态锚点环绕、模式条切换内容；3D 诚实态只作为小字，不显示
 *  provider/model/raw key。无真实服务时诚实说明，不伪装成功、不把 blocker 设计成失败页。 */
export default function PetLifeViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string | string[]; anchor?: string | string[] }>;
}) {
  const petId = use(params).id;
  const query = use(searchParams);
  const rawRequestedDate = Array.isArray(query.date) ? query.date[0] : query.date;
  const requestedDate =
    rawRequestedDate && /^\d{4}-\d{2}-\d{2}$/.test(rawRequestedDate)
      ? rawRequestedDate
      : null;
  const rawRequestedAnchor = Array.isArray(query.anchor) ? query.anchor[0] : query.anchor;
  const requestedAnchor =
    rawRequestedAnchor && ["water", "meal", "activity", "sleep"].includes(rawRequestedAnchor)
      ? rawRequestedAnchor
      : null;
  const [mode, setMode] = useState<LivingMode>("now");
  // A Today anchor lands directly on the canonical Life View explanation.
  // Invalid query values are ignored; historical/date routes never infer a
  // current-state detail from an untrusted URL.
  const [detailId, setDetailId] = useState<string | null>(requestedDate ? null : requestedAnchor);
  const [timeScope, setTimeScope] = useState<TimeScope>(requestedDate ? "date" : "now");
  const [selectedDate, setSelectedDate] = useState(() => requestedDate ?? new Date().toISOString().slice(0, 10));
  const currentFactScope = timeScope === "now" || timeScope === "today";
  const historicalRange = timeScope === "7d" || timeScope === "30d";

  const pet = useAsync<PetRow>(
    () => (petId ? api.get(`/pets/${petId}`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const today = useAsync<TodayMini>(
    async () => {
      if (!petId) throw new Error("NO_PET");
      if (timeScope === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return { events: [], event_counts: {} };
        return api.get(`/pets/${petId}/today?date=${selectedDate}`);
      }
      if (timeScope === "7d" || timeScope === "30d") {
        const days = timeScope === "7d" ? 7 : 30;
        const response = await api.get<{ events: TodayMini["events"] }>(`/pets/${petId}/events?limit=200`);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return {
          events: (response.events ?? []).filter((event) => {
            const at = new Date(event.occurred_at).getTime();
            return Number.isFinite(at) && at >= cutoff;
          }),
          event_counts: {},
        };
      }
      return api.get(`/pets/${petId}/today`);
    },
    [petId, timeScope, selectedDate],
  );
  const baseline = useAsync<BaselineRow[]>(
    () => (petId ? api.get(`/pets/${petId}/baseline`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const tasks = useAsync<TaskMini[]>(
    () => (petId ? api.get(`/pets/${petId}/tasks`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const devices = useAsync<DeviceMini[]>(
    () => (petId ? api.get(`/pets/${petId}/devices`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const health = useAsync<HealthMini[]>(
    () => (petId ? api.get(`/pets/${petId}/health-events`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  // Individual Twin (R2P3D-R3 D): the ACTIVE per-pet twin descriptor drives the
  // 3D stage on Life View too — same canonical asset as Android.
  const twin = useAsync<{ models: VisualModelMini[] }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const activeTwin = twin.data?.models.find((m) => m.status === "ACTIVE") ?? null;
  const historicalTwin = useMemo(() => {
    if (timeScope !== "date" || twin.state !== "ready" || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return null;
    const dayStart = new Date(`${selectedDate}T00:00:00+08:00`).getTime();
    const dayEnd = new Date(`${selectedDate}T23:59:59.999+08:00`).getTime();
    return (twin.data?.models ?? [])
      .filter((model) => {
        const descriptor = (model.artifact_map as { twin_descriptor?: import("@pli/pet-3d").TwinDescriptor } | undefined)?.twin_descriptor;
        if (!descriptor || !model.activated_at) return false;
        const activated = new Date(model.activated_at).getTime();
        const retired = model.retired_at ? new Date(model.retired_at).getTime() : Number.POSITIVE_INFINITY;
        return Number.isFinite(activated) && activated <= dayEnd && retired >= dayStart;
      })
      .sort((a, b) => (b.activated_at ?? "").localeCompare(a.activated_at ?? ""))[0] ?? null;
  }, [timeScope, selectedDate, twin.state, twin.data]);

  const displayModel =
    currentFactScope
      ? activeTwin
      : timeScope === "date"
        ? historicalTwin
        : null;
  const displayDescriptor = displayModel
    ? ((displayModel.artifact_map as { twin_descriptor?: import("@pli/pet-3d").TwinDescriptor } | undefined)?.twin_descriptor ?? null)
    : null;
  const displayVersion = Number(displayModel?.version ?? 0) || undefined;
  const observedRegions = (
    (displayDescriptor as { surface?: { observed_regions?: string[] } } | null)?.surface?.observed_regions ?? []
  ).length;
  const displayMeta = (displayModel?.metadata_json as Record<string, unknown> | undefined) ?? {};
  const isDemoTwin = displayMeta.demo_fixture === true;
  const scopeLabel =
    timeScope === "now" ? "此刻" :
    timeScope === "today" ? "今天" :
    timeScope === "7d" ? "最近 7 天" :
    timeScope === "30d" ? "最近 30 天" :
    selectedDate;

  if (pet.state === "denied") {
    return (
      <main className="v4-main">
        <h1>{t("pets.detail")} · 生命视图</h1>
        <div className="v4-error" role="alert">
          没有查看此内容的权限（403）。如需访问，请联系宠物主人授权。
        </div>
        <div className="v4-linkrow">
          <Link href="/" className="v4-action v4-action--primary" role="button">
            {t("notFound.home")}
          </Link>
        </div>
      </main>
    );
  }

  const name = pet.data?.name ?? "它";
  const events = (today.data?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
    return acc;
  }, {});
  const anchorValue = (n: number, unit: string) => (n > 0 ? `${n} ${unit}` : "—");
  const observedDurationMinutes = (eventType: string) =>
    events
      .filter((event) => event.event_type === eventType)
      .reduce((total, event) => {
        const minutes = Number(event.payload?.duration_minutes);
        return Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60 ? total + minutes : total;
      }, 0);
  const sleepMinutes = observedDurationMinutes("daily.sleep");
  const comparisonFor = (metric: string | null, current: number) => {
    if (timeScope === "date") return "历史常态未版本化，不用当前常态解释过去";
    if (historicalRange) return "这是时间范围汇总，不与单日常态直接比较";
    if (!metric) return "暂无（当前没有同口径常态）";
    if (current <= 0) return "暂无（今天没有足够记录）";
    if (baseline.state === "loading") return "常态读取中";
    if (baseline.state !== "ready") return "常态暂时不可用";
    const row = baseline.data?.find((item) => item.metric === metric);
    const usual = Number(row?.value);
    if (!row || row.sample_count < 3 || !Number.isFinite(usual) || usual <= 0) return "数据还不足以比较";
    const delta = Math.round(((current - usual) / usual) * 100);
    if (Math.abs(delta) < 5) return `接近最近 ${row.window_days} 天常态（${row.sample_count} 天样本）`;
    return `比最近 ${row.window_days} 天常态${delta > 0 ? "高" : "低"} ${Math.abs(delta)}%（${row.sample_count} 天样本）`;
  };
  // All owner clients share one observed-facts contract. Medication, sleep and
  // invalid or implausible durations cannot silently become activity minutes.
  const activityMinutes = observedActivityMinutes(events.map((event) => ({
    event_type: event.event_type,
    payload: event.payload ?? {},
  })));
  type LifeDetail = {
    id: string;
    label: string;
    value: string;
    source: string;
    updatedAt: string;
    evidence: string;
    compare: string;
  };

  const eventsFor = (types: string[]) => events.filter((event) => types.includes(event.event_type));
  const detailFor = (id: string, label: string, value: string, types: string[], baselineMetric: string | null, current: number): LifeDetail => {
    const matching = eventsFor(types);
    const latest = matching[0] ?? null;
    const sources = Array.from(
      new Set(matching.map((event) => provenanceLabel(event.source_type)).filter(Boolean)),
    );
    return {
      id,
      label,
      value,
      source: sources.length ? sources.join(" + ") : "暂无来源记录",
      updatedAt: latest
        ? new Date(latest.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "暂无更新时间",
      evidence: latest
        ? `${eventTypeLabel(latest.event_type)} · ${new Date(latest.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
        : "暂无记录",
      // Compare only when this fact and the backend personal baseline share
      // the same metric/unit and have enough real sample days.
      compare: comparisonFor(baselineMetric, current),
    };
  };

  const detailRows: LifeDetail[] = [
    detailFor("water", "饮水", anchorValue(counts["daily.drink"] ?? 0, "次"), ["daily.drink"], null, counts["daily.drink"] ?? 0),
    detailFor("meal", "进食", anchorValue(counts["daily.meal"] ?? 0, "次"), ["daily.meal"], "meal_count_per_day", counts["daily.meal"] ?? 0),
    detailFor("activity", "活动", anchorValue(activityMinutes, "分钟"), ["daily.walk", "daily.play"], null, activityMinutes),
    detailFor("sleep", "睡眠", anchorValue(sleepMinutes, "分钟"), ["daily.sleep"], "sleep_minutes_per_day", sleepMinutes),
  ];
  const anchorsAll: StageAnchor[] = detailRows.map((detail) => ({
    id: detail.id,
    label: detail.label,
    value: detail.value,
    icon: detail.id === "water" ? "water" : detail.id === "meal" ? "food" : detail.id === "activity" ? "walk" : "sleep",
    onPress: () => setDetailId(detail.id),
  }));
  const activeDetail = detailRows.find((detail) => detail.id === detailId) ?? null;
  // INVARIANT: anchors always render ("—" when 0); never filtered out.
  const anchors = anchorsAll;

  const lastEvent = events[0] ?? null;
  const representativePose = poseForEvent(lastEvent?.event_type ?? null) ?? "Idle";
  const nowLine = lastEvent
    ? `最近一次记录：${EVENT_LABELS[lastEvent.event_type] ?? "活动"} · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `${scopeLabel}还没有足够记录。`;

  const freshness = lastEvent
    ? `更新 ${new Date(lastEvent.occurred_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `${scopeLabel}暂无新记录`;
  const openTaskCount = (tasks.data ?? []).filter((task) => task.status === "OPEN").length;
  const weightText = pet.data?.weight_note?.trim() || "未记录";
  const taskText =
    tasks.state === "loading"
      ? "读取中"
      : tasks.state !== "ready"
        ? "暂不可用"
        : openTaskCount > 0
          ? `${openTaskCount} 项待办`
          : "暂无待办";
  const deviceRows = devices.data ?? [];
  const deviceText =
    devices.state === "loading"
      ? "读取中"
      : devices.state !== "ready"
        ? "暂不可用"
        : deviceRows.length === 0
          ? "未连接"
          : deviceRows.every((device) => ["connected", "online"].includes(String(device.status).toLowerCase()))
            ? `${deviceRows.length} 个在线`
            : deviceRows.some((device) => String(device.status).toLowerCase() === "offline")
              ? "有设备离线"
              : "状态待确认";
  const healthRows = health.data ?? [];
  const healthText =
    health.state === "loading"
      ? "读取中"
      : health.state !== "ready"
        ? "暂不可用"
        : healthRows.some((row) => row.latest_triage_level === "URGENT" || row.latest_triage_level === "EMERGENCY")
          ? "需立即关注"
          : healthRows.length > 0
            ? "有健康记录"
            : "暂无记录";

  const modelStatus =
    timeScope === "date"
      ? twin.state === "loading"
        ? "历史 3D 版本读取中"
        : twin.state === "error"
          ? "历史 3D 版本暂不可用"
          : historicalTwin
            ? `历史第 ${displayVersion ?? "—"} 版 · ${historicalTwin.activated_at ? new Date(historicalTwin.activated_at).toLocaleDateString("zh-CN") : "日期未知"} 激活`
            : "该日无可确认 3D 版本"
      : historicalRange
        ? "时间范围汇总 · 不使用当前 3D"
        : twin.state === "loading"
          ? "3D 状态读取中"
          : twin.state === "error"
            ? "3D 状态暂时不可用"
            : displayDescriptor
              ? isDemoTwin
                ? "示例形象 · 仅用于体验"
                : "个体形象 · 已确认"
              : "暂无已确认个体 3D";


  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>生命视图</h1>
        <p className="v4-topline-sub" data-testid="pli.lifeview.identity">{name} · {scopeLabel}</p>
      </div>
      <div className="v4-filter-row" aria-label="生命视图状态" style={{ marginBottom: 12 }}>
        <span className="v4-chip" data-testid="pli.lifeview.freshness">{freshness}</span>
        <span className="v4-chip" data-testid="pli.lifeview.model-status">{modelStatus}</span>
      </div>

      <div className="v7-life-time-scrubber" data-testid="pli.lifeview.time-scrubber" aria-label="生命视图时间范围">
        {([
          ["now", "现在"],
          ["today", "今天"],
          ["7d", "7天"],
          ["30d", "30天"],
          ["date", "某一天"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`v7-life-time-chip${timeScope === value ? " is-active" : ""}`}
            aria-pressed={timeScope === value}
            data-testid={`pli.lifeview.time.${value}`}
            onClick={() => { setTimeScope(value); setDetailId(null); }}
          >
            {label}
          </button>
        ))}
        {timeScope === "date" ? (
          <label className="v7-life-date">
            <span>查看日期</span>
            <input
              type="date"
              value={selectedDate}
              data-testid="pli.lifeview.time.date-input"
              onChange={(event) => { setSelectedDate(event.target.value); setDetailId(null); }}
            />
          </label>
        ) : null}
      </div>

      <div className="r5-life-stage-shell">
      <PetLivingStage
        name={name}
        petId={petId}
        species={pet.data?.species}
        breed={pet.data?.breed}
        headline={mode === "now" ? `${name} · ${scopeLabel}` : undefined}
        variant="life"
        stageRole="life"
        realityField="twin-space"
        demo={(currentFactScope && process.env.NEXT_PUBLIC_PLI_DEMO_ENV === "1") || Boolean(displayModel && isDemoTwin)}
        anchors={anchors}
        caption={mode === "now" ? nowLine : undefined}
        note={historicalRange ? "时间范围汇总不使用当前 3D 形象冒充历史。" : timeScope === "date" && !historicalTwin ? "该日没有可确认的历史 3D 版本；保留真实记录。" : undefined}
        frameTarget={0.55}
        twin={displayDescriptor ? { ...displayDescriptor, version: displayVersion ?? 1 } : null}
        pose={displayDescriptor ? representativePose : null}
        sourceMediaCount={observedRegions || undefined}
        allowOwnerPhoto={currentFactScope}
        interactive={Boolean(displayDescriptor)}
        stageTestId="pli.lifeview.stage"
        twinTestId="pli.lifeview.twin"
        anchorTestIdPrefix="pli.lifeview.anchor"
      />
      </div>

      <LivingModeSwitcher value={mode} onChange={setMode} />

      {currentFactScope ? (
      <div className="v7-life-support" data-testid="pli.lifeview.support-facts" aria-label="体重、任务与设备状态">
        <Link href={`/pets/${petId}`} className="v7-life-support-item" data-testid="pli.lifeview.support.weight">
          <span className="v7-life-support-label">体重</span>
          <strong>{weightText}</strong>
        </Link>
        <Link href="/health" className="v7-life-support-item" data-testid="pli.lifeview.support.health">
          <span className="v7-life-support-label">健康</span>
          <strong className={healthText === "需立即关注" ? "v7-life-support-danger" : undefined}>{healthText}</strong>
        </Link>
        <Link href="/" className="v7-life-support-item" data-testid="pli.lifeview.support.tasks">
          <span className="v7-life-support-label">任务</span>
          <strong>{taskText}</strong>
        </Link>
        <Link href="/monitoring" className="v7-life-support-item" data-testid="pli.lifeview.support.devices">
          <span className="v7-life-support-label">设备</span>
          <strong>{deviceText}</strong>
        </Link>
      </div>
      ) : (
        <div className="v7-life-history-truth" data-testid="pli.lifeview.history-truth">
          历史范围只显示当时存在的事件和可验证 3D 版本；今天的体重、任务、健康、设备和头像不会倒灌到过去。
        </div>
      )}


      {activeDetail ? (
        <section className="v7-life-detail" data-testid="pli.lifeview.anchor-detail" aria-live="polite">
          <div className="v7-life-detail-head">
            <div>
              <p className="v7-life-detail-kicker">此刻的记录详情</p>
              <h2>{activeDetail.label} · {activeDetail.value}</h2>
            </div>
            <button type="button" className="btn" onClick={() => setDetailId(null)} aria-label="关闭状态详情">关闭</button>
          </div>
          <dl className="v7-life-detail-grid">
            <div><dt>事实</dt><dd>{activeDetail.value}</dd></div>
            <div><dt>与自己相比</dt><dd>{activeDetail.compare}</dd></div>
            <div><dt>来源</dt><dd>{activeDetail.source}</dd></div>
            <div><dt>更新时间</dt><dd>{activeDetail.updatedAt}</dd></div>
            <div><dt>证据</dt><dd>{activeDetail.evidence}</dd></div>
          </dl>
          <Link href="/timeline" className="v4-action v4-action--secondary">在时间线里查看原始记录</Link>
        </section>
      ) : null}

      <div className="v4-grid">
        <div>
          {mode === "now" ? (
            <div className="v4-sec" data-testid="pli.lifeview.panel">
              <h2 className="v4-sec-title">此刻</h2>
              <p className="v4-sec-sub" style={{ marginTop: 6 }}>
                {events.length > 0
                  ? currentFactScope
                    ? "上面的数值来自今天真实的记录。"
                    : `${scopeLabel}的数值只汇总该范围内真实存在的记录；不会混入今天的状态。`
                  : currentFactScope
                    ? "今天还没有足够记录，记下第一件事后，这里会围绕它展开。"
                    : `${scopeLabel}没有已记录事件。`}
              </p>
            </div>
          ) : null}

          {timeScope === "date" ? (
            <div className="v4-sec" data-testid="pli.lifeview.history-events">
              <h2 className="v4-sec-title">那一天的记录</h2>
              <p className="v4-sec-sub" style={{ marginTop: 6 }}>
                这里只展示 {selectedDate} 当天真实存在的事件、来源和原始媒体；不会用今天的内容补齐。
              </p>
              <EventList events={events} petName={name} />
            </div>
          ) : null}

          {mode === "trend" ? (
            <div className="v4-sec">
              <h2 className="v4-sec-title">趋势</h2>
              <div className="v4-statsline" style={{ marginTop: 8 }}>
                {events.length > 0 ? (
                  anchors.map((a) => (
                    <span key={a.id} className="v4-chip">
                      <span className="v4-chip-icon"><Icon name={a.icon} size={13} /></span>
                      {a.label} {a.value}
                    </span>
                  ))
                ) : (
                  <p className="v4-sec-sub">数据积累后，这里会展示它自己的趋势。</p>
                )}
              </div>
            </div>
          ) : null}

          {mode === "appearance" ? (
            <div className="v4-sec">
              <h2 className="v4-sec-title">外观</h2>
              <p className="v4-sec-sub" style={{ marginTop: 6 }}>
                {timeScope === "date"
                  ? historicalTwin
                    ? `这一天使用当时有效的第 ${displayVersion ?? "—"} 版 3D 形象；不会使用后来版本替代。`
                    : "这一天没有可确认的历史 3D 版本；不会用现在的样子补画过去。"
                  : historicalRange
                    ? "该时间范围跨越多个日期，不使用当前 3D 形象代表整个历史区间。"
                    : displayDescriptor
                      ? isDemoTwin
                        ? "当前显示示例 3D 形象，用于体验交互。它来自演示模板，不代表真实宠物扫描或已验证个体外观。"
                        : `现在显示的是${name}已由你确认的个体 3D 形象。外观不会替代真实照片与记录。`
                      : "当前还没有已确认的个体 3D 形象。真实照片与记录仍可正常使用；补充素材并完成确认后，才会显示它的个体 3D 形象。"}              </p>
            </div>
          ) : null}

          {currentFactScope ? <RealPhotoCard petId={petId} /> : null}
        </div>

        <div className="v4-rail">
          <div className="v4-sec" style={{ paddingTop: 18 }}>
            <h2 className="v4-sec-title">真实记录始终可信</h2>
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                {currentFactScope
                  ? displayDescriptor
                    ? isDemoTwin
                      ? "当前是演示 3D 形象，仅用于验证产品体验；照片、记录与规则结论始终独立于外观。"
                      : "当前个体 3D 形象已经过你的确认；照片、记录与规则结论始终独立于外观。"
                    : "当前还没有已确认的个体 3D 形象；照片、记录与规则结论仍可独立使用。"
                  : "历史范围只使用当时存在的事件、媒体与可验证模型版本；不会把当前状态反向填入过去。"}              </p>
          </div>
        </div>
      </div>
    </main>
  );
}