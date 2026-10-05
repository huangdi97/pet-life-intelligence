import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Textarea, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

interface BehaviorRow {
  behavior_event_id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
}

export default function Behavior() {
  const { petId } = usePets();
  const [rows, setRows] = useState<BehaviorRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ antecedent: "", behavior: "", consequence: "", environment: "" });

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

  async function save() {
    if (!form.behavior.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/behavior-events`, {
        occurred_at: new Date().toISOString(),
        antecedent: form.antecedent.trim(),
        behavior: form.behavior.trim(),
        consequence: form.consequence.trim(),
        environment: form.environment.trim(),
      });
      setShowCreate(false);
      setForm({ antecedent: "", behavior: "", consequence: "", environment: "" });
      load(petId);
      Taro.showToast({ title: "已记录", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    }
  }

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
      {rows.map((b) => (
        <View className="card" key={b.behavior_event_id}>
          <View className="tl-time">{fmtTime(b.occurred_at)}</View>
          {b.antecedent && <View className="muted" style={{ marginTop: 6 }}>发生之前：{b.antecedent}</View>}
          <View style={{ marginTop: 6 }}>具体行为：{b.behavior}</View>
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