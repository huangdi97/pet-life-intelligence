/** MonitoringScreen — 在家 (PLI-132 mobile port): today's device-event counts
 *  (home-summary) + device status as reported by the backend (never fake
 *  online; empty → 设备接入暂未开放 + PROTOTYPE tag) + recent events.
 *  NOT an IoT dashboard — only real event/device sources, no position
 *  inference. */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type DeviceRow, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import {
  Badge,
  Card,
  deviceStateColors,
  deviceStateLabel,
  EmptyText,
  ErrorText,
  EventItem,
  Loading,
  MutedText,
  ProtoTag,
  ScreenTitle,
  SectionTitle,
} from "./ui";

interface HomeSummaryResp {
  pet_id: string;
  today_counts: Record<string, number>;
  note: string;
}

export function MonitoringScreen() {
  const { petId } = usePets();
  const [summary, setSummary] = useState<HomeSummaryResp | null>(null);
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [recent, setRecent] = useState<LifeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    api
      .get<HomeSummaryResp>(`/pets/${petId}/home-summary`)
      .then((r) => {
        if (alive) setSummary(r);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      });
    api
      .get<DeviceRow[]>(`/pets/${petId}/devices`)
      .then((rows) => {
        if (!alive) return;
        setDevices(rows);
        setDevicesError(null);
      })
      .catch((e: unknown) => {
        if (alive) {
          setDevices(null);
          setDevicesError(humanizeError(e));
        }
      });
    api
      .get<{ events: LifeEvent[]; count: number }>(`/pets/${petId}/events?limit=8`)
      .then((r) => {
        if (!alive) return;
        setRecent(r.events.filter((e) => e.event_type !== "today.viewed").slice(0, 5));
      })
      .catch(() => {
        if (alive) setRecent([]);
      });
    return () => {
      alive = false;
    };
  }, [petId]);

  const counts = summary?.today_counts ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="在家" sub="宠物在哪 / 今天状态 / 设备是否正常。" />

        {error && <ErrorText>{error}</ErrorText>}

        <SectionTitle>今天</SectionTitle>
        <Card>
          {counts === null ? (
            <Loading />
          ) : Object.keys(counts).length === 0 ? (
            <EmptyText>今天还没有设备事件。</EmptyText>
          ) : (
            Object.entries(counts).map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.rowLabel}>{k}</Text>
                <Text style={styles.rowValue}>{`${v} 次`}</Text>
              </View>
            ))
          )}
          {summary?.note ? <MutedText>{summary.note}</MutedText> : null}
        </Card>

        <SectionTitle>设备</SectionTitle>
        {devicesError ? (
          <ErrorText>{devicesError}</ErrorText>
        ) : devices === null ? (
          <Loading />
        ) : devices.length === 0 ? (
          <Card>
            <View style={styles.protoRow}>
              <ProtoTag />
              <Text style={styles.protoNote}>设备接入暂未开放</Text>
            </View>
          </Card>
        ) : (
          devices.map((d) => {
            const colors = deviceStateColors(d.status);
            return (
              <Card key={d.device_id}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{d.display_name || d.provider}</Text>
                  <Badge text={deviceStateLabel(d.status)} color={colors.color} bg={colors.bg} />
                </View>
              </Card>
            );
          })
        )}

        <SectionTitle>最近事件</SectionTitle>
        {recent.length === 0 ? (
          <EmptyText>还没有记录。</EmptyText>
        ) : (
          recent.map((e) => <EventItem key={e.event_id} event={e} />)
        )}

        <MutedText>只展示真实设备状态与事件来源，不推断宠物位置。</MutedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACE.s2 },
  rowLabel: { fontSize: TYPE.base, color: COLORS.inkPrimary, flexShrink: 1 },
  rowValue: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
  protoRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  protoNote: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
});
