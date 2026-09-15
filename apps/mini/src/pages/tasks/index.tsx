import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

export default function Tasks() {
  const { petId } = usePets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [title, setTitle] = useState("");

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<Task[]>(`/pets/${pid}/tasks?status=OPEN`)
      .then((rows) => {
        setTasks(rows);
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
      await api.post(`/pets/${petId}/tasks`, { title: title.trim(), task_type: "OTHER" });
      setTitle("");
      load(petId);
      Taro.showToast({ title: "已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    }
  }

  async function complete(taskId: string) {
    if (!petId) return;
    try {
      await api.post(`/tasks/${taskId}/complete`, {});
      load(petId);
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
  }

  return (
    <View className="page">
      <View className="h1">任务</View>
      <View className="sub">照护任务与提醒</View>

      <View className="card">
        <View className="field">
          <Text>新任务</Text>
          <Input className="input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="例如：晚饭后喂药" />
        </View>
        <Button className="btn btn-primary" onClick={create} disabled={!title.trim()}>
          添加任务
        </Button>
      </View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && tasks.length === 0 && <View className="state">没有待办任务。</View>}
      {tasks.map((t) => (
        <View className="card" key={t.id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{t.title}</Text>
            <Button className="btn" size="mini" onClick={() => complete(t.id)}>
              完成
            </Button>
          </View>
          <View className="muted">
            {t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}
            {t.conflict_count > 0 ? ` · 有 ${t.conflict_count} 处冲突提醒` : ""}
          </View>
        </View>
      ))}
    </View>
  );
}