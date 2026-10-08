import { useCallback, useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";
import { PetContextGate } from "../../components/feedback/Feedback";

function statusLabel(status: string): string {
  if (status === "ACTIVE" || status === "OPEN") return "进行中";
  if (status === "ACHIEVED" || status === "COMPLETED") return "已完成";
  if (status === "PAUSED") return "已暂停";
  if (status === "ARCHIVED") return "已归档";
  return "状态已记录";
}

interface PreferenceRow {
  preference_id: string;
  kind: "LIKE" | "DISLIKE" | "ALLERGY_CAUTION" | "REWARD";
  subject: string;
  note: string;
  source_type: string;
}

interface TrainingGoal {
  goal_id: string;
  title: string;
  status: string;
  mastery_level: number;
  target_behavior: string;
  steps: Array<{ description: string; status: string }>;
}

interface TrainingTools {
  tools: Array<{ name: string; use: string; safe?: boolean }>;
  banned_note: string;
  version?: string;
}

interface TrainingSession {
  session_id: string;
  goal_id: string | null;
  session_at: string;
  duration_minutes: number;
  focus: string;
  pet_response: string;
  rewards_used: string[];
}

function responseLabel(response: string): string {
  if (response === "GREAT") return "表现很好";
  if (response === "GOOD") return "表现好";
  if (response === "POOR") return "遇到困难";
  return "已记录";
}

/**
 * Mini Training — semantic parity at lower density.
 *
 * Owner hierarchy follows the R5.5 contract:
 * Goal → Session → Progress → Outcome. Mastery is read from the backend and
 * changes only after a real recorded session; the client never invents a
 * training score or a pet response.
 */
export default function Training() {
  const { pets, petId, state: petContextState, refresh: refreshPets } = usePets();
  const currentPet = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [sessionState, setSessionState] = useState<"loading" | "ready" | "error">("loading");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [title, setTitle] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [busyGoal, setBusyGoal] = useState<string | null>(null);
  const [rewards, setRewards] = useState<PreferenceRow[]>([]);
  const [rewardState, setRewardState] = useState<"loading" | "ready" | "error">("loading");
  const [rewardSubject, setRewardSubject] = useState("");
  const [rewardNote, setRewardNote] = useState("");
  const [selectedReward, setSelectedReward] = useState("");
  const [rewardBusy, setRewardBusy] = useState(false);
  const [tools, setTools] = useState<TrainingTools | null>(null);
  const [toolsState, setToolsState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback((pid: string) => {
    setState("loading");
    setSessionState("loading");
    api
      .get<TrainingGoal[]>(`/pets/${pid}/training-goals`)
      .then((rows) => {
        setGoals(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
    setRewardState("loading");
    setToolsState("loading");
    api.get<TrainingTools>("/training/tools")
      .then((value) => {
        setTools(value);
        setToolsState("ready");
      })
      .catch(() => {
        setTools(null);
        setToolsState("error");
      });
    api.get<PreferenceRow[]>(`/pets/${pid}/preferences`)
      .then((items) => {
        setRewards(items.filter((row) => row.kind === "REWARD"));
        setRewardState("ready");
      })
      .catch(() => {
        setRewards([]);
        setRewardState("error");
      });
    api
      .get<TrainingSession[]>(`/pets/${pid}/training-sessions?limit=8`)
      .then((rows) => {
        setSessions(rows);
        setSessionState("ready");
      })
      .catch(() => {
        setSessions([]);
        setSessionState("error");
      });
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  if (petContextState !== "ready" || !petId || !pets?.length) {
    return (
      <View className="page">
        <View className="h1">训练</View>
        <PetContextGate state={petContextState} hasPet={Boolean(petId && pets?.length)} onRetry={refreshPets} />
      </View>
    );
  }

  async function addReward() {
    if (!petId || !rewardSubject.trim() || rewardBusy) return;
    setRewardBusy(true);
    try {
      const row = await api.post<{ preference_id: string; kind: string; subject: string }>(`/pets/${petId}/preferences`, {
        kind: "REWARD",
        subject: rewardSubject.trim(),
        note: rewardNote.trim(),
        source_type: "OWNER_REPORTED",
      });
      setSelectedReward(row.subject);
      setRewardSubject("");
      setRewardNote("");
      load(petId);
      Taro.showToast({ title: "奖励偏好已保存", icon: "success" });
    } catch {
      setRewardState("error");
      Taro.showToast({ title: "暂时无法保存奖励偏好", icon: "none" });
    } finally {
      setRewardBusy(false);
    }
  }

  async function create() {
    if (!title.trim() || !petId) return;
    try {
      await api.post(`/pets/${petId}/training-goals`, { title: title.trim() });
      setTitle("");
      setFormOpen(false);
      load(petId);
      Taro.showToast({ title: "已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "创建失败", icon: "none" });
    }
  }

  async function logSession(goalId: string, response: "GOOD" | "GREAT" | "POOR") {
    if (!petId || busyGoal) return;
    setBusyGoal(goalId);
    try {
      await api.post(`/pets/${petId}/training-sessions`, {
        goal_id: goalId,
        duration_minutes: 5,
        pet_response: response,
        rewards_used: selectedReward ? [selectedReward] : [],
      });
      load(petId);
      Taro.showToast({ title: "训练会话已记录", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    } finally {
      setBusyGoal(null);
    }
  }

  const current = goals[0] ?? null;

  return (
    <View className="page">
      <View className="h1">{currentPet ? `${currentPet.name}的训练` : "训练"}</View>
      <View className="sub">先看目标与真实会话带来的进展，再决定下一步；坚持奖励式正向强化。</View>

      {state === "loading" && <View className="state">正在读取训练记录……</View>}
      {state === "error" && (
        <View className="state state-error">
          训练记录暂时没有加载成功；不会把未知状态显示成“没有目标”。
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}

      {state === "ready" && (
        <>
          <View className="open-section" data-testid="pli.mini.training.goal">
            <View className="section-title">当前目标</View>
            {current ? (
              <View className="soft-panel">
                <View className="life-row-head">
                  <Text className="life-row-type">{current.title}</Text>
                  <Text className="life-row-time">{statusLabel(current.status)}</Text>
                </View>
                <View className="life-row-detail">
                  {current.target_behavior || "目标行为还没有补充说明"}
                </View>
                {current.steps?.length ? (
                  <View style={{ marginTop: 8 }}>
                    {current.steps.map((step, index) => (
                      <View className="life-row-detail" key={`${current.goal_id}-step-${index}`}>
                        {step.status === "DONE" ? "✓" : "○"} {step.description}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="life-empty-note">还没有训练目标。先建立一个具体、可观察的小目标。</View>
            )}
          </View>

          {current ? (
            <>
              <View className="open-section" data-testid="pli.mini.training.progress">
                <View className="section-title">进展</View>
                <View className="soft-hero">
                  <View className="metric-row">
                    <View className="metric-cell">
                      <View className="metric-value">{current.mastery_level}/5</View>
                      <View className="metric-label">已记录会话带来的掌握度</View>
                    </View>
                  </View>
                  <View className="life-row-source">
                    掌握度只由已经提交的训练会话更新，不根据猜测或一次表现自动判定“学会了”。
                  </View>
                </View>
              </View>

              <View className="open-section" data-testid="pli.mini.training.rewards">
                <View className="section-title">奖励偏好</View>
                <View className="life-row-source">只保存主人明确观察到有效、且愿意使用的正向奖励；未选择时不会自动写“零食”。</View>
                {rewardState === "loading" ? (
                  <View className="state">正在读取奖励偏好……</View>
                ) : rewardState === "error" ? (
                  <View className="state state-error">奖励偏好暂时没有加载成功；不会用默认奖励补齐。</View>
                ) : rewards.length ? (
                  <View className="chips">
                    {rewards.map((row) => (
                      <View
                        key={row.preference_id}
                        className={`chip${selectedReward === row.subject ? " chip-active" : ""}`}
                        onClick={() => setSelectedReward((value) => value === row.subject ? "" : row.subject)}
                      >
                        {row.subject}
                      </View>
                    ))}
                  </View>
                ) : <View className="life-empty-note">还没有保存奖励偏好。</View>}
                <View className="field">
                  <Text>新奖励</Text>
                  <Input className="input" value={rewardSubject} onInput={(event) => setRewardSubject(event.detail.value)} placeholder="例如：冻干鸡肉 / 拉扯玩具 / 抚摸" />
                </View>
                <View className="field">
                  <Text>补充事实（可选）</Text>
                  <Input className="input" value={rewardNote} onInput={(event) => setRewardNote(event.detail.value)} placeholder="例如：在安静环境下反应最好" />
                </View>
                <Button className="btn" disabled={rewardBusy || !rewardSubject.trim()} onClick={() => void addReward()}>
                  {rewardBusy ? "保存中…" : "保存奖励偏好"}
                </Button>
              </View>

              <View className="open-section" data-testid="pli.mini.training.history">
                <View className="section-title">最近会话与结果</View>
                {sessionState === "loading" ? (
                  <View className="life-empty-note">正在读取最近训练会话……</View>
                ) : sessionState === "error" ? (
                  <View className="life-empty-note">最近会话暂时没有加载成功；不会用掌握度反推不存在的会话。</View>
                ) : sessions.length === 0 ? (
                  <View className="life-empty-note">还没有记录过训练会话。</View>
                ) : (
                  sessions.slice(0, 4).map((session) => {
                    const goal = goals.find((item) => item.goal_id === session.goal_id);
                    return (
                      <View className="life-row" key={session.session_id}>
                        <View className="life-row-head">
                          <Text className="life-row-type">{goal?.title ?? "训练会话"}</Text>
                          <Text className="life-row-time">结果：{responseLabel(session.pet_response)}</Text>
                        </View>
                        <View className="life-row-detail">
                          {fmtTime(session.session_at)} · {session.duration_minutes} 分钟
                          {session.focus ? ` · ${session.focus}` : ""}
                        </View>
                        {session.rewards_used?.length ? (
                          <View className="life-row-source">奖励：{session.rewards_used.join("、")}</View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>

              <View className="open-section" data-testid="pli.mini.training.session">
                <View className="section-title">记录这次训练</View>
                <View className="life-empty-note">默认记录 5 分钟；只记录你实际观察到的反应。本次奖励：{selectedReward || "未选择（不会写入奖励）"}。</View>
                <View className="chips">
                  {([
                    ["GOOD", "表现好"],
                    ["GREAT", "表现很好"],
                    ["POOR", "遇到困难"],
                  ] as const).map(([response, label]) => (
                    <View
                      key={response}
                      className="chip"
                      onClick={() => void logSession(current.goal_id, response)}
                    >
                      {busyGoal === current.goal_id ? "记录中…" : label}
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          <View className="open-section" data-testid="pli.mini.training.tools">
            <View className="section-title">安全训练工具</View>
            <View className="life-row-source">
              这里只展示服务端版本化的正向强化工具；不会在加载失败时用客户端默认建议替代。
            </View>
            {toolsState === "loading" ? (
              <View className="state">正在读取训练工具……</View>
            ) : toolsState === "error" ? (
              <View className="state state-error">训练工具暂时没有加载成功；请稍后重试。</View>
            ) : tools?.tools?.length ? (
              tools.tools.map((tool) => (
                <View className="life-row" key={tool.name}>
                  <View className="life-row-body">
                    <View className="life-row-head">
                      <Text className="life-row-type">{tool.name}</Text>
                      <Text className="life-row-time">{tool.use}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View className="life-empty-note">当前没有可用的安全训练工具说明。</View>
            )}
            {tools?.banned_note ? <View className="life-row-source">{tools.banned_note}</View> : null}
          </View>

          <View className="open-section">
            <View className="section-title" onClick={() => setFormOpen((value) => !value)}>
              下一步
              <Text className="section-caption">{formOpen ? "收起" : "＋ 新训练目标"}</Text>
            </View>
            <View className="life-row-source">
              {current ? "继续当前目标，或在确实需要时再建立一个新的小目标。" : "从 3–5 分钟、可观察的小目标开始。"}
            </View>
            {formOpen ? (
              <View className="soft-panel">
                <View className="field">
                  <Text>目标名称</Text>
                  <Input className="input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="例如：安静应对门铃" />
                </View>
                <Button className="btn btn-primary" onClick={create} disabled={!title.trim()}>
                  添加目标
                </Button>
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}
