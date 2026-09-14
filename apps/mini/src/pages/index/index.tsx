import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Picker } from "@tarojs/components";
import { useLoad } from "@tarojs/taro";
import { api, type LifeEvent, type Pet } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime, speciesLabel } from "../../utils/format";

interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

const QUICK_TYPES: Array<{ type: string; label: string; payload: Record<string, string | number> }> = [
  { type: "daily.meal", label: "喂食", payload: { food_type: "狗粮", amount: "100", unit: "g" } },
  { type: "daily.drink", label: "饮水", payload: { amount: "200", unit: "ml" } },
  { type: "daily.elimination", label: "排泄", payload: { kind: "urine", quality: "normal" } },
  { type: "daily.walk", label: "散步", payload: { duration_minutes: 20, intensity: "normal" } },
  { type: "daily.play", label: "玩耍", payload: { duration_minutes: 15, activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", payload: { weight_kg: "12.0" } },
];

export default function Index() {
  const { pets, petId, choose } = usePets();
  const [today, setToday] = useState<TodayData | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "denied">("loading");
  const [flash, setFlash] = useState<string | null>(null);

  const loadToday = useCallback((pid: string) => {
    setLoadState("loading");
    api
      .get<TodayData>(`/pets/${pid}/today`)
      .then((d) => {
        setToday(d);
        setLoadState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message.includes("PERMISSION_DENIED")) setLoadState("denied");
        else setLoadState("error");
      });
  }, []);

  useLoad(() => {
    // pets load triggers choose; today load handled after pets resolve below
  });

  useEffect(() => {
    if (petId) loadToday(petId);
  }, [petId, loadToday]);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];

  async function quickLog(t: (typeof QUICK_TYPES)[number]) {
    const target = current?.id;
    if (!target) return;
    try {
      await api.post(`/pets/${target}/events`, { event_type: t.type, payload: t.payload });
      setFlash(`已记录：${t.label}`);
      loadToday(target);
      setTimeout(() => setFlash(null), 2000);
    } catch {
      setFlash("记录失败，请重试");
      setTimeout(() => setFlash(null), 2000);
    }
  }

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name} 今天怎么样？` : "今日"}</View>
      <View className="sub">
        {current ? `${speciesLabel(current.species)}${current.breed ? ` · ${current.breed}` : ""} · ${today?.date ?? ""}` : "宠物生活智能"}
      </View>

      {pets && pets.length > 1 && (
        <Picker
          mode="selector"
          range={pets.map((p) => p.name)}
          value={pets.findIndex((p) => p.id === petId) < 0 ? 0 : pets.findIndex((p) => p.id === petId)}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            const p = pets[idx];
            if (p) choose(p.id);
          }}
        >
          <View className="btn">切换宠物：{current?.name}</View>
        </Picker>
      )}

      {flash && <View className="card" style={{ background: "#e8f1f2", color: "#3e7c83" }}>{flash}</View>}

      {current && (
        <View className="card">
          <Text>快速记录</Text>
          <View className="quickgrid">
            {QUICK_TYPES.map((t) => (
              <Button key={t.type} className="btn" onClick={() => quickLog(t)}>
                {t.label}
              </Button>
            ))}
          </View>
          <View className="muted" style={{ marginTop: 12 }}>
            所有记录都会带来源与记录人进入事件图。
          </View>
        </View>
      )}

      {loadState === "loading" && <View className="state">加载中……</View>}
      {loadState === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && loadToday(petId)}>重试</Button>
        </View>
      )}
      {loadState === "denied" && <View className="state">没有查看此内容的权限。</View>}

      {loadState === "ready" && (
        <View className="card">
          <Text>今日概览</Text>
          <View className="row">
            {today &&
              Object.entries(today.event_counts).map(([t, n]) => (
                <Text key={t} className="badge">{t} × {n}</Text>
              ))}
          </View>
          {today && today.events.length === 0 && <View className="muted" style={{ marginTop: 12 }}>今天还没有记录。</View>}
          {today?.events.map((e) => (
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
      )}
    </View>
  );
}