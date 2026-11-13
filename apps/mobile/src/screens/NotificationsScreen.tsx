/** NotificationsScreen (PLI-219 mobile port): household notifications from
 *  GET /households/{hh}/notifications. The household id comes from the
 *  current-pet context; when unavailable → 请先登录 state. Read state is
 *  actionable through the same owner-scoped notification API as Web/Mini.
 *
 *  V4 §5/§7 (PLI_VISUAL_SYSTEM_V4.md): OpenSection hierarchy instead of a
 *  white bordered Card per notification — no card stack, hairline dividers. */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type NotificationItem } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { Badge, ErrorText, Loading, ScreenTitle } from "./ui";
import { OpenSection } from "../components/feedback/OpenSection";

/** Owner-safe labels: unknown backend enums never reach the UI verbatim. */
function notificationTypeLabel(type: string): string {
  if (type.includes("EMERGENCY")) return "紧急提醒";
  if (type === "TASK_CONFLICT") return "任务冲突";
  if (type.includes("MEDICATION")) return "用药提醒";
  if (type.includes("HEALTH") || type.includes("TRIAGE")) return "健康提醒";
  if (type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION") || type.includes("CARE")) return "照护权限";
  if (type.includes("TASK")) return "照护任务";
  if (type.includes("MONITOR")) return "在家与设备";
  return "生活提醒";
}

function roleAudienceLabel(role?: string | null): string | null {
  if (!role || role === "ALL") return null;
  const labels: Record<string, string> = {
    OWNER: "仅家庭主人",
    CO_OWNER: "仅共同主人",
    FAMILY: "仅家人",
    SITTER: "仅临时照护",
    VET: "仅兽医",
    TRAINER: "仅训练师",
    GROOMER: "仅美容师",
  };
  return labels[role] ?? "仅指定家庭角色";
}

type NotificationFilter = "all" | "attention" | "health" | "care" | "other";

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "attention", label: "需要处理" },
  { id: "health", label: "健康与用药" },
  { id: "care", label: "照护与任务" },
  { id: "other", label: "其他" },
];

function notificationCategory(type: string): Exclude<NotificationFilter, "all" | "attention"> {
  if (type.includes("HEALTH") || type.includes("TRIAGE") || type.includes("EMERGENCY") || type.includes("MEDICATION")) return "health";
  if (type.includes("TASK") || type.includes("GRANT") || type.includes("HANDOFF") || type.includes("PERMISSION") || type.includes("CARE")) return "care";
  return "other";
}

export function NotificationsScreen() {
  const { pets } = usePets();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const unread = (items ?? []).filter((item) => !item.read_at).length;
  const visibleItems = (items ?? []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "attention") return !item.read_at;
    return notificationCategory(item.type) === filter;
  });

  async function markRead(id: string) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const result = await api.post<{ notification_id: string; read_at: string | null }>(`/notifications/${id}/read`, {});
      const readAt = result.read_at ?? new Date().toISOString();
      setItems((rows) => rows?.map((item) => item.id === id ? { ...item, read_at: readAt } : item) ?? rows);
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!householdId || busyId || unread === 0) return;
    setBusyId("all");
    setError(null);
    try {
      const result = await api.post<{ marked: number; read_at: string | null }>(
        `/households/${householdId}/notifications/read-all`,
        {},
      );
      const readAt = result.read_at ?? new Date().toISOString();
      setItems((rows) => rows?.map((item) => item.read_at ? item : { ...item, read_at: readAt }) ?? rows);
    } catch (e: unknown) {
      setError(humanizeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="通知" sub="任务、健康、权限与用药提醒集中在这里。" />

        {householdId && items && items.length > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{unread > 0 ? `${unread} 条未读` : "已查看全部"}</Text>
            {unread > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="全部标为已读"
                accessibilityState={{ disabled: busyId !== null }}
                disabled={busyId !== null}
                onPress={() => void markAllRead()}
                style={[styles.markAllButton, busyId !== null && styles.disabled]}
              >
                <Text style={styles.markAllText}>{busyId === "all" ? "处理中…" : "全部标为已读"}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {householdId && items && items.length > 0 ? (
          <View style={styles.filterRow} accessibilityLabel="通知筛选">
            {FILTERS.map((item) => {
              const selected = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFilter(item.id)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!householdId && (
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>请先登录</Text>
            <Text style={styles.stateNote}>登录后可查看家庭通知。</Text>
          </View>
        )}

        {householdId && error && <ErrorText>{error}</ErrorText>}

        {householdId && loading && <Loading />}

        {householdId && !loading && !error && items !== null && items.length === 0 && (
          <OpenSection>
            <Text style={styles.stateNote}>还没有通知。当家人照护、健康或任务需要留意时，会在这里出现。</Text>
          </OpenSection>
        )}

        {householdId && !loading && !error && items !== null && items.length > 0 && (
          <OpenSection title="通知" caption={`${visibleItems.length} 条`}>
            {visibleItems.length > 0 ? visibleItems.map((n, i) => (
              <View key={n.id} style={[styles.notifRow, i > 0 && styles.notifDivider]}>
                <View style={styles.head}>
                  <Badge
                    text={notificationTypeLabel(n.type)}
                    color={n.read_at ? COLORS.inkMuted : COLORS.info}
                    bg={n.read_at ? COLORS.bgSurfaceMuted : COLORS.infoBg}
                  />
                  <View style={styles.notificationMeta}>
                    {roleAudienceLabel(n.target_role) ? <Text style={styles.audienceText}>{roleAudienceLabel(n.target_role)}</Text> : null}
                    <Text style={styles.time}>{fmtTime(n.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.title}>{n.title}</Text>
                {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                {!n.read_at ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`将“${n.title}”标为已读`}
                    accessibilityState={{ disabled: busyId !== null }}
                    disabled={busyId !== null}
                    onPress={() => void markRead(n.id)}
                    style={[styles.markReadButton, busyId !== null && styles.disabled]}
                  >
                    <Text style={styles.markReadText}>{busyId === n.id ? "处理中…" : "标为已读"}</Text>
                  </Pressable>
                ) : null}
              </View>
            )) : (
              <Text style={styles.stateNote}>当前筛选下没有通知。</Text>
            )}
          </OpenSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  summaryRow: { minHeight: 48, marginHorizontal: SPACE.s4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  summaryText: { fontSize: TYPE.sm, color: COLORS.inkSecondary, fontWeight: TYPE.weightSemibold },
  markAllButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandPrimary },
  markAllText: { fontSize: TYPE.sm, color: COLORS.textInverse, fontWeight: "600" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s2 },
  filterChip: { minHeight: 40, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.bgSurfaceMuted },
  filterChipSelected: { backgroundColor: COLORS.brandSoftGreen },
  filterText: { fontSize: TYPE.sm, color: COLORS.inkMuted },
  filterTextSelected: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  notifRow: { paddingVertical: SPACE.s3 },
  notifDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notificationMeta: { alignItems: "flex-end", gap: 2 },
  audienceText: { fontSize: TYPE.xs, color: COLORS.info, fontWeight: "600" },
  time: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  title: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary, marginTop: SPACE.s2 },
  body: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginTop: SPACE.s1 },
  markReadButton: { marginTop: SPACE.s2, minHeight: 40, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.dividerStrong, backgroundColor: COLORS.surface },
  markReadText: { fontSize: TYPE.sm, color: COLORS.inkSecondary, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  stateBlock: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s4 },
  stateTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  stateNote: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s1, lineHeight: 20 },
});