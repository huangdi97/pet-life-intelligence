/**
 * MonitoringScreen — 在家 (Stage R.2 §57): contextual capability entry.
 * Honest device state machine: LOADING → CONNECTED / NO_DEVICE / ERROR.
 * Never a red timeout loop; failures surface as ERROR with a retry action.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type DeviceRow } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";

type MonitorState = "LOADING" | "CONNECTED" | "NO_DEVICE" | "OFFLINE" | "ERROR" | "CACHED" | "PERMISSION_REQUIRED";

export function MonitoringScreen() {
  const { pets, petId } = usePets();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setError(false);
    api
      .get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        if (alive) setDevices(rows);
      })
      .catch(() => {
        if (alive) {
          setDevices([]);
          setError(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId, tick]);

  // State machine: exactly one state element is rendered at a time.
  let state: MonitorState;
  if (loading) state = "LOADING";
  else if (error) state = "ERROR";
  else if (devices.length === 0) state = "NO_DEVICE";
  else if (devices.some((d) => String(d.status).toLowerCase() === "offline")) state = "OFFLINE";
  else state = "CONNECTED";

  const stateText: Record<MonitorState, string> = {
    LOADING: "正在读取设备状态",
    CONNECTED: "已连接设备",
    NO_DEVICE: "尚未连接设备",
    OFFLINE: "设备离线",
    ERROR: "暂时连接不上",
    CACHED: "使用缓存内容",
    PERMISSION_REQUIRED: "需要设备权限",
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.monitoring.identity">
          <Text style={styles.title}>{pet ? `${pet.name} · 在家` : "在家"}</Text>
          <Text style={styles.sub}>真实设备连接与最近一次同步状态；未知或离线不会显示成在线。</Text>
        </View>

        <View testID={`pli.monitoring.state.${state}`} style={styles.stateRow}>
          <Ionicons
            name={state === "ERROR" ? "cloud-offline-outline" : state === "CONNECTED" ? "checkmark-circle" : "hardware-chip-outline"}
            size={18}
            color={state === "ERROR" ? COLORS.danger : COLORS.textTertiary}
          />
          <Text style={styles.stateText}>{stateText[state]}</Text>
        </View>

        {state === "LOADING" ? (
          <Text style={styles.emptyText}>正在读取最近一次设备状态…</Text>
        ) : state === "ERROR" ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBody}>暂时无法获取设备状态，请稍后重试。</Text>
          </View>
        ) : state === "NO_DEVICE" ? (
          <View style={styles.empty} testID="pli.monitoring.content">
            <View style={styles.emptyIcon}>
              <Ionicons name="hardware-chip-outline" size={26} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>尚未连接设备</Text>
            <Text style={styles.emptyBody}>连接支持的摄像头或互动设备后，可以在这里看到它的状态。</Text>
          </View>
        ) : (
          <View testID="pli.monitoring.content">
            {devices.map((d) => (
              <View key={d.device_id} style={styles.deviceRow}>
                <Text style={styles.deviceName}>{d.display_name || "设备"}</Text>
                <View style={styles.devicePill}>
                  <Text style={styles.devicePillText}>{deviceStateLabel(d.status)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text testID="pli.monitoring.last" style={styles.lastSync}>
          {state === "CONNECTED"
            ? "设备状态来自最近一次同步结果"
            : state === "OFFLINE"
              ? "设备离线状态来自最近一次同步结果"
              : state === "NO_DEVICE"
                ? "尚未发现已连接设备；不会推断当前在线状态"
                : state === "ERROR"
                  ? "当前没有可确认的设备状态"
                  : "正在确认最近一次设备状态"}
        </Text>

        <Pressable
          testID="pli.monitoring.action"
          accessibilityRole="button"
          accessibilityLabel="刷新设备状态"
          onPress={() => setTick((t) => t + 1)}
          style={styles.refreshBtn}
        >
          <Text style={styles.refreshText}>刷新</Text>
        </Pressable>
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
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  stateRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  stateText: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  empty: { alignItems: "center", paddingHorizontal: SPACE.s8, paddingVertical: SPACE.s10 },
  emptyIcon: { width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACE.s4 },
  emptyBody: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: SPACE.s2, textAlign: "center", lineHeight: 20 },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, padding: SPACE.s4 },
  deviceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACE.s4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  deviceName: { fontSize: TYPE.body, color: COLORS.textPrimary },
  devicePill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  devicePillText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  lastSync: { fontSize: TYPE.caption, color: COLORS.textTertiary, paddingHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  refreshBtn: { minHeight: 48, marginHorizontal: SPACE.s4, marginTop: SPACE.s3, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center", justifyContent: "center" },
  refreshText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
});
