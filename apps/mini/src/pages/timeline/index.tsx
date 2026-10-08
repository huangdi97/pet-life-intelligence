/**
 * 时间线 — Life Stream (Stage R.2 §37-40).
 * Day groups + time spine；事件类型/来源全部用户语言；不逐条套白卡。
 * 筛选与数据流保持与后端 GET /pets/{id}/events 一致。
 */
import { useCallback, useEffect, useState } from "react";
import { Button, Input, Text, Textarea, View } from "@tarojs/components";
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
    mediaCount: e.artifact_ids?.length ?? 0,
  };
}

export default function Timeline() {
  const { pets, petId, choose, state: petContextState, refresh: refreshPets } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState(0);
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

  const loadMilestones = useCallback((pid: string) => {
    setMilestoneState("loading");
    api.get<MilestoneRow[]>(`/pets/${pid}/milestones`)
      .then((rows) => {
        setMilestones(rows);
        setMilestoneState("ready");
      })
      .catch(() => {
        setMilestones([]);
        setMilestoneState("error");
      });
  }, []);

  const loadMemories = useCallback((pid: string) => {
    setMemoryState("loading");
    api.get<MemoryRow[]>(`/pets/${pid}/memories?years_back=10`)
      .then((rows) => {
        setMemories(rows);
        setMemoryState("ready");
      })
      .catch(() => {
        setMemories([]);
        setMemoryState("error");
      });
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
      setMilestoneTitle("");
      setMilestoneDate("");
      loadMilestones(petId);
      loadMemories(petId);
      load(petId, filter);
      Taro.showToast({ title: "里程碑已记录", icon: "success" });
    } catch {
      setMilestoneState("error");
      Taro.showToast({ title: "暂时无法保存里程碑", icon: "none" });
    } finally {
      setMilestoneBusy(false);
    }
  }

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
      loadMilestones(petId);
      loadMemories(petId);
      loadDiary(petId);
      loadSummaries(petId);
    }
  });

  useEffect(() => {
    if (petId) {
      load(petId, filter);
      loadMilestones(petId);
      loadMemories(petId);
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

      <View className="open-section" data-testid="pli.mini.timeline.milestones">
        <View className="section-title">
          里程碑
          <Text className="section-caption">主人记录</Text>
        </View>
        <View className="life-empty-note">只记录真实发生、值得长期保留的节点；保存后会进入同一条生命时间线。</View>
        <Input
          className="input"
          value={milestoneDate}
          onInput={(event) => setMilestoneDate(event.detail.value)}
          placeholder="发生日期 YYYY-MM-DD"
        />
        <Input
          className="input"
          value={milestoneTitle}
          maxlength={200}
          onInput={(event) => setMilestoneTitle(event.detail.value)}
          placeholder="例如：第一次完成长途徒步"
        />
        <Button
          className="btn"
          disabled={milestoneBusy || !milestoneTitle.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate)}
          onClick={() => void addMilestone()}
        >
          {milestoneBusy ? "保存中…" : "记录里程碑"}
        </Button>
        {milestoneState === "ready" && milestones.length ? (
          <View className="soft-panel">
            {milestones.slice(0, 3).map((row) => (
              <View className="life-row" key={row.milestone_id}>
                <View className="life-row-body">
                  <View className="life-row-detail">{row.title}</View>
                  <View className="life-row-source">{new Date(row.occurred_at).toLocaleDateString()}</View>
                </View>
              </View>
            ))}
          </View>
        ) : milestoneState === "error" ? (
          <View className="state state-error">里程碑暂时没有加载成功；不会把未知状态显示成空。</View>
        ) : milestoneState === "ready" ? (
          <View className="life-empty-note">还没有里程碑记录。</View>
        ) : (
          <View className="state">正在读取里程碑……</View>
        )}
      </View>

      <View className="open-section" data-testid="pli.mini.timeline.memories">
        <View className="section-title">
          往年今日
          <Text className="section-caption">真实记录回看</Text>
        </View>
        <View className="life-empty-note">这里只回看历史上同一日期附近真实存在的事件；没有记录就不生成“回忆”。</View>
        {memoryState === "ready" && memories.length ? (
          <View className="soft-panel">
            {memories.slice(0, 3).map((row) => (
              <View className="life-row" key={row.years_ago}>
                <View className="life-row-body">
                  <View className="life-row-head">
                    <Text className="life-row-type">{row.years_ago} 年前</Text>
                    <Text className="life-row-time">{row.events} 条记录</Text>
                  </View>
                  <View className="life-row-source">{row.sample.slice(0, 3).map(eventTypeLabel).join(" · ")}</View>
                </View>
              </View>
            ))}
          </View>
        ) : memoryState === "error" ? (
          <View className="state state-error">历史回忆暂时没有读取到；不会用生成内容补齐。</View>
        ) : memoryState === "ready" ? (
          <View className="life-empty-note">往年今天附近还没有真实记录。</View>
        ) : (
          <View className="state">正在读取历史回忆……</View>
        )}
      </View>

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
