/**
 * TodayScreen — Living Canvas (Stage R.2 §18-26).
 *
 * One pet first, then Now → Change → Attention → Action → Memory.
 * All copy derives from real API facts (counts / deterministic hints /
 * backend triage). Never invents mood or health data. Renders as a composed
 * set of presentation components — no Card dashboard.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type HealthEventRow, type LifeEvent, type Task } from "../api";
import { usePets } from "../context";
import { petAgeText, speciesLabel, sexLabel } from "../format";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import type { StackParamList, TabParamList } from "../navigation";
import { PetHero } from "../components/pet/PetHero";
import { LifeSignal, type LifeSignalRow } from "../components/life/LifeSignal";
import { BaselineChange } from "../components/life/BaselineChange";
import { AttentionPanel } from "../components/life/AttentionPanel";
import { PrimaryAction, SecondaryAction, ActionRow } from "../components/actions/QuickAction";
import { InlineError, Skeleton } from "../components/feedback/Feedback";
import { OpenSection } from "../components/feedback/OpenSection";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../components/timeline/LifeStream";
import { resolvePetMediaUri, petIdentityLine } from "../components/media/demoPetVisual";
import { eventTypeLabel, sourceLabel } from "./ui_labels";
import { todayTasks, type TodayResp } from "./today";

type TabNav = BottomTabNavigationProp<TabParamList>;
type StackNav = NativeStackNavigationProp<StackParamList>;

const EVENT_ICONS: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
  "daily.meal": "restaurant-outline",
  "daily.drink": "water-outline",
  "daily.elimination": "remove-outline",
  "daily.walk": "walk-outline",
  "daily.play": "game-controller-outline",
  "daily.weight": "scale-outline",
  "daily.sleep": "moon-outline",
  "medication.administered": "medkit-outline",
  "behavior.observed": "paw-outline",
  "diary.created": "create-outline",
  "health.event_opened": "heart-outline",
  "care.task_completed": "checkmark-circle-outline",
  "social.interaction_logged": "people-outline",
};

function dayPeriod(now: Date): string {
  const h = now.getHours();
  if (h < 6) return "凌晨";
  if (h < 12) return "上午";
  if (h < 18) return "下午";
  return "晚上";
}

function timeContextText(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 · ${dayPeriod(now)}`;
}

function eventRowFromEvent(e: LifeEvent): LifeStreamRow {
  const payload = e.payload ?? {};
  let meta = "";
  if (e.event_type === "daily.meal") meta = `${payload.food_type ?? "食物"} ${payload.amount ?? ""}${payload.unit ?? ""}`.trim();
  else if (e.event_type === "daily.drink") meta = `${payload.amount ?? ""}${payload.unit ?? "ml"}`.trim();
  else if (e.event_type === "daily.walk") meta = `户外 ${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.play") meta = `${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.weight") meta = `${payload.weight_kg ?? ""} kg`;
  else if (e.event_type === "daily.elimination") meta = `${payload.kind ?? ""} · ${payload.quality ?? ""}`.replace(/·\s*$/, "");
  return {
    id: e.event_id,
    time: new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    typeLabel: eventTypeLabel(e.event_type),
    meta,
    sourceLabel: sourceLabel(e.source_type),
    outcome: e.retracted_at ? "已撤回" : null,
    icon: EVENT_ICONS[e.event_type] ?? "ellipse-outline",
    mediaUri: null,
  };
}

export function TodayScreen() {
  const { pets, petId, choose } = usePets();
  const tabNav = useNavigation<TabNav>();
  const stackNav = useNavigation<StackNav>();
  const [today, setToday] = useState<TodayResp | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hint, setHint] = useState<{ hints: string[]; rule: string } | null>(null);
  const [health, setHealth] = useState<HealthEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");

  const signalRows: LifeSignalRow[] = [
    { id: "meal", label: "进食", value: `${counts["daily.meal"] ?? 0} 次` },
    { id: "drink", label: "饮水", value: `${counts["daily.drink"] ?? 0} 次` },
    {
      id: "activity",
      label: "活动",
      value: `${todayEvents.reduce((a, e) => a + (Number((e.payload as Record<string, unknown>)?.duration_minutes) || 0), 0)} 分钟`,
    },
  ];

  const baselineAbnormal = attention.kind !== "calm" && attention.kind !== "danger";
  const memoryRows = useMemo(() => todayEvents.slice(0, 5).map(eventRowFromEvent), [todayEvents]);
  const memoryDays: LifeStreamDay[] = memoryRows.length
    ? [{ id: "today", label: `${new Date().getMonth() + 1}月${new Date().getDate()}日`, isToday: true, rows: memoryRows }]
    : [];

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {pets && pets.length > 1 ? (
          <View style={styles.chipRow}>
            {pets.map((p) => {
              const active = p.id === pet?.id;
              return (
                <Pressable key={p.id} onPress={() => void choose(p.id)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipActiveText]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <PetHero
          pet={pet}
          mediaUri={resolvePetMediaUri(pet)}
          headline={totalCount === 0 ? "今天还没有新的记录" : `今天记录了 ${totalCount} 件事`}
          identity={pet ? `${speciesLabel(pet.species)} · ${pet.breed}${petAgeText(pet.birth_date) ? ` · ${petAgeText(pet.birth_date)}` : ""}` : undefined}
          timeContext={timeContextText()}
          demo={DEMO_ENV}
          onPress={() => tabNav.navigate("Pet")}
          height={290}
        />

        {error && !loading ? <InlineError message="暂时连接不上，已展示已有内容" onRetry={() => setLoading((v) => !v)} /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <LifeSignal rows={signalRows} empty={totalCount === 0} emptyNote={error ? "暂时连接不上" : "今天还没有足够记录"} />

            {!baselineAbnormal ? (
              <BaselineChange
                summary={
                  hint === null
                    ? "数据还不足以比较"
                    : hint.hints.find((x) => x.includes("无明显异常"))
                      ? "今天与近期基线相比没有明显变化。"
                      : "与它自己相比有值得留意的变化。"
                }
                direction={hint === null ? "insufficient" : "flat"}
                evidenceHint={hint?.rule ?? "来源：今日计数与近期基线"}
                onViewEvidence={() => tabNav.navigate("Timeline")}
              />
            ) : null}

            <AttentionPanel kind={attention.kind} body={attention.body} footer={attention.footer} onPress={() => tabNav.navigate("Timeline")} />

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

            <PrimaryAction label="快速记录" onPress={() => stackNav.navigate("QuickLog")} />
            <ActionRow>
              <SecondaryAction label="问助手" icon="chatbubble-ellipses-outline" onPress={() => tabNav.navigate("Assistant")} />
              <SecondaryAction label="看看它" icon="eye-outline" onPress={() => stackNav.navigate("LifeView")} />
              <SecondaryAction label="在家" icon="videocam-outline" onPress={() => stackNav.navigate("Monitoring")} />
            </ActionRow>

            <OpenSection title="最近" caption={todayEvents.length ? `今天 · ${todayEvents.length} 条` : undefined}>
              {memoryDays.length ? (
                <LifeStream days={memoryDays} />
              ) : (
                <Text style={styles.memoryEmpty}>
                  {error ? "暂时连接不上，稍后自动恢复。" : "豆豆的时间线还很安静，第一次喂食、散步或健康记录会从这里开始。"}
                </Text>
              )}
            </OpenSection>
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
  taskRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 6 },
  taskMark: { fontSize: TYPE.body, color: COLORS.brandPrimaryDeep, width: 16 },
  taskTitle: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1 },
  memoryEmpty: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22, marginTop: SPACE.s1 },
});
