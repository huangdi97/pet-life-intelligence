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
import { Ionicons } from "@expo/vector-icons";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { LifeStream } from "../components/timeline/LifeStream";
import { groupEventsByDay } from "../components/timeline/lifeStreamUtils";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { eventTypeLabel, TIMELINE_FILTERS } from "./ui_labels";

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
  audio_artifact_id: string | null;
}
interface MilestoneRow {
  milestone_id: string;
  title: string;
  kind: string;
  occurred_at: string;
}
interface MemoryRow {
  years_ago: number;
  window: string;
  events: number;
  sample: string[];
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
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestoneState, setMilestoneState] = useState<"loading" | "ready" | "error">("loading");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneBusy, setMilestoneBusy] = useState(false);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [memoryState, setMemoryState] = useState<"loading" | "ready" | "error">("loading");
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
    setMilestoneState("loading");
    setMemoryState("loading");
    api.get<MilestoneRow[]>(`/pets/${petId}/milestones`)
      .then((rows) => {
        if (!alive) return;
        setMilestones(rows);
        setMilestoneState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setMilestones([]);
        setMilestoneState("error");
      });
    api.get<MemoryRow[]>(`/pets/${petId}/memories?years_back=10`)
      .then((rows) => {
        if (!alive) return;
        setMemories(rows);
        setMemoryState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setMemories([]);
        setMemoryState("error");
      });
    return () => { alive = false; };
  }, [petId]);

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

  async function addMilestone() {
    const title = milestoneTitle.trim();
    if (!petId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate) || milestoneBusy) return;
    setMilestoneBusy(true);
    try {
      await api.post(`/pets/${petId}/milestones`, {
        title,
        kind: "OTHER",
        occurred_at: new Date(`${milestoneDate}T12:00:00`).toISOString(),
        note: "",
      });
      const [milestoneRows, memoryRows] = await Promise.all([
        api.get<MilestoneRow[]>(`/pets/${petId}/milestones`),
        api.get<MemoryRow[]>(`/pets/${petId}/memories?years_back=10`),
      ]);
      setMilestones(milestoneRows);
      setMemories(memoryRows);
      setMilestoneState("ready");
      setMemoryState("ready");
      setMilestoneTitle("");
      setMilestoneDate("");
    } catch {
      setMilestoneState("error");
    } finally {
      setMilestoneBusy(false);
    }
  }

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

        <View style={styles.memorySection} testID="pli.timeline.milestones">
          <Text style={styles.diaryTitle}>里程碑</Text>
          <Text style={styles.diaryIntro}>只记录真实发生、值得长期保留的节点；保存后会进入同一条生命时间线。</Text>
          <View style={styles.milestoneForm}>
            <TextInput
              style={[styles.diaryInput, styles.milestoneDateInput]}
              value={milestoneDate}
              onChangeText={setMilestoneDate}
              placeholder="发生日期 YYYY-MM-DD"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.diaryInput, styles.milestoneTitleInput]}
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
              maxLength={200}
              placeholder="例如：第一次完成长途徒步"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="记录里程碑"
            accessibilityState={{ disabled: milestoneBusy || !milestoneTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate) }}
            disabled={milestoneBusy || !milestoneTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate)}
            onPress={() => void addMilestone()}
            style={[styles.diaryButton, (milestoneBusy || !milestoneTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate)) && styles.diaryButtonDisabled]}
          >
            <Text style={styles.diaryButtonText}>{milestoneBusy ? "保存中…" : "记录里程碑"}</Text>
          </Pressable>
          {milestoneState === "ready" && milestones.length ? (
            <View style={styles.diaryRecent}>
              {milestones.slice(0, 3).map((row) => (
                <View key={row.milestone_id} style={styles.diaryRow}>
                  <Text style={styles.diaryRowText}>{row.title}</Text>
                  <Text style={styles.diaryTime}>{new Date(row.occurred_at).toLocaleDateString("zh-CN")}</Text>
                </View>
              ))}
            </View>
          ) : milestoneState === "error" ? (
            <Text style={styles.diaryError}>里程碑暂时没有加载成功；不会把未知状态显示成空。</Text>
          ) : milestoneState === "ready" ? (
            <Text style={styles.diaryTime}>还没有里程碑记录。</Text>
          ) : (
            <Text style={styles.diaryTime}>正在读取里程碑……</Text>
          )}
        </View>

        <View style={styles.memorySection} testID="pli.timeline.memories">
          <Text style={styles.diaryTitle}>往年今日</Text>
          <Text style={styles.diaryIntro}>这里只回看历史上同一日期附近真实存在的事件；没有记录就不生成“回忆”。</Text>
          {memoryState === "ready" && memories.length ? (
            <View style={styles.diaryRecent}>
              {memories.slice(0, 3).map((row) => (
                <View key={row.years_ago} style={styles.diaryRow}>
                  <Text style={styles.diaryRowText}>{row.years_ago} 年前 · {row.events} 条记录</Text>
                  <Text style={styles.diaryTime}>{row.sample.slice(0, 3).map(eventTypeLabel).join(" · ")}</Text>
                </View>
              ))}
            </View>
          ) : memoryState === "error" ? (
            <Text style={styles.diaryError}>历史回忆暂时没有读取到；不会用生成内容补齐。</Text>
          ) : memoryState === "ready" ? (
            <Text style={styles.diaryTime}>往年今天附近还没有真实记录。</Text>
          ) : (
            <Text style={styles.diaryTime}>正在读取历史回忆……</Text>
          )}
        </View>

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
                  <Text style={styles.diaryRowText}>{entry.text || "语音日记"}</Text>
                  <Text style={styles.diaryTime}>{new Date(entry.entry_at).toLocaleString("zh-CN")}{entry.has_audio ? " · 含原始录音" : ""}</Text>
                  {entry.audio_artifact_id ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="播放这条语音日记"
                      onPress={() => navigation.navigate("MediaMemory", { artifactIds: [entry.audio_artifact_id!] })}
                      style={styles.memoryMediaButton}
                    >
                      <Ionicons name="play-circle-outline" size={16} color={COLORS.brandPrimaryDeep} />
                      <Text style={styles.memoryMediaButtonText}>播放原始录音</Text>
                    </Pressable>
                  ) : null}
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
          <LifeStream
            days={days}
            onOpenMedia={(artifactIds) => navigation.navigate("MediaMemory", { artifactIds })}
          />
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
  memorySection: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, padding: SPACE.s4, backgroundColor: COLORS.surfaceRaised, borderRadius: 22 },
  milestoneForm: { marginTop: SPACE.s2, gap: SPACE.s2 },
  milestoneDateInput: { minHeight: 48 },
  milestoneTitleInput: { minHeight: 48 },
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
  memoryMediaButton: { marginTop: SPACE.s2, minHeight: 38, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: SPACE.s3, borderRadius: 19, backgroundColor: COLORS.brandSoftGreen },
  memoryMediaButtonText: { fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  diaryError: { marginTop: SPACE.s3, fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18 },
  summarySection: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, padding: SPACE.s4, backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  summaryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  summaryAction: { minHeight: 40, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: 20, backgroundColor: COLORS.brandSoftGreen },
  summaryActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  summaryBody: { marginTop: SPACE.s3, gap: 4 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
});
