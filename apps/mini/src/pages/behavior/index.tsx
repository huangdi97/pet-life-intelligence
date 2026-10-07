import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Textarea, Input, Picker } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

interface BehaviorRow {
  behavior_event_id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: string;
}

export default function Behavior() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "MILD" | "MODERATE" | "SEVERE" | "UNLABELED">("all");
  const [form, setForm] = useState({ antecedent: "", behavior: "", consequence: "", environment: "", intensity: "" });

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<BehaviorRow[]>(`/pets/${pid}/behavior-events`)
      .then((rows) => {
        setRows(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">行为</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function save() {
    if (!form.behavior.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date().toISOString(),
        antecedent: form.antecedent.trim(),
        behavior: form.behavior.trim(),
        consequence: form.consequence.trim(),
        environment: form.environment.trim(),
        intensity: form.intensity,
      });
      setShowCreate(false);
      setForm({ antecedent: "", behavior: "", consequence: "", environment: "", intensity: "" });
      load(petId);
      Taro.showToast({ title: "已记录", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    }
  }

  const visibleRows = rows.filter((row) => {
    if (filter === "all") return true;
    if (filter === "UNLABELED") return !row.intensity;
    return row.intensity === filter;
  });
  const intensityOptions = ["未标注", "轻度", "中度", "重度"];
  const intensityValues = ["", "MILD", "MODERATE", "SEVERE"];

  return (
    <View className="page">
      <View className="h1">行为</View>
      <View className="sub">先看最近真实记录，再用“发生之前 → 具体行为 → 发生之后”补充观察，不给宠物贴人格标签。</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && rows.length === 0 && <View className="state">还没有行为记录。</View>}
      {state === "ready" && rows.length > 0 ? (
        <View className="chips" aria-label="行为记录筛选">
          {[
            ["all", "全部"],
            ["MILD", "轻度"],
            ["MODERATE", "中度"],
            ["SEVERE", "重度"],
            ["UNLABELED", "未标注"],
          ].map(([value, label]) => (
            <View
              key={value}
              className={`chip${filter === value ? " chip-active" : ""}`}
              onClick={() => setFilter(value as typeof filter)}
            >
              {label}
            </View>
          ))}
        </View>
      ) : null}
      {state === "ready" && rows.length > 0 && visibleRows.length === 0 ? <View className="state">当前筛选下没有行为记录。</View> : null}
      {visibleRows.map((b) => (
        <View className="card" key={b.behavior_event_id}>
          <View className="tl-time">{fmtTime(b.occurred_at)}</View>
          {b.antecedent && <View className="muted" style={{ marginTop: 6 }}>发生之前：{b.antecedent}</View>}
          <View style={{ marginTop: 6 }}>具体行为：{b.behavior}</View>
          {b.intensity ? <View className="badge" style={{ marginTop: 6 }}>{b.intensity === "MILD" ? "轻度" : b.intensity === "MODERATE" ? "中度" : b.intensity === "SEVERE" ? "重度" : "主人标注"}</View> : null}
          {b.consequence && <View className="muted" style={{ marginTop: 6 }}>发生之后：{b.consequence}</View>}
        </View>
      ))}

      <View className="open-section">
        <View className="section-title" onClick={() => setShowCreate((v) => !v)}>
          记录一次行为观察
          <Text className="section-caption">{showCreate ? "收起" : "＋ 记录"}</Text>
        </View>
        {showCreate && (
          <View className="soft-panel">
            <View className="field">
              <Text>发生之前</Text>
              <Input className="input" value={form.antecedent} onInput={(e) => setForm({ ...form, antecedent: e.detail.value })} placeholder="当时发生了什么 / 谁在场" />
            </View>
            <View className="field">
              <Text>具体行为 *</Text>
              <Textarea className="input" value={form.behavior} onInput={(e) => setForm({ ...form, behavior: e.detail.value })} placeholder="例如：听到门铃后连续吠叫约 30 秒" autoHeight />
            </View>
            <View className="field">
              <Text>发生之后</Text>
              <Input className="input" value={form.consequence} onInput={(e) => setForm({ ...form, consequence: e.detail.value })} placeholder="之后发生了什么" />
            </View>
            <View className="field">
              <Text>环境</Text>
              <Input className="input" value={form.environment} onInput={(e) => setForm({ ...form, environment: e.detail.value })} placeholder="地点 / 环境" />
            </View>
            <View className="field">
              <Text>强度（主人主观标注，可选）</Text>
              <Picker
                mode="selector"
                range={intensityOptions}
                value={Math.max(0, intensityValues.indexOf(form.intensity))}
                onChange={(e) => setForm({ ...form, intensity: intensityValues[Number(e.detail.value)] ?? "" })}
              >
                <View className="input">{intensityOptions[Math.max(0, intensityValues.indexOf(form.intensity))]}</View>
              </Picker>
            </View>
            <View className="life-row-source">只记录可观察到的事实，不从一次行为推断性格或情绪。</View>
            <Button className="btn btn-primary" onClick={save} disabled={!form.behavior.trim()}>
              保存
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}