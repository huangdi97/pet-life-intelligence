/** TodayScreen — 今日 (PLI-017..025 mobile port): pet switcher, current-state
 *  card (最后活动 / 今天事件计数), quick-log entry, today tasks, rule-based
 *  值得关注 hints, recent events. NOT a dashboard. 值得关注 copy comes from
 *  the backend abnormal-day-hint (deterministic rule, 非健康判断). */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, humanizeError, type LifeEvent, type Task } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList, TabParamList } from "../navigation";
import {
  Card,
  CardTitle,
  Chip,
  EmptyText,
  ErrorText,
  EventItem,
  eventTypeLabel,
  GhostButton,
  PrimaryButton,
  ScreenTitle,
  SectionTitle,
} from "./ui";

type TabNav = BottomTabNavigationProp<TabParamList>;
type StackNav = NativeStackNavigationProp<StackParamList>;

interface TodayResp {
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

/** 今天任务 (✓/○): open tasks first, then tasks completed today. */
function todayTasks(tasks: Task[]): Task[] {
  const open = tasks.filter((t) => t.status === "OPEN");
  const today = new Date().toDateString();
  const doneToday = tasks.filter(
    (t) =>
      t.status === "COMPLETED" &&
      t.completed_at !== null &&
      new Date(t.completed_at).toDateString() === today,
  );
  return [...open, ...doneToday].slice(0, 6);
}

export function TodayScreen() {
  const { pets, petId, choose } = usePets();
  const tabNav = useNavigation<TabNav>();
  const stackNav = useNavigation<StackNav>();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [lastActivity, setLastActivity] = useState<LifeEvent | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hints, setHints] = useState<string[] | null>(null);
  const [hintRule, setHintRule] = useState<string | null>(null);
  const [recent, setRecent] = useState<LifeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    api
      .get<TodayResp>(`/pets/${petId}/today`)
      .then((r) => {
        if (!alive) return;
        setCounts(r.event_counts);
        // 最后活动: most recent pet activity — viewer-view system events are
        // not pet activities and are excluded from this card only.
        setLastActivity(r.events.find((e) => e.event_type !== "today.viewed") ?? null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      });
    api
      .get<Task[]>(`/pets/${petId}/tasks`)
      .then((rows) => {
        if (alive) setTasks(rows);
      })
      .catch(() => {
        if (alive) setTasks([]);
      });
    // 值得关注: deterministic rule hints (今日计数 vs 基线). Section omitted
    // entirely when the endpoint is unavailable — never a local guess.
    api
      .get<{ hints: string[]; rule: string }>(`/pets/${petId}/abnormal-day-hint`)
      .then((r) => {
        if (!alive) return;
        setHints(r.hints);
        setHintRule(r.rule);
      })
      .catch(() => {
        if (alive) {
          setHints(null);
          setHintRule(null);
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

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const todayCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle
          title={current ? `${current.name} 今天怎么样？` : "今日"}
          sub={current ? "今天的生活记录" : "宠物生活智能"}
        />

        {pets && pets.length > 1 && (
          <View style={styles.chipRow}>
            {pets.map((p) => (
              <Chip key={p.id} label={p.name} active={p.id === current?.id} onPress={() => void choose(p.id)} />
            ))}
          </View>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <Card>
          <CardTitle>当前状态</CardTitle>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>最后活动</Text>
            <Text style={styles.stateValue}>
              {lastActivity
                ? `${eventTypeLabel(lastActivity.event_type)} · ${fmtTime(lastActivity.occurred_at)}`
                : "今天还没有活动记录"}
            </Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>今天事件</Text>
            <Text style={styles.stateValue}>{todayCount === null ? "—" : `${todayCount} 条`}</Text>
          </View>
        </Card>

        <PrimaryButton label="+ 快速记录" onPress={() => stackNav.navigate("QuickLog")} />

        <SectionTitle>今天任务</SectionTitle>
        {tasks.length === 0 ? (
          <EmptyText>今天没有待办任务。</EmptyText>
        ) : (
          <Card>
            {todayTasks(tasks).map((t, i) => (
              <View key={t.id} style={[styles.taskRow, i > 0 && styles.taskRowBorder]}>
                <Text style={styles.taskMark}>{t.status === "COMPLETED" ? "✓" : "○"}</Text>
                <View style={styles.taskTextWrap}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  {t.due_at ? <Text style={styles.taskDue}>截止 {fmtTime(t.due_at)}</Text> : null}
                </View>
              </View>
            ))}
          </Card>
        )}

        {hints !== null && (
          <>
            <SectionTitle>值得关注</SectionTitle>
            <Card>
              {hints.map((h, i) => (
                <Text key={i} style={styles.hintText}>
                  {h}
                </Text>
              ))}
              {hintRule ? <Text style={styles.hintRule}>{hintRule}</Text> : null}
            </Card>
          </>
        )}

        <SectionTitle>最近</SectionTitle>
        {recent.length === 0 ? (
          <EmptyText>还没有记录。</EmptyText>
        ) : (
          recent.map((e) => <EventItem key={e.event_id} event={e} />)
        )}

        <View style={styles.navRow}>
          <GhostButton label="看看它" onPress={() => tabNav.navigate("Monitoring")} />
          <GhostButton label="陪伴" onPress={() => tabNav.navigate("Companion")} />
          <GhostButton label="时间线" onPress={() => tabNav.navigate("Timeline")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginBottom: SPACE.s2 },
  stateRow: { flexDirection: "row", marginTop: SPACE.s2 },
  stateLabel: { fontSize: TYPE.sm, color: COLORS.inkMuted, width: 72 },
  stateValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary, flex: 1 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: SPACE.s2 },
  taskRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.lineDefault },
  taskMark: { fontSize: TYPE.base, color: COLORS.primary600, width: SPACE.s5 },
  taskTextWrap: { flex: 1 },
  taskTitle: { fontSize: TYPE.base, color: COLORS.inkPrimary },
  taskDue: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: 2 },
  hintText: { fontSize: TYPE.sm, color: COLORS.inkSecondary, marginBottom: SPACE.s1 },
  hintRule: { fontSize: TYPE.xs, color: COLORS.inkMuted, marginTop: SPACE.s2 },
  navRow: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s6 },
});
