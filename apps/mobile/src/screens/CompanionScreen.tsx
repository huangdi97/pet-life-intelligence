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
import { COLORS, DEMO_ENV, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { PetLivingStage } from "../components/life/PetLivingStage";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { usePetTwin } from "../hooks/usePetTwin";
import { poseForEvent } from "@pli/pet-3d";
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
  const { twin } = usePetTwin(petId);
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
  const presenceCaption = lastEvent
    ? `最近：${eventTypeLabel(lastEvent.event_type)} · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`
    : "还没有新的生活记录；不会用生成内容冒充实时画面。";
  const companionNote =
    deviceState === "ready" && devices.length === 0
      ? "尚未连接设备 · 3D / 照片只是陪伴入口，不代表实时画面"
      : "事实来自真实设备与生活记录；外观不会替代它们";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar} testID="pli.companion.identity">
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </Pressable>
          <View style={styles.toolbarText}>
            <Text style={styles.title}>陪伴</Text>
            <Text style={styles.sub}>先看见这一只宠物，再决定是否需要设备。</Text>
          </View>
        </View>

        <PetLivingStage
          pet={pet}
          spec={resolvePetStage(pet)}
          variant="pet"
          headline={presenceHeadline}
          caption={presenceCaption}
          note={companionNote}
          demo={DEMO_ENV || twin?.demoFixture === true}
          onPressPet={pet ? () => navigation.navigate("LifeView") : undefined}
          twin={twin?.descriptor ?? null}
          sourceMediaCount={twin?.observedRegions.length ?? 0}
          frameTarget={0.52}
          pose={twin ? poseForEvent(lastEvent?.event_type ?? null) ?? "Idle" : null}
          stageRole="companion"
          stageTestId="pli.companion.living-stage"
          twinTestId="pli.companion.pet-twin"
        />

        <View style={styles.heroActions}>
          <Pressable
            testID="pli.companion.look"
            accessibilityRole="button"
            onPress={() => navigation.navigate("LifeView")}
            style={[styles.heroAction, styles.heroActionPrimary]}
          >
            <Ionicons name="eye-outline" size={17} color={COLORS.textInverse} />
            <Text style={styles.heroActionPrimaryText}>看看它</Text>
          </Pressable>
          <Pressable
            testID="pli.companion.monitor"
            accessibilityRole="button"
            onPress={() => navigation.navigate("Monitoring")}
            style={styles.heroAction}
          >
            <Ionicons name="home-outline" size={17} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.heroActionText}>在家与设备</Text>
          </Pressable>
        </View>

        <OpenSection title="真实设备状态">
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
                <Text style={styles.deviceEmptyText}>尚未连接设备。没有设备时，仍可通过真实记录陪伴和理解它。</Text>
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

        <OpenSection title="最近发生" testID="pli.companion.recent">
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
            <Text style={styles.deviceEmptyText}>还没有可观察的活动。第一次散步、玩耍或生活记录会从这里开始。</Text>
          )}
        </OpenSection>

        <OpenSection title="陪伴方式" testID="pli.companion.overview">
          {LAYERS.map((l) => (
            <Pressable
              key={l.key}
              accessibilityRole="button"
              testID={`pli.companion.overview.${l.key}`}
              onPress={() => navigation.navigate("Monitoring")}
              style={styles.layerRow}
            >
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

        <Pressable testID="pli.companion.action" accessibilityRole="button" onPress={() => navigation.navigate("Monitoring")} style={styles.actionBtn}>
          <Text style={styles.actionText}>{devices.length ? "查看设备状态" : "了解如何连接设备"}</Text>
        </Pressable>

        <Text style={styles.footnote} testID="pli.companion.next">陪伴不用于医疗判断；没有可确认的实时来源时不会显示成实时画面，互动节奏始终由你控制。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function deviceStateLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "connected" || normalized === "online") return "在线";
  if (normalized === "offline") return "离线";
  if (normalized === "degraded") return "连接不稳定";
  if (normalized === "permission_required") return "需要授权";
  return "状态待确认";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  toolbarText: { flex: 1 },
  heroActions: { flexDirection: "row", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  heroAction: { flex: 1, minHeight: 46, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  heroActionPrimary: { backgroundColor: COLORS.brandPrimary },
  heroActionText: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.button, fontWeight: "700" },
  heroActionPrimaryText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "700" },
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
