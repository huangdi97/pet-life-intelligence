"use client";

import Link from "next/link";
import { api, type LifeEvent } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import type { DeviceInfo } from "./_components/types";

/**
 * Companion — 陪伴模式 (Stage R.2 §54-56).
 *
 * Relationship-first, device-honest product surface:
 * - reads like part of the Living Experience, not an admin console;
 * - capability layers explain value before controls;
 * - device actions navigate to the real monitoring surface (no dead CTA);
 * - owner copy never leaks raw device/event status codes.
 */
const LAYERS = [
  { key: "observe", zh: "观察", desc: "在不打扰它的前提下，留意活动、休息与互动变化。" },
  { key: "presence", zh: "在场", desc: "连接设备后，了解它是否来到附近、停留多久。" },
  { key: "enrichment", zh: "丰富化", desc: "在合适的时候提供游戏与探索机会，由你控制节奏。" },
  { key: "learned", zh: "习得互动", desc: "根据长期记录逐渐了解偏好，但不猜测情绪。" },
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

  const visibleEvents = (recent.data?.events ?? [])
    .filter((e) => e.event_type !== "today.viewed")
    .slice(0, 4);

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.companion.identity">
        <div>
          <h1>陪伴模式</h1>
          <p className="sub">连接支持的设备后，在不打扰它的前提下观察、理解并适度互动。</p>
        </div>
      </div>

      <section className="v4-hero v4-hero--compact">
        <div className="v4-art" aria-hidden="true">
          <span className="v4-art-blob v4-art-blob--a" />
          <span className="v4-art-blob v4-art-blob--b" />
        </div>
        <div className="v4-hero-copy">
          <h2 className="v4-hero-title" style={{ fontSize: 28 }}>让陪伴自然发生</h2>
          <p className="v4-hero-line">先观察，再理解；只有在合适的时候互动，而且节奏始终由你决定。</p>
          <div className="v4-linkrow">
            <Link className="v4-action v4-action--primary" href="/monitoring">
              查看在家状态
            </Link>
            <Link className="v4-action v4-action--secondary" href="/timeline">
              查看最近记录
            </Link>
          </div>
        </div>
      </section>

      <div className="v5-utility-stack">
        <section className="v5-utility-surface v5-utility-surface--soft" data-testid="pli.companion.overview">
          <h2>四种能力</h2>
          {LAYERS.map((l) => (
            <div className="v4-domain" key={l.key}>
              <div>
                <div className="v4-domain-name">{l.zh}</div>
                <div className="v4-domain-desc">{l.desc}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="v5-utility-surface" data-testid="pli.companion.device-status">
          <div className="v4-sec-head">
            <div>
              <h2>设备</h2>
              <p className="v4-sec-sub">这里只展示真实连接状态；没有设备时不会模拟在线。</p>
            </div>
            <Link className="v4-sec-link" href="/monitoring">管理设备</Link>
          </div>

          {devices.state === "loading" ? (
            <div className="v4-loading">正在读取设备状态…</div>
          ) : devices.data && devices.data.length === 0 ? (
            <div className="v4-calm" data-testid="pli.companion.device-empty">
              <div>
                <p className="v4-calm-title">尚未连接设备</p>
                <p className="v4-calm-body">连接支持的摄像头或互动设备后，状态会出现在这里。</p>
              </div>
            </div>
          ) : (
            (devices.data ?? []).map((d) => (
              <div className="v4-domain" key={d.device_id}>
                <div>
                  <div className="v4-domain-name">{d.display_name || "设备"}</div>
                  <div className="v4-domain-desc">{deviceStateZh(d.status)}</div>
                </div>
              </div>
            ))
          )}

          <div className="v4-linkrow" data-testid="pli.companion.action">
            <Link className="v4-action v4-action--secondary" href="/monitoring">
              {devices.data?.length ? "查看设备详情" : "连接设备"}
            </Link>
          </div>
        </section>

        <section className="v5-utility-surface" data-testid="pli.companion.recent">
          <div className="v4-sec-head">
            <div>
              <h2>最近发生</h2>
              <p className="v4-sec-sub">陪伴只参考已经发生并被记录的事实。</p>
            </div>
            <Link className="v4-sec-link" href="/timeline">完整时间线</Link>
          </div>

          {recent.state === "loading" ? (
            <div className="v4-loading">正在读取最近记录…</div>
          ) : visibleEvents.length > 0 ? (
            <ul className="v4-ls">
              {visibleEvents.map((e) => (
                <li className="ls-item" key={e.event_id}>
                  <span className="ls-time">
                    {new Date(e.occurred_at).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <div className="ls-body">
                    <div className="ls-title">{eventTypeZh(e.event_type)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="v4-calm">
              <div>
                <p className="v4-calm-title">还没有可展示的最近活动</p>
                <p className="v4-calm-body">继续记录日常，陪伴模式会逐渐获得更多真实上下文。</p>
              </div>
            </div>
          )}
        </section>

        <section className="v5-utility-surface v5-utility-surface--soft" data-testid="pli.companion.next">
          <h2>下一步</h2>
          <p className="v4-note" style={{ margin: 0 }}>
            连接设备后，从“在家”查看当前环境；没有设备时，仍可以通过时间线、健康和行为记录理解它的生活。
          </p>
        </section>
      </div>

      <p className="v4-note" style={{ marginTop: 16 }}>
        陪伴模式不用于医疗判断；当前演示不会伪装成实时画面，互动节奏始终由你控制。
      </p>
    </main>
  );
}

function deviceStateZh(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "CONNECTED" || normalized === "ONLINE") return "在线";
  if (normalized === "OFFLINE") return "离线";
  if (normalized === "DEGRADED") return "连接不稳定";
  if (normalized === "PERMISSION_REQUIRED") return "需要授权";
  return "状态待确认";
}

function eventTypeZh(eventType: string): string {
  const map: Record<string, string> = {
    "daily.meal": "喂食",
    "daily.drink": "饮水",
    "daily.walk": "散步",
    "daily.play": "玩耍",
    "daily.weight": "体重",
    "daily.sleep": "睡觉",
    "behavior.observed": "行为观察",
    "diary.created": "生活备注",
    "health.event_opened": "健康记录",
    "social.interaction_logged": "互动记录",
    "training.session_logged": "训练记录",
    "welfare.observation_recorded": "生活质量观察",
  };
  return map[eventType] ?? "其他记录";
}
