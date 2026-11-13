import { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { eventTypeLabel } from "../../utils/labels";
import { fmtTime } from "../../utils/format";
import { PetHero } from "../../components/pet_visual";

interface DeviceRow {
  device_id: string;
  display_name?: string | null;
  status: string;
}

const LAYERS = [
  { key: "observe", zh: "观察", desc: "在不打扰它的前提下，留意活动、休息与互动变化。" },
  { key: "presence", zh: "在场", desc: "连接设备后，了解它是否来到附近、停留多久。" },
  { key: "enrichment", zh: "丰富化", desc: "在合适的时候提供游戏与探索机会，由你控制节奏。" },
  { key: "learned", zh: "习得互动", desc: "根据长期记录逐渐了解偏好，但不猜测情绪。" },
];

function deviceStateLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "connected" || normalized === "online") return "在线";
  if (normalized === "offline") return "离线";
  if (normalized === "degraded") return "连接不稳定";
  if (normalized === "permission_required") return "需要授权";
  return "状态待确认";
}

export default function Companion() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [deviceState, setDeviceState] = useState<"loading" | "ready" | "error">("loading");
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!petId) return;
    setDeviceState("loading");
    setEventsState("loading");
    Promise.allSettled([
      api.get<DeviceRow[]>(`/pets/${petId}/devices`),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=5`),
    ]).then(([d, e]) => {
      if (d.status === "fulfilled") {
        setDevices(d.value);
        setDeviceState("ready");
      } else {
        setDevices([]);
        setDeviceState("error");
      }
      if (e.status === "fulfilled") {
        setEvents(e.value.events.filter((row) => row.event_type !== "today.viewed").slice(0, 4));
        setEventsState("ready");
      } else {
        setEvents([]);
        setEventsState("error");
      }
    });
  }, [petId]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">陪伴模式</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  const onlineCount = devices.filter((device) => {
    const status = device.status.toLowerCase();
    return status === "connected" || status === "online";
  }).length;
  const lastEvent = events[0] ?? null;
  const presenceHeadline =
    deviceState === "error"
      ? "先从它最近的生活继续了解它"
      : onlineCount > 0
        ? `${onlineCount} 个设备在线，可以了解它的此刻`
        : "不在身边，也能继续看见它的生活";

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name} · 陪伴` : "陪伴"}</View>
      <View className="sub">先看见这一只宠物，再决定是否需要设备。</View>

      <PetHero
        pet={current ?? null}
        headline={presenceHeadline}
        timeContext={lastEvent ? `最近 · ${eventTypeLabel(lastEvent.event_type)} · ${fmtTime(lastEvent.occurred_at)}` : "暂无新的生活记录"}
        onPress={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}
      />

      <View className="action-row" style={{ marginTop: 16 }}>
        <View className="primary-action" onClick={() => Taro.navigateTo({ url: "/pages/pets/life-view/index" })}>看看它</View>
        <View className="secondary-action" onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>在家与设备</View>
      </View>

      <View className="open-section">
        <View className="section-title">
          真实设备状态
          <Text className="section-caption" onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>管理设备</Text>
        </View>
        {deviceState === "loading" ? (
          <View className="state">正在读取设备状态……</View>
        ) : deviceState === "error" ? (
          <View className="state state-error">设备状态暂时没有加载成功；不会把未知状态显示成未连接。</View>
        ) : devices.length === 0 ? (
          <View className="empty-state">
            <View className="empty-state-title">尚未连接设备</View>
            <View className="empty-state-body">没有设备时，仍可通过真实照片、时间线和生活记录继续陪伴与理解它；不会模拟在线。</View>
          </View>
        ) : (
          devices.map((device) => (
            <View className="life-row" key={device.device_id}>
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{device.display_name || "设备"}</Text>
                  <Text className="life-row-time">{deviceStateLabel(device.status)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View className="open-section">
        <View className="section-title">
          最近发生
          <Text className="section-caption" onClick={() => Taro.switchTab({ url: "/pages/timeline/index" })}>完整时间线</Text>
        </View>
        {eventsState === "loading" ? (
          <View className="state">正在读取最近记录……</View>
        ) : eventsState === "error" ? (
          <View className="state state-error">最近记录暂时没有加载成功；不会把加载失败显示成“没有活动”。</View>
        ) : events.length ? events.map((event) => (
          <View className="life-row" key={event.event_id}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{eventTypeLabel(event.event_type)}</Text>
                <Text className="life-row-time">{fmtTime(event.occurred_at)}</Text>
              </View>
            </View>
          </View>
        )) : (
          <View className="life-empty-note">还没有可展示的最近活动。第一次散步、玩耍或生活记录会从这里开始。</View>
        )}
      </View>

      <View className="open-section">
        <View className="section-title">陪伴方式</View>
        {LAYERS.map((layer) => (
          <View className="life-row" key={layer.key} onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{layer.zh}</Text>
              </View>
              <View className="life-row-detail">{layer.desc}</View>
            </View>
          </View>
        ))}
      </View>

      <View className="muted" style={{ textAlign: "center", marginTop: 24 }}>
        陪伴模式不用于医疗判断；没有可确认的实时来源时不会显示成实时画面，互动节奏始终由你控制。
      </View>
    </View>
  );
}

