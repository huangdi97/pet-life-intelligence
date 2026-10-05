/**
 * CompanionScreen — 陪伴模式 (Stage R.2 §54-56). Graceful preview experience:
 * pet identity + plain-language capability layers + honest device state.
 * No feature flags, no prototype tags, no fake device execution.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, type DeviceRow, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
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

type StackNav = NativeStackNavigationProp<StackParamList>;

export function CompanionScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [deviceState, setDeviceState] = useState<"loading" | "ready" | "error">("loading");
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setDeviceState("loading");
    setEventsState("loading");
    api
      .get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        if (alive) {
          setDevices(rows);
          setDeviceState("ready");
        }
      })
      .catch(() => {
        if (alive) {
          setDevices([]);
          setDeviceState("error");
        }
      });
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events?limit=5`)
      .then((r) => {
        if (alive) {
          setEvents(r.events.filter((e) => e.event_type !== "today.viewed").slice(0, 4));
          setEventsState("ready");
        }
      })
      .catch(() => {
        if (alive) {
          setEvents([]);
          setEventsState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.companion.identity">
          <PetAvatar pet={pet} uri={resolvePetMediaUri(pet)} size={56} />
          <View style={styles.headText}>
            <Text style={styles.title}>{pet ? `${pet.name} · 陪伴模式` : "陪伴模式"}</Text>
            <Text style={styles.sub}>连接支持的设备后，可以在不打扰它的前提下观察和互动。</Text>
          </View>
        </View>

        <OpenSection title="四种能力" testID="pli.companion.overview">
          {LAYERS.map((l) => (
            <Pressable key={l.key} accessibilityRole="button" testID={`pli.companion.overview.${l.key}`} onPress={() => navigation.navigate("Monitoring")} style={styles.layerRow}>
              <View style={styles.layerIcon}>
                <Ionicons name={l.icon} size={18} color={COLORS.brandPrimaryDeep} />
              </View>
              <View style={styles.layerText}>
                <Text style={styles.layerTitle}>{l.zh}</Text>
                <Text style={styles.layerDesc}>{l.desc}</Text>
              </View>
            </Pressable>
          ))}
        </OpenSection>

        <OpenSection title="设备">
          <View testID="pli.companion.device-status" accessible accessibilityLabel="设备状态">
            {deviceState === "loading" ? (
              <Text style={styles.deviceEmptyText}>正在读取设备状态……</Text>
            ) : deviceState === "error" ? (
              <View style={styles.deviceEmpty} testID="pli.companion.device-error">
                <Ionicons name="cloud-offline-outline" size={20} color={COLORS.textTertiary} />
                <Text style={styles.deviceEmptyText}>设备状态暂时没有加载成功；不会把未知状态显示成未连接。</Text>
              </View>
            ) : devices.length === 0 ? (
              <View style={styles.deviceEmpty} testID="pli.companion.device-empty">
                <Ionicons name="hardware-chip-outline" size={20} color={COLORS.textTertiary} />
                <Text style={styles.deviceEmptyText}>尚未连接设备</Text>
              </View>
            ) : (
              devices.map((d) => (
                <View key={d.device_id} style={styles.deviceRow}>
                  <Text style={styles.deviceName}>{d.display_name || "设备"}</Text>
                  <View style={styles.devicePill} testID={`pli.companion.device-status.${d.device_id}`}>
                    <Text style={styles.devicePillText}>{deviceStateLabel(d.status)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </OpenSection>

        <OpenSection title="最近" testID="pli.companion.recent">
          {eventsState === "loading" ? (
            <Text style={styles.deviceEmptyText}>正在读取最近记录……</Text>
          ) : eventsState === "error" ? (
            <Text style={styles.deviceEmptyText}>最近记录暂时没有加载成功；这里不会把加载失败显示成“没有活动”。</Text>
          ) : events.length > 0 ? (
            events.map((e) => (
              <View key={e.event_id} style={styles.eventRow}>
                <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                <Text style={styles.eventTime}>{new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.deviceEmptyText}>还没有可观察的活动，观察记录会出现在这里。</Text>
          )}
        </OpenSection>

        <Pressable testID="pli.companion.action" accessibilityRole="button" onPress={() => navigation.navigate("Monitoring")} style={styles.actionBtn}>
          <Text style={styles.actionText}>查看设备状态</Text>
        </Pressable>

        <Text style={styles.footnote} testID="pli.companion.next">陪伴不用于医疗判断；互动节奏始终由你控制。</Text>
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
  footnote: { fontSize: TYPE.caption, color: COLORS.textTertiary, textAlign: "center", marginTop: SPACE.s6 },
  actionBtn: { marginHorizontal: SPACE.s4, marginTop: SPACE.s4, paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center" },
  actionText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  deviceEmpty: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 8 },
  deviceEmptyText: { fontSize: TYPE.body, color: COLORS.textTertiary },
  deviceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  deviceName: { fontSize: TYPE.body, color: COLORS.textPrimary },
  devicePill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  devicePillText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  eventRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  eventType: { fontSize: TYPE.body, color: COLORS.textPrimary },
  eventTime: { fontSize: TYPE.caption, color: COLORS.textTertiary },
});
