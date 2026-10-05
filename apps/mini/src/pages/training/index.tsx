import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

function statusLabel(status: string): string {
  if (status === "ACTIVE" || status === "OPEN") return "进行中";
  if (status === "ACHIEVED") return "已达成";
  if (status === "PAUSED") return "已暂停";
  return "状态已记录";
}

interface TrainingGoal {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function Training() {
  const { petId } = usePets();
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [title, setTitle] = useState("");

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<TrainingGoal[]>(`/pets/${pid}/training-goals`)
      .then((rows) => {
        setGoals(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  async function create() {
    if (!title.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/training-goals`, { title: title.trim() });
      setTitle("");
      load(petId);
      Taro.showToast({ title: "已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    }
  }

  return (
    <View className="page">
      <View className="h1">训练</View>
      <View className="sub">先看当前目标与进展，再记录下一步；坚持奖励式正向强化。</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && goals.length === 0 && <View className="state">还没有训练目标。</View>}
      {goals.map((g) => (
        <View className="card" key={g.id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{g.title}</Text>
            <Text className="badge">{statusLabel(g.status)}</Text>
          </View>
          <View className="muted">{fmtTime(g.created_at)}</View>
        </View>
      ))}

      <View className="open-section">
        <View className="section-title">新训练目标</View>
        <View className="field">
          <Text>目标名称</Text>
          <Input className="input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="例如：安静应对门铃" />
        </View>
        <View className="life-row-source">先看已有目标与进展，再添加下一步；训练坚持奖励式正向强化。</View>
        <Button className="btn btn-primary" onClick={create} disabled={!title.trim()}>
          添加目标
        </Button>
      </View>
    </View>
  );
}