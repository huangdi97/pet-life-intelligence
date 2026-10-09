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
import { ChangeNarrative } from "../components/life/ChangeNarrative";
import { PrimaryAction, SecondaryAction, ActionRow } from "../components/actions/QuickAction";
import { Skeleton } from "../components/feedback/Feedback";
import { OpenSection } from "../components/feedback/OpenSection";
import { LifeStream, type LifeStreamDay } from "../components/timeline/LifeStream";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { todayTasks, type TodayResp } from "./today";
import { usePetTwin } from "../hooks/usePetTwin";
import { poseForEvent } from "@pli/pet-3d";
import { TodayEmptyPet, TodayHealthSummary, TodayOffline } from "./today_sections";
import { eventRowFromEvent, observedActivityMinutes, recentContext, timeContextText } from "./today_helpers";

type TabNav = BottomTabNavigationProp<TabParamList>;
type StackNav = NativeStackNavigationProp<StackParamList>;

function ownerFacingHealthText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  if (!text || /^(?:BW|HE|EV)-[A-Za-z0-9_-]+$/i.test(text)) return fallback;
  return text;
}

export function TodayScreen() {
  const { pets, petId, choose, reload } = usePets();
  const { twin } = usePetTwin(petId);
  const tabNav = useNavigation<TabNav>();
  const stackNav = useNavigation<StackNav>();
  // API payloads are owned by a pet id. Mask the previous pet's facts during
  // the FIRST render after switching pets, before useEffect gets a chance to
  // clear them. Failed requests must not resurrect old owner data.
  const [loadedPetId, setLoadedPetId] = useState<string | null>(null);
  const [rawToday, setToday] = useState<TodayResp | null>(null);
  const [rawTasks, setTasks] = useState<Task[]>([]);
  const [rawHint, setHint] = useState<{ hints: string[]; rule: string } | null>(null);
  const [rawHealth, setHealth] = useState<HealthEventRow[]>([]);
  const [rawHealthState, setHealthState] = useState<"loading" | "ready" | "error">("loading");
  const [rawError, setError] = useState<string | null>(null);
  const [rawLoading, setLoading] = useState(true);
  const [rawCachedAt, setCachedAt] = useState<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const isOwnData = petId !== null && loadedPetId === petId;
  const today = isOwnData ? rawToday : null;
  const tasks = isOwnData ? rawTasks : [];
  const hint = isOwnData ? rawHint : null;
  const health = isOwnData ? rawHealth : [];
  const healthState = isOwnData ? rawHealthState : "loading";
  const error = isOwnData ? rawError : null;
  const loading = rawLoading || !isOwnData;
  const cachedAt = isOwnData ? rawCachedAt : null;

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setToday(null);
    setTasks([]);
    setError(null);
    setCachedAt(null);
    setHint(null);
    setHealth([]);
    setHealthState("loading");
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
      if (he.status === "fulfilled") {
        setHealth(he.value);
        setHealthState("ready");
      } else {
        setHealth([]);
        setHealthState("error");
      }
      setLoadedPetId(petId);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [petId, refreshCounter]);

  const change = useMemo(() => {
    if (hint === null) {
      return {
        summary: "与它自己相比：今天还没有足够的基线信息。",
        evidence: "继续记录后，才会比较它自己的同期常态。",
      };
    }
    const abnormal = hint.hints.find((x) => !x.includes("无明显异常"));
    if (abnormal) {
      return {
        summary: abnormal,
        evidence: hint.rule || "基于今天已记录事实与它自己的近期基线比较",
      };
    }
    return {
      summary: "与它自己相比：按当前规则，今天暂未出现明显变化。",
      evidence: hint.rule || "只比较已记录事实，不推断情绪或健康结论",
    };
  }, [hint]);

  const attention = useMemo(() => {
    if (healthState !== "ready") {
      return {
        kind: "unknown" as const,
        body: "健康关注状态暂时无法确认。",
        footer: "健康记录没有完整读取到，不会把未知状态显示成“没有风险”",
      };
    }
    const danger = health.find((r) => r.latest_triage_level === "URGENT" || r.latest_triage_level === "EMERGENCY");
    if (danger) {
      return {
        kind: "danger" as const,
        body: ownerFacingHealthText(danger.chief_complaint, "有一条健康记录需要关注，请查看健康页。"),
        footer: "由独立风险分级规则判定 · 查看健康页了解详情",
      };
    }
    const focus = health.find((r) => r.status !== "CLOSED" && r.latest_triage_level);
    if (focus) {
      return {
        kind: "attention" as const,
        body: ownerFacingHealthText(focus.chief_complaint, "有一条健康记录值得查看。"),
        footer: "来自已记录的健康事件；不是诊断结论",
      };
    }
    return {
      kind: "calm" as const,
      body: "目前没有健康记录被独立风险规则标记为需要立即关注。",
      footer: "仅表示当前已记录事实未触发规则，不等同于健康正常",
    };
  }, [health, healthState]);

  const counts = today?.event_counts ?? {};
  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  // Representative pose from the most recent real event (REPRESENTATIVE
  // truth model). Health events never drive the pose.
  const representativePose = poseForEvent(todayEvents[0]?.event_type ?? null);

  const anchors = useMemo(() => {
    const activityMins = observedActivityMinutes(todayEvents);
    const rows = [
      { id: "food", label: "进食", value: counts["daily.meal"] ? `${counts["daily.meal"]} 次` : "—", icon: "restaurant-outline" as const },
      { id: "water", label: "饮水", value: counts["daily.drink"] ? `${counts["daily.drink"]} 次` : "—", icon: "water-outline" as const },
      { id: "activity", label: "活动", value: activityMins ? `${activityMins} 分钟` : "—", icon: "walk-outline" as const },
      { id: "sleep", label: "睡眠", value: counts["daily.sleep"] ? `${counts["daily.sleep"]} 次` : "—", icon: "moon-outline" as const },
    ];
    return rows;
  }, [counts, todayEvents]);

  const calm = attention.kind === "calm";
  // The Hero answers NOW only. CHANGE and ATTENTION have their own layers
  // below; duplicating warnings in the pet Hero collapses the canonical hierarchy.
  const headline = !pet
    ? undefined
    : todayEvents.length === 0
      ? "今天还没有新的记录"
      : `今天记录了 ${todayEvents.length} 件生活片段`;

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
          demo={DEMO_ENV || twin?.demoFixture === true}
          onPressPet={pet ? () => stackNav.navigate("LifeView") : undefined}
          twin={twin?.descriptor ?? null}
          sourceMediaCount={twin?.observedRegions.length ?? 0}
          frameTarget={0.56}
          pose={twin ? representativePose ?? "Idle" : null}
        />

        {error && !loading ? <TodayOffline cachedAt={cachedAt} onRetry={() => setRefreshCounter((v) => v + 1)} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={2} />
          </View>
        ) : (
          <>
            <View testID="pli.today.change">
              <ChangeNarrative
                summary={change.summary}
                evidenceHint={change.evidence}
                onWhy={() => tabNav.navigate("Timeline")}
              />
            </View>
            <View testID="pli.today.attention">
              {calm ? (
                <View style={styles.calmRow}>
                  <Text style={styles.calmText}>{attention.body}</Text>
                  {attention.footer ? <Text style={styles.calmMeta}>{attention.footer}</Text> : null}
                </View>
              ) : (
                <AttentionPanel kind={attention.kind} body={attention.body} footer={attention.footer} onPress={() => stackNav.navigate("Health")} />
              )}
            </View>

            {/* Canonical hierarchy: PET → NOW → CHANGE → ATTENTION → ACTION.
                Baseline change and health attention are deliberately distinct:
                a changed life pattern is not itself a medical conclusion. */}
            <PrimaryAction testID="pli.today.primary-action" label="快速记录" onPress={() => stackNav.navigate("QuickLog")} />
            <ActionRow>
              <SecondaryAction label="看看它" icon="eye-outline" onPress={() => stackNav.navigate("LifeView")} />
              <SecondaryAction label="问助手" icon="chatbubble-ellipses-outline" onPress={() => tabNav.navigate("Assistant")} />
            </ActionRow>

            {pet ? (
              <View testID="pli.today.support">
                <TodayHealthSummary health={health} evidenceState={healthState} />
              </View>
            ) : null}

            {tasks.length > 0 ? (
              <OpenSection title="今天任务" caption={`${tasks.filter((t) => t.status === "OPEN").length} 项待办`}>
                {todayTasks(tasks).map((t) => (
                  <View key={t.id} style={styles.taskRow}>
                    <Text style={styles.taskMark}>{t.status === "COMPLETED" ? "✓" : "○"}</Text>
                    <View style={styles.taskBody}>
                      <Text style={styles.taskTitle}>{t.title}</Text>
                      {t.conflict_count > 0 ? (
                        <Text style={styles.taskConflict} accessibilityLabel={`${t.conflict_count} 次重复完成冲突`}>
                          已记录 {t.conflict_count} 次重复完成冲突 · 原完成记录未被覆盖
                        </Text>
                      ) : null}
                    </View>
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
          </>
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
    minHeight: 44,
    paddingHorizontal: SPACE.s4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
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
  calmText: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  calmMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginTop: 3 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2, paddingVertical: 6 },
  taskMark: { fontSize: TYPE.body, color: COLORS.brandPrimaryDeep, width: 16 },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: TYPE.body, color: COLORS.textPrimary },
  taskConflict: { marginTop: 3, fontSize: TYPE.caption, color: COLORS.attention, lineHeight: 18 },
  memoryEmpty: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22, marginTop: SPACE.s1 },
});
