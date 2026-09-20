/** NotificationsScreen (PLI-219 mobile port): household notifications from
 *  GET /households/{hh}/notifications. The household id comes from the
 *  current-pet context; when unavailable → 请先登录 state. No mark-read
 *  endpoint exists yet, so read state is display-only. */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type NotificationItem } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Badge, Card, EmptyText, ErrorText, Loading, ScreenTitle } from "./ui";

/** zh-CN labels for backend notification types; unknown values fall back to
 *  the raw value — never invented labels. */
function notificationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TASK_CONFLICT: "任务冲突",
    TASK: "任务",
    CARE: "照护",
    HEALTH: "健康",
    MEDICATION: "用药",
    MONITORING: "监测",
    SYSTEM: "系统",
  };
  return map[type] ?? type;
}

export function NotificationsScreen() {
  const { pets } = usePets();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // household id from the current-pet context; null → 请先登录 state.
  const householdId = pets && pets.length > 0 ? pets[0].household_id : null;

  useEffect(() => {
    if (!householdId) return;
    let alive = true;
    setLoading(true);
    api
      .get<NotificationItem[]>(`/households/${householdId}/notifications`)
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [householdId]);

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="通知" sub="家庭通知与提醒。" />

        {!householdId && (
          <Card>
            <Text style={styles.stateTitle}>请先登录</Text>
            <Text style={styles.stateNote}>登录后可查看家庭通知。</Text>
          </Card>
        )}

        {householdId && error && <ErrorText>{error}</ErrorText>}

        {householdId && loading && <Loading />}

        {householdId && !loading && !error && items !== null && items.length === 0 && (
          <EmptyText>还没有通知。</EmptyText>
        )}

        {householdId &&
          !loading &&
          items?.map((n) => (
            <Card key={n.id}>
              <View style={styles.head}>
                <Badge
                  text={notificationTypeLabel(n.type)}
                  color={n.read_at ? COLORS.inkMuted : COLORS.info}
                  bg={n.read_at ? COLORS.bgSurfaceMuted : COLORS.infoBg}
                />
                <Text style={styles.time}>{fmtTime(n.created_at)}</Text>
              </View>
              <Text style={styles.title}>{n.title}</Text>
              {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
            </Card>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  title: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary, marginTop: SPACE.s2 },
  body: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s1 },
  stateTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  stateNote: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s1 },
});
