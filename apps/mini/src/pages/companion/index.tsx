import { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventTypeLabel } from "../../utils/labels";
import { fmtTime } from "../../utils/format";

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
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!petId) return;
    setState("loading");
    Promise.allSettled([
      api.get<DeviceRow[]>(`/pets/${petId}/devices`),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=5`),
    ]).then(([d, e]) => {
      if (d.status === "fulfilled") setDevices(d.value);
      else setDevices([]);
      if (e.status === "fulfilled") {
        setEvents(e.value.events.filter((row) => row.event_type !== "today.viewed").slice(0, 4));
      } else {
        setEvents([]);
      }
      setState(d.status === "rejected" && e.status === "rejected" ? "error" : "ready");
    });
  }, [petId]);

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name} · 陪伴模式` : "陪伴模式"}</View>
      <View className="sub">连接支持的设备后，在不打扰它的前提下观察、理解并适度互动。</View>

      <View className="soft-hero">
        <View className="section-title">让陪伴自然发生</View>
        <View className="life-row-detail">先观察，再理解；只有在合适的时候互动，而且节奏始终由你决定。</View>
        <View className="action-row">
          <View className="secondary-action" onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>查看在家状态</View>
          <View className="secondary-action" onClick={() => Taro.switchTab({ url: "/pages/timeline/index" })}>最近记录</View>
        </View>
      </View>

      <View className="open-section">
        <View className="section-title">四种能力</View>
        {LAYERS.map((layer) => (
          <View className="life-row" key={layer.key}>
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

      <View className="open-section">
        <View className="section-title">
          设备
          <Text className="section-caption" onClick={() => Taro.navigateTo({ url: "/pages/monitoring/index" })}>管理设备</Text>
        </View>
        {state === "loading" ? (
          <View className="state">正在读取设备状态……</View>
        ) : devices.length === 0 ? (
          <View className="empty-state">
            <View className="empty-state-title">尚未连接设备</View>
            <View className="empty-state-body">连接支持的摄像头或互动设备后，状态会出现在这里；不会模拟在线。</View>
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
        {events.length ? events.map((event) => (
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
          <View className="life-empty-note">还没有可展示的最近活动。继续记录日常，陪伴模式会逐渐获得真实上下文。</View>
        )}
      </View>

      {state === "error" ? (
        <View className="life-row-source">暂时连接不上；不会用模拟设备状态代替真实结果。</View>
      ) : null}

      <View className="muted" style={{ textAlign: "center", marginTop: 24 }}>
        陪伴模式不用于医疗判断；当前小程序不会伪装成实时画面，互动节奏始终由你控制。
      </View>
    </View>
  );
}
