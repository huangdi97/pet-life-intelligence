/**
 * CompanionScreen — 陪伴模式 (Stage R.2 §54-56). Graceful preview experience:
 * pet identity + plain-language capability layers + honest device state.
 * No feature flags, no prototype tags, no fake device execution.
 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type DeviceRow, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { PetAvatar } from "../components/media/PetAvatar";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { OpenSection } from "../components/feedback/OpenSection";
import { eventTypeLabel } from "./ui_labels";

const LAYERS: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap; zh: string; desc: string }> = [
  { key: "observe", icon: "eye-outline", zh: "观察", desc: "在不打扰它的前提下，留意它的活动、休息与互动。" },
  { key: "presence", icon: "radio-outline", zh: "在场", desc: "连接设备后，可以知道它是否来到附近、停留多久。" },
  { key: "enrichment", icon: "sparkles-outline", zh: "丰富化", desc: "在合适的时候提供游戏与探索机会，由你控制节奏。" },
  { key: "learned", icon: "git-compare-outline", zh: "习得互动", desc: "根据长期观察，逐渐了解它的偏好，但不猜测情绪。" },
];

export function CompanionScreen() {
  const { pets, petId } = usePets();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);


  useEffect(() => {
    if (!petId) return;
    let alive = true;
    api
      .get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        if (alive) setDevices(rows);
      })
      .catch(() => {
        if (alive) setDevices([]);
      });
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events?limit=5`)
      .then((r) => {
        if (alive) setEvents(r.events.filter((e) => e.event_type !== "today.viewed").slice(0, 4));
      })
      .catch(() => {
        if (alive) setEvents([]);
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <PetAvatar pet={pet} uri={resolvePetMediaUri(pet)} size={56} />
          <View style={styles.headText}>
            <Text style={styles.title}>{pet ? `${pet.name} · 陪伴模式` : "陪伴模式"}</Text>
            <Text style={styles.sub}>连接支持的设备后，可以在不打扰它的前提下观察和互动。</Text>
          </View>
        </View>

        <OpenSection title="四种能力">
          {LAYERS.map((l) => (
            <View key={l.key} style={styles.layerRow}>
              <View style={styles.layerIcon}>
                <Ionicons name={l.icon} size={18} color={COLORS.brandPrimaryDeep} />
              </View>
              <View style={styles.layerText}>
                <Text style={styles.layerTitle}>{l.zh}</Text>
                <Text style={styles.layerDesc}>{l.desc}</Text>
              </View>
            </View>
          ))}
        </OpenSection>

        <OpenSection title="设备">
          {devices.length === 0 ? (
            <View style={styles.deviceEmpty}>
              <Ionicons name="hardware-chip-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.deviceEmptyText}>尚未连接设备</Text>
            </View>
          ) : (
            devices.map((d) => (
              <View key={d.device_id} style={styles.deviceRow}>
                <Text style={styles.deviceName}>{d.display_name || "设备"}</Text>
                <View style={styles.devicePill}>
                  <Text style={styles.devicePillText}>{deviceStateLabel(d.status)}</Text>
                </View>
              </View>
            ))
          )}
        </OpenSection>

        {events.length > 0 ? (
          <OpenSection title="最近">
            {events.map((e) => (
              <View key={e.event_id} style={styles.eventRow}>
                <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                <Text style={styles.eventTime}>{new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</Text>
              </View>
            ))}
          </OpenSection>
        ) : null}

        <Text style={styles.footnote}>陪伴不用于医疗判断；互动节奏始终由你控制。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function deviceStateLabel(status: string): string {
  if (status === "connected") return "在线";
  if (status === "offline") return "离线";
  if (status === "degraded") return "降级";
  return "状态未知";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  headText: { flex: 1 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2, lineHeight: 20 },
  layerRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s3, paddingVertical: 10 },
  layerIcon: { width: 34, height: 34, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen, alignItems: "center", justifyContent: "center", marginTop: 2 },
  layerText: { flex: 1 },
  layerTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  layerDesc: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 20 },
  deviceEmpty: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 8 },
  deviceEmptyText: { fontSize: TYPE.body, color: COLORS.textTertiary },
  deviceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  deviceName: { fontSize: TYPE.body, color: COLORS.textPrimary },
  devicePill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  devicePillText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  eventRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  eventType: { fontSize: TYPE.body, color: COLORS.textPrimary },
  eventTime: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  footnote: { fontSize: TYPE.caption, color: COLORS.textTertiary, textAlign: "center", marginTop: SPACE.s6 },
});
