import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Picker } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

/** 时间线（MIN-002）：低密度时间线 + 页内筛选 chips。
 *  筛选只使用后端 event_types.py 已注册的真实事件类型（GET /events 会校验并拒绝未知类型）。 */
const FILTERS: Array<{ label: string; types: string[] | null }> = [
  { label: "全部", types: null },
  {
    label: "日常",
    types: ["daily.meal", "daily.drink", "daily.elimination", "daily.walk", "daily.play", "daily.weight", "daily.sleep"],
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
  {
    label: "照护",
    types: [
      "care.task_created",
      "care.task_completed",
      "care.task_conflict",
      "care.handoff_started",
      "care.handoff_ended",
      "care.card_issued",
      "care.checklist_updated",
    ],
  },
];

export default function Timeline() {
  const { pets, petId, choose } = usePets();
  const [events, setEvents] = useState<LifeEvent[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState(0);

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

  return (
    <View className="page">
      <View className="h1">时间线</View>
      <View className="sub">宠物生命中的每一次记录（统一事件图）</View>

      {pets && pets.length > 1 && (
        <Picker
          mode="selector"
          range={pets.map((p) => p.name)}
          value={pets.findIndex((p) => p.id === petId) < 0 ? 0 : pets.findIndex((p) => p.id === petId)}
          onChange={(e) => {
            const p = pets[Number(e.detail.value)];
            if (p) choose(p.id);
          }}
        >
          <View className="btn">当前：{pets.find((p) => p.id === petId)?.name ?? "—"}</View>
        </Picker>
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

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId, filter)}>重试</Button>
        </View>
      )}
      {state === "ready" && events && events.length === 0 && <View className="state">还没有记录。</View>}
      {events?.map((e) => (
        <View className="tl-item" key={e.event_id}>
          <View className="tl-head">
            <Text className="tl-type">{e.event_type}</Text>
            <Text className="badge">{e.provenance_level}</Text>
            <Text className="tl-time">{fmtTime(e.occurred_at)}</Text>
          </View>
          <View className="tl-body">
            {Object.entries(e.payload)
              .filter(([k]) => k !== "health_event_id" && k !== "task_id")
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(" · ")}
          </View>
        </View>
      ))}
    </View>
  );
}
