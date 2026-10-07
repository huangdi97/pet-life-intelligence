/**
 * 时间线 — Life Stream (Stage R.2 §37-40).
 * Day groups + time spine；事件类型/来源全部用户语言；不逐条套白卡。
 * 筛选与数据流保持与后端 GET /pets/{id}/events 一致。
 */
import { useCallback, useEffect, useState } from "react";
import { Button, Text, Textarea, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventPayloadText, eventTypeLabel, sourceLabel } from "../../utils/labels";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../../components/timeline/LifeStream";
import { EmptyState, InlineError, PetContextGate } from "../../components/feedback/Feedback";
import { PetContextHeader } from "../../components/pet_visual";

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

const FILTERS: Array<{ label: string; types: string[] | null }> = [
  { label: "全部", types: null },
  {
    label: "日常",
    types: ["daily.meal", "daily.drink", "daily.elimination", "daily.walk", "daily.play", "daily.weight", "daily.sleep", "diary.created"],
  },
  {
    label: "健康",
    types: [
      "health.event_opened",
      "health.intake_step",
      "health.observation_added",
      "health.artifact_added",
      "health.red_flag",
      "health.triage_assigned",
      "health.vet_brief_generated",
      "health.vet_brief_shared",
      "health.outcome_recorded",
      "health.record_imported",
    ],
  },
  { label: "用药", types: ["medication.plan_created", "medication.administered", "medication.missed"] },
  { label: "行为", types: ["behavior.observed"] },
  { label: "训练", types: ["training.goal_created", "training.session_logged"] },
];

function dayKeyOf(iso: string): string {
  return iso.slice(0, 10);
}
function dayLabelOf(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

function rowFromEvent(e: LifeEvent): LifeStreamRow {
  const t = new Date(e.occurred_at);
  const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return {
    id: e.event_id,
    time: hh,
    typeLabel: eventTypeLabel(e.event_type),
    detail: eventPayloadText(e.payload),
    source: sourceLabel(e.source_type),
  };
}

export default function Timeline() {
  const { pets, petId, choose, state: petContextState, refresh: refreshPets } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState(0);
  const [diary, setDiary] = useState<DiaryRow[]>([]);
  const [diaryState, setDiaryState] = useState<"loading" | "ready" | "error">("loading");
  const [diaryText, setDiaryText] = useState("");
  const [diaryBusy, setDiaryBusy] = useState(false);
  const [summaries, setSummaries] = useState<DailySummaryRow[]>([]);
  const [summaryState, setSummaryState] = useState<"loading" | "ready" | "error">("loading");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  const load = useCallback((pid: string, f: number) => {
    setState("loading");
    const types = FILTERS[f].types;
    let url = `/pets/${pid}/events`;
    if (types) url += `?${types.map((t) => `event_type=${encodeURIComponent(t)}`).join("&")}`;
    api
      .get<{ events: LifeEvent[]; count: number }>(url)
      .then((r) => {
        setEvents(r.events);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const loadSummaries = useCallback((pid: string) => {
    setSummaryState("loading");
    api.get<DailySummaryRow[]>(`/pets/${pid}/daily-summaries?limit=7`)
      .then((rows) => {
        setSummaries(rows);
        setSummaryState("ready");
      })
      .catch(() => {
        setSummaries([]);
        setSummaryState("error");
      });
  }, []);

  const loadDiary = useCallback((pid: string) => {
    setDiaryState("loading");
    api.get<DiaryRow[]>(`/pets/${pid}/diary?limit=5`)
      .then((rows) => {
        setDiary(rows);
        setDiaryState("ready");
      })
      .catch(() => {
        setDiary([]);
        setDiaryState("error");
      });
  }, []);

  async function generateDailySummary() {
    if (!petId || summaryBusy) return;
    setSummaryBusy(true);
    try {
      await api.post(`/pets/${petId}/daily-summary`, {});
      loadSummaries(petId);
      load(petId, filter);
      Taro.showToast({ title: "今日回顾已整理", icon: "success" });
    } catch {
      setSummaryState("error");
      Taro.showToast({ title: "暂时无法整理", icon: "none" });
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
      loadDiary(petId);
      load(petId, filter);
      Taro.showToast({ title: "日记已保存", icon: "success" });
    } catch {
      setDiaryState("error");
      Taro.showToast({ title: "暂时无法保存", icon: "none" });
    } finally {
      setDiaryBusy(false);
    }
  }

  useDidShow(() => {
    if (petId) {
      load(petId, filter);
      loadDiary(petId);
      loadSummaries(petId);
    }
  });

  useEffect(() => {
    if (petId) {
      load(petId, filter);
      loadDiary(petId);
      loadSummaries(petId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">时间线</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  // Keep internal page-view telemetry out of the owner's life memory.
  // Web and Android use the same rule: "today.viewed" is product telemetry,
  // not something that happened to the pet.
  const visible = (events ?? []).filter((e) => e.event_type !== "today.viewed");
  const days: LifeStreamDay[] = [];
  visible.forEach((e) => {
    const key = dayKeyOf(e.occurred_at);
    const last = days[days.length - 1];
    if (last && last.id === key) last.rows.push(rowFromEvent(e));
    else days.push({ id: key, label: dayLabelOf(e.occurred_at), isToday: dayKeyOf(e.occurred_at) === dayKeyOf(new Date().toISOString()), rows: [rowFromEvent(e)] });
  });

  return (
    <View className="page">
      <PetContextHeader pet={current ?? null} title="时间线" sub="记录每一天真实发生的事情" />

      <View className="open-section" data-testid="pli.mini.timeline.diary">
        <View className="section-title">
          今天想记下什么
          <Text className="section-caption">生活日记</Text>
        </View>
        <View className="life-empty-note">写下真实发生的事情。文字会作为主人记录保存，并在时间线留下来源明确的日记事件。</View>
        <Textarea
          className="input"
          value={diaryText}
          maxlength={5000}
          autoHeight
          onInput={(event) => setDiaryText(event.detail.value)}
          placeholder="例如：今天散步时第一次主动去闻路边的花。"
        />
        <Button className="btn btn-primary" disabled={diaryBusy || !diaryText.trim()} onClick={() => void addDiary()}>
          {diaryBusy ? "保存中…" : "保存日记"}
        </Button>
        {diaryState === "ready" && diary.length ? (
          <View className="soft-panel">
            <View className="section-title">最近日记</View>
            {diary.slice(0, 3).map((entry) => (
              <View className="life-row" key={entry.diary_id}>
                <View className="life-row-body">
                  <View className="life-row-detail">{entry.text}</View>
                  <View className="life-row-source">{new Date(entry.entry_at).toLocaleString()}</View>
                </View>
              </View>
            ))}
          </View>
        ) : diaryState === "error" ? (
          <View className="state state-error">最近日记暂时没有加载成功；不会把未知状态显示成空。</View>
        ) : null}
      </View>

      <View className="open-section" data-testid="pli.mini.timeline.daily-summary">
        <View className="section-title">
          今日回顾
          <Text className="section-caption">AI 自动整理</Text>
        </View>
        <View className="life-empty-note">AI 只整理已经记录的事实；不会把推测写成生活记录，也不会替代原始时间线。</View>
        <Button className="btn" disabled={summaryBusy} onClick={() => void generateDailySummary()}>
          {summaryBusy ? "整理中…" : "自动整理今日回顾"}
        </Button>
        {summaryState === "ready" && summaries.length ? (
          <View className="soft-panel">
            <View className="life-row-detail">{summaries[0].summary}</View>
            <View className="life-row-source">AI 自动整理 · {summaries[0].fact_count} 条已记录事实 · {summaries[0].date}</View>
            <View className="life-row-source">{summaries[0].disclaimer}</View>
          </View>
        ) : summaryState === "error" ? (
          <View className="state state-error">今日回顾暂时没有加载成功；原始记录仍以时间线为准。</View>
        ) : (
          <View className="life-empty-note">还没有生成今日回顾。</View>
        )}
      </View>

      <View
        className="secondary-action"
        data-testid="pli.mini.timeline.search"
        onClick={() => Taro.navigateTo({ url: "/pages/search/index" })}
      >
        搜索已有记录
      </View>

      {pets && pets.length > 1 && (
        <View className="chips">
          {pets.map((p) => (
            <View
              key={p.id}
              className={`chip${p.id === petId ? " chip-active" : ""}`}
              onClick={() => choose(p.id)}
            >
              {p.name}
            </View>
          ))}
        </View>
      )}

      <View className="chips">
        {FILTERS.map((f, i) => (
          <View
            key={f.label}
            className={`chip${filter === i ? " chip-active" : ""}`}
            onClick={() => {
              setFilter(i);
              if (petId) load(petId, i);
            }}
          >
            {f.label}
          </View>
        ))}
      </View>

      {state === "error" && <InlineError onRetry={() => petId && load(petId, filter)} />}

      {state === "ready" && events && events.length === 0 && (
        <EmptyState title={`${current?.name ?? "它"}的时间线还很安静`} body="第一次喂食、散步或健康记录会从这里开始。" />
      )}

      <LifeStream days={days} />

      {state === "loading" && <View className="state">加载中……</View>}
    </View>
  );
}
