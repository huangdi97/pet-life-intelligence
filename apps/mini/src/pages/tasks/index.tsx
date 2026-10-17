import { useCallback, useEffect, useState } from "react";
import { View, Text, Button, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type Task } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { PetContextGate } from "../../components/feedback/Feedback";
import { fmtTime } from "../../utils/format";

export default function Tasks() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [title, setTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">任务</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function create() {
    if (!title.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/tasks`, { title: title.trim(), task_type: "OTHER" });
      setTitle("");
      setCreateOpen(false);
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

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      <View className="open-section" data-testid="pli.mini.tasks.current">
        <View className="section-title">当前任务</View>
        <View className="life-row-source">待完成事项优先；完成后保留记录，不让新建表单抢占首屏。</View>
        {state === "ready" && tasks.length === 0 ? <View className="life-empty-note">没有待办任务。</View> : null}
        {tasks.map((t) => (
          <View className="life-row" key={t.id}>
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{t.title}</Text>
                <Button className="btn" size="mini" onClick={() => complete(t.id)}>完成</Button>
              </View>
              <View className="life-row-detail">
                {t.due_at ? `截止 ${fmtTime(t.due_at)}` : "无截止"}
                {t.conflict_count > 0 ? ` · 有 ${t.conflict_count} 处冲突提醒` : ""}
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className="open-section" data-testid="pli.mini.tasks.create">
        <View className="section-title" onClick={() => setCreateOpen((value) => !value)}>
          新建任务
          <Text className="section-caption">{createOpen ? "收起" : "＋ 新建"}</Text>
        </View>
        <View className="life-row-source">先看当前待办，需要新的照护事项时再创建。</View>
        {createOpen ? (
          <View className="soft-panel">
            <View className="field">
              <Text>任务名称</Text>
              <Input className="input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="例如：晚饭后喂药" />
            </View>
            <Button data-testid="pli.mini.tasks.create.submit" className="btn btn-primary" onClick={create} disabled={!title.trim()}>
              添加任务
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}