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
      <View className="sub">用 ABC 记录行为，不做主观定性（不写“攻击型人格”）</View>

      <Button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "收起" : "＋ 记录行为事件"}
      </Button>

      {showCreate && (
        <View className="card">
          <View className="field">
            <Text>前因 Antecedent</Text>
            <Input className="input" value={form.antecedent} onInput={(e) => setForm({ ...form, antecedent: e.detail.value })} placeholder="发生了什么 / 谁在场" />
          </View>
          <View className="field">
            <Text>行为 Behavior *</Text>
            <Textarea className="input" value={form.behavior} onInput={(e) => setForm({ ...form, behavior: e.detail.value })} placeholder="具体表现，如：对门铃声吠叫 30 秒" autoHeight />
          </View>
          <View className="field">
            <Text>后果 Consequence</Text>
            <Input className="input" value={form.consequence} onInput={(e) => setForm({ ...form, consequence: e.detail.value })} placeholder="之后发生了什么" />
          </View>
          <View className="field">
            <Text>环境</Text>
            <Input className="input" value={form.environment} onInput={(e) => setForm({ ...form, environment: e.detail.value })} placeholder="地点 / 环境" />
          </View>
          <Button className="btn btn-primary" onClick={save} disabled={!form.behavior.trim()}>
            保存
          </Button>
        </View>
      )}

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
          {b.antecedent && <View className="muted" style={{ marginTop: 6 }}>前因：{b.antecedent}</View>}
          <View style={{ marginTop: 6 }}>行为：{b.behavior}</View>
          {b.consequence && <View className="muted" style={{ marginTop: 6 }}>后果：{b.consequence}</View>}
        </View>
      ))}
    </View>
  );
}