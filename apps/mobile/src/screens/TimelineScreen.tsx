/**
 * TimelineScreen — Life Stream (Stage R.2 §37-40): day groups on a time
 * spine, semantic event rows with source provenance, filter chips.
 * No per-event white Cards; "back to a day" shows only that day's data.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { LifeStream } from "../components/timeline/LifeStream";
import { groupEventsByDay } from "../components/timeline/lifeStreamUtils";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { TIMELINE_FILTERS } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

interface EventsResp {
  events: LifeEvent[];
  count: number;
}
interface DiaryRow {
  diary_id: string;
  entry_at: string;
  text: string;
  has_audio: boolean;
}
interface DailySummaryRow {
  summary_id: string;
  date: string;
  summary: string;
  fact_count: number;
  provider: string;
  model: string;
  prompt_version: string;
  source_type: string;
  disclaimer: string;
}

export function TimelineScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const [selected, setSelected] = useState<string[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [diary, setDiary] = useState<DiaryRow[]>([]);
  const [diaryState, setDiaryState] = useState<"loading" | "ready" | "error">("loading");
  const [diaryText, setDiaryText] = useState("");
  const [diaryBusy, setDiaryBusy] = useState(false);
  const [summaries, setSummaries] = useState<DailySummaryRow[]>([]);
  const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");
  const [summaryBusy, setSummaryBusy] = useState(false);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    const types = TIMELINE_FILTERS.filter((f) => selected.includes(f.key)).flatMap((f) => f.types);
    const qs = types.length ? `&${types.map((t) => `event_type=${t}`).join("&")}` : "";
    api
      .get<EventsResp>(`/pets/${petId}/events?limit=200${qs}`)
      .then((r) => {
        if (alive) {
          // Exclude internal today.viewed telemetry from the life stream;
          // it is a page-view record, not a real life event (web parity).
          setEvents(r.events.filter((e) => e.event_type !== "today.viewed"));
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [petId, selected]);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setDiaryState("loading");
    api.get<DiaryRow[]>(`/pets/${petId}/diary?limit=5`)
      .then((rows) => {
        if (!alive) return;
        setDiary(rows);
        setDiaryState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setDiary([]);
        setDiaryState("error");
      });
    return () => { alive = false; };
  }, [petId]);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setSummaryState("loading");
    api.get<DailySummaryRow[]>(`/pets/${petId}/daily-summaries?limit=7`)
      .then((rows) => {
        if (!alive) return;
        setSummaries(rows);
        setSummaryState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setSummaries([]);
        setSummaryState("error");
      });
    return () => { alive = false; };
  }, [petId]);

  async function generateDailySummary() {
    if (!petId || summaryBusy) return;
    setSummaryBusy(true);
    try {
      await api.post(`/pets/${petId}/daily-summary`, {});
      const rows = await api.get<DailySummaryRow[]>(`/pets/${petId}/daily-summaries?limit=7`);
      setSummaries(rows);
      setSummaryState("ready");
    } catch {
      setSummaryState("error");
    } finally {
      setSummaryBusy(false);
    }
  }

  async function addDiary() {
    const text = diaryText.trim();
    if (!petId || !text || diaryBusy) return;
    setDiaryBusy(true);
    try {
      await api.post(`/pets/${petId}/diary`, { text });
      setDiaryText("");
      const [diaryRows, eventRows] = await Promise.all([
        api.get<DiaryRow[]>(`/pets/${petId}/diary?limit=5`),
        api.get<EventsResp>(`/pets/${petId}/events?limit=200`),
      ]);
      setDiary(diaryRows);
      setDiaryState("ready");
      setEvents(eventRows.events.filter((event) => event.event_type !== "today.viewed"));
      setError(false);
    } catch {
      setDiaryState("error");
    } finally {
      setDiaryBusy(false);
    }
  }

  function toggle(key: string) {
    if (key === "all") {
      setSelected([]);
      return;
    }
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const days = groupEventsByDay(events);

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.timeline.identity">
          <View style={styles.headText}>
            <Text style={styles.title}>时间线</Text>
            <Text style={styles.sub}>记录每一天真实发生的事情</Text>
          </View>
          <Pressable
            testID="pli.timeline.search"
            accessibilityRole="button"
            accessibilityLabel="搜索宠物记录"
            onPress={() => navigation.navigate("Search")}
            style={styles.searchAction}
          >
            <Text style={styles.searchActionText}>搜索</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          accessibilityLabel="时间线筛选"
        >
          {TIMELINE_FILTERS.map((f, i) => (
            <Pressable
              key={f.key}
              testID={i < 5 ? `pli.timeline.filter.${f.key}` : undefined}
              accessibilityRole="button"
              accessibilityLabel={`筛选：${f.zh}`}
              accessibilityState={{ selected: f.key === "all" ? selected.length === 0 : selected.includes(f.key) }}
              onPress={() => toggle(f.key)}
              style={[styles.chip, (f.key === "all" ? selected.length === 0 : selected.includes(f.key)) && styles.chipActive]}
            >
              <Text style={[styles.chipText, (f.key === "all" ? selected.length === 0 : selected.includes(f.key)) && styles.chipActiveText]}>{f.zh}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.diarySection} testID="pli.timeline.diary">
          <Text style={styles.diaryTitle}>今天想记下什么</Text>
          <Text style={styles.diaryIntro}>写下真实发生的事情。文字会作为主人记录保存，并在时间线留下来源明确的日记事件。</Text>
          <TextInput
            style={styles.diaryInput}
            value={diaryText}
            onChangeText={setDiaryText}
            multiline
            maxLength={5000}
            placeholder="例如：今天散步时第一次主动去闻路边的花。"
            placeholderTextColor={COLORS.textTertiary}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="保存生活日记"
            accessibilityState={{ disabled: diaryBusy || !diaryText.trim() }}
            disabled={diaryBusy || !diaryText.trim()}
            onPress={() => void addDiary()}
            style={[styles.diaryButton, (diaryBusy || !diaryText.trim()) && styles.diaryButtonDisabled]}
          >
            <Text style={styles.diaryButtonText}>{diaryBusy ? "保存中…" : "保存日记"}</Text>
          </Pressable>
          {diaryState === "ready" && diary.length ? (
            <View style={styles.diaryRecent}>
              <Text style={styles.diaryRecentLabel}>最近日记</Text>
              {diary.slice(0, 3).map((entry) => (
                <View key={entry.diary_id} style={styles.diaryRow}>
                  <Text style={styles.diaryRowText}>{entry.text}</Text>
                  <Text style={styles.diaryTime}>{new Date(entry.entry_at).toLocaleString("zh-CN")}</Text>
                </View>
              ))}
            </View>
          ) : diaryState === "error" ? (
            <Text style={styles.diaryError}>最近日记暂时没有加载成功；不会把未知状态显示成空。</Text>
          ) : null}
        </View>

        <View style={styles.summarySection} testID="pli.timeline.daily-summary">
          <View style={styles.summaryHead}>
            <Text style={styles.diaryTitle}>今日回顾</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="自动整理今日回顾"
              accessibilityState={{ disabled: summaryBusy }}
              disabled={summaryBusy}
              onPress={() => void generateDailySummary()}
              style={styles.summaryAction}
            >
              <Text style={styles.summaryActionText}>{summaryBusy ? "整理中…" : "自动整理"}</Text>
            </Pressable>
          </View>
          <Text style={styles.diaryIntro}>AI 只整理已经记录的事实；不会把推测写成生活记录，也不会替代原始时间线。</Text>
          {summaryState === "ready" && summaries.length ? (
            <View style={styles.summaryBody}>
              <Text style={styles.diaryRowText}>{summaries[0].summary}</Text>
              <Text style={styles.diaryTime}>AI 自动整理 · {summaries[0].fact_count} 条已记录事实 · {summaries[0].date}</Text>
              <Text style={styles.diaryTime}>{summaries[0].disclaimer}</Text>
            </View>
          ) : summaryState === "error" ? (
            <Text style={styles.diaryError}>今日回顾暂时没有加载成功；原始记录仍以时间线为准。</Text>
          ) : (
            <Text style={styles.diaryTime}>还没有生成今日回顾。</Text>
          )}
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={4} />
          </View>
        ) : days.length ? (
          <LifeStream days={days} />
        ) : (
          <EmptyState
            title={`${pet?.name ?? "宠物"}的时间线还很安静`}
            body="第一次喂食、散步或健康记录会从这里开始。"
            actionLabel="快速记录"
            onAction={() => navigation.navigate("QuickLog")}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  headText: { flex: 1 },
  searchAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen },
  searchActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  chipRow: { flexDirection: "row", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3, paddingRight: SPACE.s6 },
  chip: { minHeight: 44, paddingHorizontal: SPACE.s3, paddingVertical: 6, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  chipActive: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  chipText: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  chipActiveText: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  diarySection: { marginHorizontal: SPACE.s4, marginTop: SPACE.s4, padding: SPACE.s4, backgroundColor: COLORS.surfaceRaised, borderRadius: 22 },
  diaryTitle: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  diaryIntro: { marginTop: 4, fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18 },
  diaryInput: { minHeight: 96, marginTop: SPACE.s3, borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: 14, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s3, textAlignVertical: "top", fontSize: TYPE.body, color: COLORS.textPrimary },
  diaryButton: { minHeight: 44, marginTop: SPACE.s3, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: SPACE.s4, borderRadius: 22, backgroundColor: COLORS.brandPrimary },
  diaryButtonDisabled: { opacity: 0.5 },
  diaryButtonText: { fontSize: TYPE.sm, color: COLORS.textInverse, fontWeight: "600" },
  diaryRecent: { marginTop: SPACE.s4, gap: SPACE.s2 },
  diaryRecentLabel: { fontSize: TYPE.sm, color: COLORS.textTertiary, fontWeight: "600" },
  diaryRow: { paddingTop: SPACE.s2, borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  diaryRowText: { fontSize: TYPE.body, color: COLORS.textPrimary, lineHeight: 20 },
  diaryTime: { marginTop: 3, fontSize: TYPE.caption, color: COLORS.textTertiary },
  diaryError: { marginTop: SPACE.s3, fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18 },
  summarySection: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, padding: SPACE.s4, backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  summaryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  summaryAction: { minHeight: 40, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: 20, backgroundColor: COLORS.brandSoftGreen },
  summaryActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  summaryBody: { marginTop: SPACE.s3, gap: 4 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
});
