/**
 * 时间线 — Life Stream (Stage R.2 §37-40).
 * Day groups + time spine；事件类型/来源全部用户语言；不逐条套白卡。
 * 筛选与数据流保持与后端 GET /pets/{id}/events 一致。
 */
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventPayloadText, eventTypeLabel, sourceLabel } from "../../utils/labels";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../../components/timeline/LifeStream";
import { EmptyState, InlineError } from "../../components/feedback/Feedback";
import { PetContextHeader } from "../../components/pet_visual";

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
  const { pets, petId, choose } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState(0);
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

  useDidShow(() => {
    if (petId) load(petId, filter);
  });

  useEffect(() => {
    if (petId) load(petId, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const visible = events ?? [];
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
        <EmptyState title="豆豆的时间线还很安静" body="第一次喂食、散步或健康记录会从这里开始。" />
      )}

      <LifeStream days={days} />

      {state === "loading" && <View className="state">加载中……</View>}
    </View>
  );
}
