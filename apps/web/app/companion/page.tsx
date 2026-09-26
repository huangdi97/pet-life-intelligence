"use client";

import { api, type LifeEvent } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import type { DeviceInfo } from "./_components/types";

/**
 * Companion — 陪伴模式 (Stage R.2 §54-56). Graceful preview experience:
 * plain-language capability layers + honest device state. No feature flags,
 * no PROTOTYPE tags, no fake device execution.
 */
const LAYERS = [
  { key: "observe", zh: "观察", desc: "在不打扰它的前提下，留意它的活动、休息与互动。" },
  { key: "presence", zh: "在场", desc: "连接设备后，可以知道它是否来到附近、停留多久。" },
  { key: "enrichment", zh: "丰富化", desc: "在合适的时候提供游戏与探索机会，由你控制节奏。" },
  { key: "learned", zh: "习得互动", desc: "根据长期观察，逐渐了解它的偏好，但不猜测情绪。" },
];

export default function CompanionPage() {
  const { petId } = useCurrentPet();
  const recent = useAsync<{ events: LifeEvent[] }>(
    () => (petId ? api.get(`/pets/${petId}/events?limit=5`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const devices = useAsync<DeviceInfo[]>(
    () => (petId ? api.get(`/pets/${petId}/devices`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );

  return (
    <main className="v4-page">
      <section className="v4-hero v4-hero--compact">
        <div className="v4-art" aria-hidden="true" />
        <div className="v4-hero-copy">
          <h1 className="v4-hero-title">陪伴模式</h1>
          <p className="v4-hero-sub">连接支持的设备后，可以在不打扰它的前提下观察和互动。</p>
        </div>
      </section>

      <section className="v4-sec">
        <h2 className="v4-sec-title">四种能力</h2>
        {LAYERS.map((l) => (
          <div className="v4-domain" key={l.key}>
            <span className="v4-domain-label">{l.zh}</span>
            <span className="v4-domain-value">{l.desc}</span>
          </div>
        ))}
      </section>

      <section className="v4-sec">
        <h2 className="v4-sec-title">设备</h2>
        {devices.data && devices.data.length === 0 ? (
          <p className="v4-calm">尚未连接设备</p>
        ) : (
          (devices.data ?? []).map((d) => (
            <div className="v4-domain" key={d.device_id}>
              <span className="v4-domain-label">{d.display_name || "设备"}</span>
              <span className="v4-domain-value">{deviceStateZh(d.status)}</span>
            </div>
          ))
        )}
      </section>

      {recent.data && recent.data.events.length > 0 ? (
        <section className="v4-sec">
          <h2 className="v4-sec-title">最近</h2>
          <div className="v4-ls">
            {recent.data.events
              .filter((e) => e.event_type !== "today.viewed")
              .slice(0, 4)
              .map((e) => (
                <div className="v4-ls-row" key={e.event_id}>
                  <span className="v4-ls-type">{eventTypeZh(e.event_type)}</span>
                  <span className="v4-ls-time">{new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <p className="v4-note">陪伴不用于医疗判断；互动节奏始终由你控制。</p>
      {/* SAFETY:
          Demo/preview must never be mistaken for a live stream — the owner
          UI keeps stating, in user language, that this is not a live feed. */}
      <p className="v4-note">当前为演示体验，不是实时画面。</p>
    </main>
  );
}

function deviceStateZh(status: string): string {
  if (status === "connected") return "在线";
  if (status === "offline") return "离线";
  if (status === "degraded") return "降级";
  return "状态未知";
}

function eventTypeZh(eventType: string): string {
  const map: Record<string, string> = {
    "daily.meal": "喂食",
    "daily.drink": "饮水",
    "daily.walk": "散步",
    "daily.play": "玩耍",
    "daily.weight": "体重",
    "daily.sleep": "睡觉",
    "behavior.observed": "行为",
    "diary.created": "备注",
    "health.event_opened": "健康",
  };
  return map[eventType] ?? eventType;
}
