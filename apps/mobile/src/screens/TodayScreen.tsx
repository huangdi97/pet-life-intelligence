/**
 * TodayScreen — Living Stage (R2-P §7.1 / v3.4 §46.6).
 *
 * The pet is the visual center of the first fold: warm environment background,
 * midground 2.5D identity visual, and state anchors (饮水/进食/活动) anchored
 * around it. Below the fold: change narrative → one attention/calm → one primary
 * action + light entries → life stream preview. All copy derives from real API
 * facts; nothing invents mood or health state.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type HealthEventRow, type Task } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import type { StackParamList, TabParamList } from "../navigation";
import { PetLivingStage } from "../components/life/PetLivingStage";
import { AttentionPanel } from "../components/life/AttentionPanel";
import { PrimaryAction, SecondaryAction, ActionRow } from "../components/actions/QuickAction";
import { Skeleton } from "../components/feedback/Feedback";
import { OpenSection } from "../components/feedback/OpenSection";
import { LifeStream, type LifeStreamDay } from "../components/timeline/LifeStream";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { todayTasks, type TodayResp } from "./today";
import { usePetTwin } from "../hooks/usePetTwin";
import { poseForEvent } from "@pli/pet-3d";
import { TodayEmptyPet, TodayHealthSummary, TodayOffline } from "./today_sections";
import { eventRowFromEvent, recentContext, timeContextText } from "./today_helpers";

type TabNav = BottomTabNavigationProp<TabParamList>;
type StackNav = NativeStackNavigationProp<StackParamList>;

export function TodayScreen() {
  const { pets, petId, choose, reload } = usePets();
  const { twin } = usePetTwin(petId);
  const tabNav = useNavigation<TabNav>();
  const stackNav = useNavigation<StackNav>();
  const [today, setToday] = useState<TodayResp | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hint, setHint] = useState<{ hints: string[]; rule: string } | null>(null);
  const [health, setHealth] = useState<HealthEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<TodayResp>(`/pets/${petId}/today`),
      api.get<Task[]>(`/pets/${petId}/tasks`),
      api.get<{ hints: string[]; rule: string }>(`/pets/${petId}/abnormal-day-hint`),
      api.get<HealthEventRow[]>(`/pets/${petId}/health-events`),
    ]).then(([t, tk, h, he]) => {
      if (!alive) return;
      if (t.status === "fulfilled") {
        setToday(t.value);
        setCachedAt(Date.now());
        setError(null);
      } else {
        setError(t.reason instanceof Error ? t.reason.message : "加载失败");
      }
      if (tk.status === "fulfilled") setTasks(tk.value);
      if (h.status === "fulfilled") setHint(h.value);
      if (he.status === "fulfilled") setHealth(he.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [petId]);

  const attention = useMemo(() => {
    const danger = health.find((r) => r.latest_triage_level === "URGENT" || r.latest_triage_level === "EMERGENCY");
    if (danger) {
      return {
        kind: "danger" as const,
        body: danger.chief_complaint || "有一条健康记录需要关注，请查看健康页。",
        footer: "由风险规则引擎判定 · 查看健康页了解详情",
      };
    }
    const abnormal = hint?.hints.find((x) => !x.includes("无明显异常"));
    if (abnormal) {
      return {
        kind: "attention" as const,
        body: abnormal,
        footer: hint?.rule ? "确定性对比（今日计数 vs 基线）" : undefined,
      };
    }
    return { kind: "calm" as const, body: "目前没有需要特别关注的变化。" };
  }, [health, hint]);

  const counts = today?.event_counts ?? {};
  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  // Representative pose from the most recent real event (REPRESENTATIVE
  // truth model). Health events never drive the pose.
  const representativePose = poseForEvent(todayEvents[0]?.event_type ?? null);

  const anchors = useMemo(() => {
    const activityMins = todayEvents.reduce(
      (a, e) => a + (Number((e.payload as Record<string, unknown>)?.duration_minutes) || 0),
      0
    );
    const rows = [
      { id: "food", label: "进食", value: counts["daily.meal"] ? `${counts["daily.meal"]} 次` : "—", icon: "restaurant-outline" as const },
      { id: "water", label: "饮水", value: counts["daily.drink"] ? `${counts["daily.drink"]} 次` : "—", icon: "water-outline" as const },
      { id: "activity", label: "活动", value: activityMins ? `${activityMins} 分钟` : "—", icon: "walk-outline" as const },
      { id: "sleep", label: "睡眠", value: counts["daily.sleep"] ? `${counts["daily.sleep"]} 次` : "—", icon: "moon-outline" as const },
    ];
    return rows;
  }, [counts, todayEvents]);

  const calm = attention.kind === "calm";
  const headline = !pet ? undefined : attention.kind === "danger"
    ? "今天需要注意一下"
    : todayEvents.length === 0
      ? "今天还没有新的记录"
      : !calm ? "今天有值得留意的变化" : `今天记录了 ${todayEvents.length} 件生活片段`;

  const memoryRows = useMemo(() => todayEvents.slice(0, 5).map(eventRowFromEvent), [todayEvents]);
  const memoryDays: LifeStreamDay[] = memoryRows.length
    ? [{ id: "today", label: `${new Date().getMonth() + 1}月${new Date().getDate()}日`, isToday: true, rows: memoryRows }]
    : [];

  if (pets && pets.length === 0) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <TodayEmptyPet onAction={() => void reload()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View testID="pli.today.identity">
          <View testID="pli.pet.identity" accessible accessibilityLabel={`当前宠物：${pet?.name ?? "未选择"}`}>
            {pets && pets.length > 1 ? (
              <View style={styles.chipRow} testID="pli.multipet.switch">
                {pets.map((p) => {
                  const active = p.id === pet?.id;
                  return (
                    <Pressable
                      key={p.id}
                      testID={active ? "pli.multipet.current" : `pli.multipet.switch.${p.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => void choose(p.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipActiveText]}>{p.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        <PetLivingStage
          pet={pet}
          spec={resolvePetStage(pet)}
          variant="today"
          anchors={
            loading || !pet
              ? []
              : anchors.map((a) => ({
                  ...a,
                  testID: `pli.today.anchor.${a.id}`,
                  onPress: a.id === "activity" ? () => tabNav.navigate("Timeline") : undefined,
                }))
          }
          headline={loading ? undefined : headline}
          caption={loading ? undefined : recentContext(todayEvents) ?? timeContextText()}
          demo={DEMO_ENV}
          onPressPet={pet ? () => stackNav.navigate("LifeView") : undefined}
          twin={twin?.descriptor ?? null}
          sourceMediaCount={twin?.observedRegions.length ?? 0}
          frameTarget={0.21}
          pose={twin ? representativePose ?? "Idle" : null}
        />

        {loading || !pet ? null : <TodayHealthSummary health={health} hint={hint} />}

        {error && !loading ? <TodayOffline cachedAt={cachedAt} onRetry={() => setLoading((v) => !v)} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={2} />
          </View>
        ) : (
          <View testID="pli.today.change">
            <View testID="pli.today.attention">
              {calm ? (
                <View style={styles.calmRow}>
                  <Text style={styles.calmText}>{attention.body}</Text>
                </View>
              ) : (
                <AttentionPanel kind={attention.kind} body={attention.body} footer={attention.footer} onPress={() => tabNav.navigate("Timeline")} />
              )}
            </View>

            {/* R5.4: preserve the canonical living hierarchy
                PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY.
                Tasks are supporting utilities, so they must not displace the
                one primary owner action immediately after Attention. */}
            <PrimaryAction testID="pli.today.primary-action" label="快速记录" onPress={() => stackNav.navigate("QuickLog")} />
            <ActionRow>
              <SecondaryAction label="看看它" icon="eye-outline" onPress={() => stackNav.navigate("LifeView")} />
              <SecondaryAction label="问助手" icon="chatbubble-ellipses-outline" onPress={() => tabNav.navigate("Assistant")} />
            </ActionRow>

            {tasks.length > 0 ? (
              <OpenSection title="今天任务" caption={`${tasks.filter((t) => t.status === "OPEN").length} 项待办`}>
                {todayTasks(tasks).map((t) => (
                  <View key={t.id} style={styles.taskRow}>
                    <Text style={styles.taskMark}>{t.status === "COMPLETED" ? "✓" : "○"}</Text>
                    <Text style={styles.taskTitle}>{t.title}</Text>
                  </View>
                ))}
              </OpenSection>
            ) : null}

            <View testID="pli.today.memory-preview">
              <OpenSection title="最近发生" caption={todayEvents.length ? `今天 · ${todayEvents.length} 条` : undefined}>
                {memoryDays.length ? (
                  <LifeStream days={memoryDays} />
                ) : (
                  <Text style={styles.memoryEmpty}>
                    {error ? "暂时连接不上，稍后自动恢复。" : `${pet?.name ?? "宠物"}的时间线还很安静，第一次喂食、散步或健康记录会从这里开始。`}
                  </Text>
                )}
              </OpenSection>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  chipRow: { flexDirection: "row", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s2 },
  chip: {
    paddingHorizontal: SPACE.s4,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.dividerSubtle,
  },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  calmRow: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  calmText: { fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 6 },
  taskMark: { fontSize: TYPE.body, color: COLORS.brandPrimaryDeep, width: 16 },
  taskTitle: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1 },
  memoryEmpty: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22, marginTop: SPACE.s1 },
});
