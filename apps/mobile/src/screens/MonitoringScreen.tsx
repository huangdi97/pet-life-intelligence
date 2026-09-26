/**
 * MonitoringScreen — 在家 (Stage R.2 §57): contextual capability entry.
 * Honest device state: no devices → "尚未连接设备"; devices → status list.
 * Never a red timeout loop.
 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type DeviceRow } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";

export function MonitoringScreen() {
  const { pets, petId } = usePets();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

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
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>{pet ? `${pet.name} · 在家` : "在家"}</Text>
          <Text style={styles.sub}>设备与当前环境</Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>正在连接…</Text>
        ) : devices.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="hardware-chip-outline" size={26} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>尚未连接设备</Text>
            <Text style={styles.emptyBody}>连接支持的摄像头或互动设备后，可以在这里看到它的状态。</Text>
          </View>
        ) : (
          <View>
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
  empty: { alignItems: "center", paddingHorizontal: SPACE.s8, paddingVertical: SPACE.s10 },
  emptyIcon: { width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACE.s4 },
  emptyBody: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: SPACE.s2, textAlign: "center", lineHeight: 20 },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, padding: SPACE.s4 },
  deviceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACE.s4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  deviceName: { fontSize: TYPE.body, color: COLORS.textPrimary },
  devicePill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  devicePillText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
});
