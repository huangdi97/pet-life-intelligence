"use client";

import { use, useState } from "react";

import Link from "next/link";
import { api } from "@pli/api-client";
import { useAsync } from "../../../../lib/hooks";
import { t } from "../../../../lib/i18n";
import { Icon } from "../../../../components/icons";
import { PetLivingStage, type StageAnchor } from "../../../../components/pet-living-stage";
import { LivingModeSwitcher, type LivingMode } from "../../../../components/living-mode-switcher";
import { RealPhotoCard } from "./_components/RealPhotoCard";
import { EVENT_LABELS } from "../../../_components/today/constants";
import { poseForEvent } from "@pli/pet-3d";
import { observedActivityMinutes } from "../../../_components/today/activity";
import { eventTypeLabel, provenanceLabel } from "../../../../lib/ownerLabels";

interface PetRow {
  name: string;
  species?: string | null;
  breed?: string | null;
}

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  computed_at: string;
}

interface TodayMini {
  events?: Array<{
    event_type: string;
    occurred_at: string;
    payload?: Record<string, unknown>;
    source_type?: string;
  }>;
  event_counts?: Record<string, number>;
}

/** PET 3D LIFE VIEW — Pet Living Stage（R2-P §7.3 / v3.4 §46.8）。
 *  宠物是主视觉、状态锚点环绕、模式条切换内容；3D 诚实态只作为小字，不显示
 *  provider/model/raw key。无真实服务时诚实说明，不伪装成功、不把 blocker 设计成失败页。 */
export default function PetLifeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [mode, setMode] = useState<LivingMode>("now");
  const [detailId, setDetailId] = useState<string | null>(null);

  const pet = useAsync<PetRow>(
    () => (petId ? api.get(`/pets/${petId}`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const today = useAsync<TodayMini>(
    () => (petId ? api.get(`/pets/${petId}/today`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const baseline = useAsync<BaselineRow[]>(
    () => (petId ? api.get(`/pets/${petId}/baseline`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  // Individual Twin (R2P3D-R3 D): the ACTIVE per-pet twin descriptor drives the
  // 3D stage on Life View too — same canonical asset as Android.
  const twin = useAsync<{ models: Array<Record<string, unknown>> }>(
    () => (petId ? api.get(`/pets/${petId}/visual-models`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const activeTwin = twin.data?.models.find((m) => m.status === "ACTIVE") ?? null;
  const twinDescriptor = activeTwin
    ? ((activeTwin.artifact_map as Record<string, unknown>)?.twin_descriptor as import("@pli/pet-3d").TwinDescriptor | undefined) ?? null
    : null;
  const twinVersion = Number(activeTwin?.version ?? 0) || undefined;
  const observedRegions = (
    (twinDescriptor as { surface?: { observed_regions?: string[] } } | null)?.surface?.observed_regions ?? []
  ).length;
  const twinMeta = (activeTwin?.metadata_json as Record<string, unknown> | undefined) ?? {};
  const isDemoTwin = twinMeta.demo_fixture === true;

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
  const counts = today.data?.event_counts ?? {};
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
    : "今天还没有足够记录。";

  const freshness = lastEvent
    ? `更新 ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : "今天暂无新记录";
  const modelStatus =
    twin.state === "loading"
      ? "3D 状态读取中"
      : twin.state === "error"
        ? "3D 状态暂时不可用"
        : twinDescriptor
          ? isDemoTwin
            ? "示例形象 · 仅用于体验"
            : "个体形象 · 已确认"
          : "暂无已确认个体 3D";

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>生命视图</h1>
        <p className="v4-topline-sub" data-testid="pli.lifeview.identity">{name} · 此刻</p>
      </div>
      <div className="v4-filter-row" aria-label="生命视图状态" style={{ marginBottom: 12 }}>
        <span className="v4-chip" data-testid="pli.lifeview.freshness">{freshness}</span>
        <span className="v4-chip" data-testid="pli.lifeview.model-status">{modelStatus}</span>
      </div>
      <div className="r5-life-stage-shell">
      <PetLivingStage
        name={name}
        petId={petId}
        species={pet.data?.species}
        breed={pet.data?.breed}
        headline={mode === "now" ? `${name} · 此刻` : undefined}
        variant="life"
        stageRole="life"
        realityField="twin-space"
        demo={isDemoTwin || process.env.NEXT_PUBLIC_PLI_DEMO_ENV === "1"}
        anchors={anchors}
        caption={mode === "now" ? nowLine : undefined}
        frameTarget={0.55}
        twin={twinDescriptor ? { ...twinDescriptor, version: twinVersion ?? 1 } : null}
        pose={twinDescriptor ? representativePose : null}
        sourceMediaCount={observedRegions || undefined}
        interactive
        stageTestId="pli.lifeview.stage"
        twinTestId="pli.lifeview.twin"
        anchorTestIdPrefix="pli.lifeview.anchor"
      />
      </div>

      <LivingModeSwitcher value={mode} onChange={setMode} />

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
                {events.length > 0 ? "上面的数值来自今天真实的记录。" : "今天还没有足够记录，记下第一件事后，这里会围绕它展开。"}
              </p>
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
                {twinDescriptor
                  ? isDemoTwin
                    ? "当前显示示例 3D 形象，用于体验交互。它来自演示模板，不代表真实宠物扫描或已验证个体外观。"
                    : `现在显示的是${name}已由你确认的个体 3D 形象。外观由它的照片与模板生成，不会替代真实照片与记录。`
                  : "当前还没有已确认的个体 3D 形象。真实照片与记录仍可正常使用；补充素材并完成确认后，才会显示它的个体 3D 形象。"}
              </p>
            </div>
          ) : null}

          <RealPhotoCard petId={petId} />
        </div>

        <div className="v4-rail">
          <div className="v4-sec" style={{ paddingTop: 18 }}>
            <h2 className="v4-sec-title">真实记录始终可信</h2>
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                {twinDescriptor
                  ? isDemoTwin
                    ? "当前是演示 3D 形象，仅用于验证产品体验；照片、记录与规则结论始终独立于外观，且不把示例模板当作真实宠物身份。"
                    : `当前个体 3D 形象已经过你的确认，并由它的照片与模板生成。照片、记录与规则结论始终独立于外观，移动端与 Web 一致。`
                  : "当前还没有已确认的个体 3D 形象。照片、记录与规则结论始终可以独立使用；只有基于素材生成并经过你确认的形象才会作为个体外观显示。" }
              </p>
          </div>
        </div>
      </div>
    </main>
  );
}