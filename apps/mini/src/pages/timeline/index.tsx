import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Picker } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import { api, type LifeEvent } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

const FILTERS: Array<{ label: string; types: string[] | null }> = [
  { label: "全部", types: null },
  {
    label: "日常",
    types: ["daily.meal", "daily.drink", "daily.elimination", "daily.walk", "daily.play", "daily.weight", "daily.note", "daily.sleep"],
  },
  {
    label: "健康",
    types: ["health.opened", "health.triage", "health.observation", "health.vet_brief", "health.outcome_recorded", "medication.plan", "medication.administered", "medication.missed"],
  },
  { label: "行为", types: ["behavior.event", "behavior.observation"] },
  { label: "训练", types: ["training.goal", "training.session"] },
  { label: "照护", types: ["care.handoff_started", "care.handoff_ended", "task.created", "task.completed", "grant.granted", "grant.expired"] },
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

      <Picker
        mode="selector"
        range={FILTERS.map((f) => f.label)}
        value={filter}
        onChange={(e) => {
          const f = Number(e.detail.value);
          setFilter(f);
          if (petId) load(petId, f);
        }}
      >
        <View className="btn">筛选：{FILTERS[filter].label}</View>
      </Picker>

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