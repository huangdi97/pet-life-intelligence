import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

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
      <View className="sub">目标 → 计划 → 训练 → 进展</View>

      <View className="card">
        <View className="field">
          <Text>新训练目标</Text>
          <Input className="input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="如：学会“坐下”" />
        </View>
        <Button className="btn btn-primary" onClick={create} disabled={!title.trim()}>
          添加目标
        </Button>
      </View>

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
            <Text className="badge">{g.status}</Text>
          </View>
          <View className="muted">{fmtTime(g.created_at)}</View>
        </View>
      ))}
    </View>
  );
}