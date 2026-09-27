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

interface PetRow {
  name: string;
  species?: string | null;
  breed?: string | null;
}

interface TodayMini {
  events?: Array<{
    event_type: string;
    occurred_at: string;
    payload?: Record<string, unknown>;
  }>;
  event_counts?: Record<string, number>;
}

/** PET 3D LIFE VIEW — Pet Living Stage（R2-P §7.3 / v3.4 §46.8）。
 *  宠物是主视觉、状态锚点环绕、模式条切换内容；3D 诚实态只作为小字，不显示
 *  provider/model/raw key。无真实服务时诚实说明，不伪装成功、不把 blocker 设计成失败页。 */
export default function PetLifeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const petId = use(params).id;
  const [mode, setMode] = useState<LivingMode>("now");

  const pet = useAsync<PetRow>(
    () => (petId ? api.get(`/pets/${petId}`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );
  const today = useAsync<TodayMini>(
    () => (petId ? api.get(`/pets/${petId}/today`) : Promise.reject(new Error("NO_PET"))),
    [petId],
  );

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
  const anchorsAll: StageAnchor[] = [
    { id: "drink", label: "饮水", value: `${counts["daily.drink"] ?? 0} 次`, icon: "water", href: "/timeline" },
    { id: "meal", label: "进食", value: `${counts["daily.meal"] ?? 0} 次`, icon: "food", href: "/timeline" },
    { id: "activity", label: "活动", value: `${events.reduce((s, e) => s + (Number(e.payload?.duration_minutes) || 0), 0)} 分钟`, icon: "walk", href: "/timeline" },
    { id: "sleep", label: "睡眠", value: `${counts["daily.sleep"] ?? 0} 次`, icon: "sleep", href: "/timeline" },
  ];
  const anchors = anchorsAll.filter((a) => (a.id === "drink" ? (counts["daily.drink"] ?? 0) > 0 : true));

  const lastEvent = events[0] ?? null;
  const nowLine = lastEvent
    ? `最近一次记录：${EVENT_LABELS[lastEvent.event_type] ?? "活动"} · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : "今天还没有记录，豆豆安安静静的。";

  const timelineRows = events.slice(0, 4).map((e) => ({
    key: e.event_type + e.occurred_at,
    label: EVENT_LABELS[e.event_type] ?? "记录",
    time: new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  }));

  return (
    <main className="v4-main">
      <div className="v4-topline">
        <h1>生命视图</h1>
        <p className="v4-topline-sub">{name} · 此刻</p>
      </div>

      <PetLivingStage
        name={name}
        petId={petId}
        species={pet.data?.species}
        breed={pet.data?.breed}
        headline={mode === "now" ? "豆豆 · 此刻" : undefined}
        variant="life"
        anchors={anchors}
        caption={mode === "now" ? nowLine : undefined}
        note="演示 3D 形象（开发环境）· 未来连接真实服务后，将用真实照片生成"
      />

      <LivingModeSwitcher value={mode} onChange={setMode} />

      <div className="v4-grid">
        <div>
          {mode === "now" ? (
            <div className="v4-sec">
              <h2 className="v4-sec-title">此刻</h2>
              <p className="v4-sec-sub" style={{ marginTop: 6 }}>
                {anchors.length ? "上面的数值来自今天真实的记录。" : "今天还没有足够记录，记下第一件事后，这里会围绕它展开。"}
              </p>
            </div>
          ) : null}

          {mode === "trend" ? (
            <div className="v4-sec">
              <h2 className="v4-sec-title">趋势</h2>
              <div className="v4-statsline" style={{ marginTop: 8 }}>
                {anchors.length ? (
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

          {mode === "timeline" ? (
            <div className="v4-sec">
              <div className="v4-sec-head">
                <h2 className="v4-sec-title">生命轨迹</h2>
                <Link href="/timeline" className="v4-sec-link">查看完整时间线</Link>
              </div>
              {timelineRows.length ? (
                <div style={{ paddingLeft: 0 }}>
                  {timelineRows.map((r) => (
                    <div key={r.key} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--v4-divider)" }}>
                      <span>{r.label}</span>
                      <span style={{ color: "var(--v4-text-tertiary)" }}>{r.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="v4-sec-sub">从第一次喂食、散步或健康记录开始，生命轨迹会慢慢成形。</p>
              )}
            </div>
          ) : null}

          {mode === "look" ? (
            <div className="v4-sec">
              <h2 className="v4-sec-title">外观</h2>
              <p className="v4-sec-sub" style={{ marginTop: 6 }}>
                现在显示的是演示 3D 形象（开发环境），只来自演示数据。未来连接真实服务后，会用豆豆的真实照片生成，并经过你确认后才会显示。外观不会替代真实照片与记录。
              </p>
            </div>
          ) : null}

          <RealPhotoCard petId={petId} />
        </div>

        <div className="v4-rail">
          <div className="v4-sec" style={{ paddingTop: 18 }}>
            <h2 className="v4-sec-title">真实记录始终可信</h2>
              <p className="v4-note" style={{ margin: "6px 0 0" }}>
                当前 3D 形象为演示资产（开发环境），只来自演示数据，不来自真实照片。未来真实服务接通后，生成的 3D 形象只会来自真实照片，并经过你确认后才会显示。照片、记录与规则结论始终独立于外观，移动端与 Web 一致。
              </p>
          </div>
        </div>
      </div>
    </main>
  );
}