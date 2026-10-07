/**
 * TrainingScreen — 目标与进展优先 (Stage R.2 §47): Current Goal → Progress →
 * Safe Tools → (+ 新训练目标 last). 奖励式正向强化，只记录事实反应与奖励。
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePets } from "../context";
import { api, humanizeError, type TrainingGoalRow, type TrainingTools } from "../api";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";

interface PreferenceRow {
  preference_id: string;
  kind: "LIKE" | "DISLIKE" | "ALLERGY_CAUTION" | "REWARD";
  subject: string;
  note: string;
  source_type: string;
}

interface TrainingSessionRow {
  session_id: string;
  goal_id: string | null;
  session_at: string;
  duration_minutes: number;
  focus: string;
  notes: string;
  pet_response: string;
  rewards_used: string[];
}

function responseLabel(response: string): string {
  if (response === "GREAT") return "表现很好";
  if (response === "GOOD") return "表现好";
  if (response === "POOR") return "遇到困难";
  return "已记录";
}

function sessionTimeLabel(value: string): string {
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}

export function TrainingScreen() {
  const { pets, petId } = usePets();
  const [goals, setGoals] = useState<TrainingGoalRow[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);
  const [sessionsState, setSessionsState] = useState<"loading" | "ready" | "error">("loading");
  const [tools, setTools] = useState<TrainingTools | null>(null);
  const [toolsState, setToolsState] = useState<"loading" | "ready" | "error">("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyGoal, setBusyGoal] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [rewards, setRewards] = useState<PreferenceRow[]>([]);
  const [rewardState, setRewardState] = useState<"loading" | "ready" | "error">("loading");
  const [rewardSubject, setRewardSubject] = useState("");
  const [rewardNote, setRewardNote] = useState("");
  const [selectedReward, setSelectedReward] = useState("");
  const [rewardBusy, setRewardBusy] = useState(false);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setToolsState("loading");
    api
      .get<TrainingGoalRow[]>(`/pets/${petId}/training-goals`)
      .then((r) => {
        if (alive) {
          setGoals(r);
          setError(false);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    setSessionsState("loading");
    api
      .get<TrainingSessionRow[]>(`/pets/${petId}/training-sessions?limit=8`)
      .then((rows) => {
        if (alive) {
          setSessions(rows);
          setSessionsState("ready");
        }
      })
      .catch(() => {
        if (alive) {
          setSessions([]);
          setSessionsState("error");
        }
      });
    setRewardState("loading");
    api.get<PreferenceRow[]>(`/pets/${petId}/preferences`)
      .then((items) => {
        if (!alive) return;
        setRewards(items.filter((row) => row.kind === "REWARD"));
        setRewardState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setRewards([]);
        setRewardState("error");
      });
    api
      .get<TrainingTools>("/training/tools")
      .then((r) => {
        if (alive) {
          setTools(r);
          setToolsState("ready");
        }
      })
      .catch(() => {
        if (alive) {
          setTools(null);
          setToolsState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  async function addReward() {
    if (!petId || !rewardSubject.trim() || rewardBusy) return;
    setRewardBusy(true);
    setFormError(null);
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
      setVersion((value) => value + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setRewardBusy(false);
    }
  }

  async function createGoal() {
    if (!petId || !title.trim()) return;
    setFormError(null);
    try {
      await api.post(`/pets/${petId}/training-goals`, { title: title.trim() });
      setTitle("");
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    }
  }

  async function logSession(goalId: string, response: string) {
    if (!petId || busyGoal) return;
    setBusyGoal(goalId);
    setFormError(null);
    try {
      await api.post(`/pets/${petId}/training-sessions`, {
        goal_id: goalId,
        duration_minutes: 5,
        pet_response: response,
        rewards_used: selectedReward ? [selectedReward] : [],
      });
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setBusyGoal(null);
    }
  }

  const current = goals[0] ?? null;
  const goalsUnavailable = error && goals.length === 0;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.training.identity">
          <Text style={styles.title}>{pet ? `${pet.name}的训练` : "训练"}</Text>
          <Text style={styles.sub}>奖励式正向强化 · 只记录事实反应与奖励。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="当前目标" testID="pli.training.goal">
              {goalsUnavailable ? (
                <Text style={styles.emptyText}>训练目标暂时没有加载成功；不会把未知状态显示成“没有目标”。</Text>
              ) : current ? (
                <View style={styles.goalCard}>
                  <View style={styles.goalHead}>
                    <Text style={styles.goalTitle}>{current.title}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{statusLabel(current.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>掌握度 {current.mastery_level}/5</Text>
                  <Text testID="pli.training.next" style={styles.progressMeta}>{current.target_behavior || "目标行为待细化"}</Text>
                  </View>
                  {current.steps?.length ? (
                    <View style={styles.steps}>
                      {current.steps.map((st, i) => (
                        <View key={i} style={styles.stepRow}>
                          <Text style={styles.stepMark}>{st.status === "DONE" ? "✓" : "○"}</Text>
                          <Text style={styles.stepText}>{st.description}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text testID="pli.training.reward" style={styles.rewardText}>本次奖励：{selectedReward || "未选择"} · 正向强化</Text>
                  <View style={styles.sessionRow}>
                    <SessionChip label="表现好" onPress={() => void logSession(current.goal_id, "GOOD")} disabled={busyGoal !== null} />
                    <SessionChip label="表现很好" onPress={() => void logSession(current.goal_id, "GREAT")} disabled={busyGoal !== null} />
                    <SessionChip label="遇到困难" onPress={() => void logSession(current.goal_id, "POOR")} disabled={busyGoal !== null} />
                  </View>
                  {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                </View>
              ) : (
                <EmptyState
                  title="还没有训练目标"
                  body={`记录${pet?.name ?? "宠物"}正在学习的第一件事。`}
                  actionLabel="创建目标"
                  onAction={() => setFormOpen(true)}
                />
              )}
            </OpenSection>

            {current ? (
              <OpenSection title="进展" testID="pli.training.progress">
                <Text style={styles.progressNote}>掌握度只由已经提交的训练会话更新；不会根据猜测或一次表现自动判定“学会了”。</Text>
              </OpenSection>
            ) : null}

            <OpenSection title="最近会话与结果" testID="pli.training.recent">
              {sessionsState === "loading" ? (
                <Text style={styles.emptyText}>正在读取最近训练会话……</Text>
              ) : sessionsState === "error" ? (
                <Text style={styles.emptyText}>最近会话暂时没有加载成功；不会用目标掌握度反推不存在的会话。</Text>
              ) : sessions.length === 0 ? (
                <Text style={styles.emptyText}>还没有记录过训练会话。</Text>
              ) : (
                sessions.slice(0, 5).map((session, index) => {
                  const goal = goals.find((item) => item.goal_id === session.goal_id);
                  return (
                    <View key={session.session_id} style={[styles.historyRow, index > 0 && styles.rowDivider]}>
                      <View style={styles.historyHead}>
                        <Text style={styles.historyGoal}>{goal?.title ?? "训练会话"}</Text>
                        <Text style={styles.historyOutcome}>结果：{responseLabel(session.pet_response)}</Text>
                      </View>
                      <Text style={styles.historyMeta}>
                        {sessionTimeLabel(session.session_at)} · {session.duration_minutes} 分钟
                        {session.focus ? ` · ${session.focus}` : ""}
                      </Text>
                      {session.rewards_used?.length ? (
                        <Text style={styles.historyMeta}>奖励：{session.rewards_used.join("、")}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </OpenSection>

            <OpenSection title="奖励偏好" testID="pli.training.rewards">
              <Text style={styles.emptyText}>只保存主人明确观察到有效、且愿意使用的正向奖励；本次训练未选择奖励时不会自动写“零食”。</Text>
              {rewardState === "loading" ? (
                <Text style={styles.emptyText}>正在读取奖励偏好……</Text>
              ) : rewardState === "error" ? (
                <Text style={styles.emptyText}>奖励偏好暂时没有加载成功；不会用默认奖励补齐。</Text>
              ) : rewards.length ? (
                <View style={styles.sessionRow}>
                  {rewards.map((row) => (
                    <Pressable
                      key={row.preference_id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedReward === row.subject }}
                      onPress={() => setSelectedReward((value) => value === row.subject ? "" : row.subject)}
                      style={[styles.rewardChip, selectedReward === row.subject && styles.rewardChipSelected]}
                    >
                      <Text style={[styles.rewardChipText, selectedReward === row.subject && styles.rewardChipTextSelected]}>{row.subject}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>还没有保存奖励偏好。</Text>
              )}
              <Text style={styles.historyMeta}>本次会话奖励：{selectedReward || "未选择（不会写入奖励）"}</Text>
              <TextInput style={styles.input} value={rewardSubject} onChangeText={setRewardSubject} placeholder="例如：冻干鸡肉 / 拉扯玩具 / 抚摸" placeholderTextColor={COLORS.textTertiary} />
              <TextInput style={styles.input} value={rewardNote} onChangeText={setRewardNote} placeholder="补充实际观察（可选）" placeholderTextColor={COLORS.textTertiary} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="保存奖励偏好"
                disabled={rewardBusy || !rewardSubject.trim()}
                onPress={() => void addReward()}
                style={[styles.submitBtn, (rewardBusy || !rewardSubject.trim()) && styles.pressed]}
              >
                <Text style={styles.submitText}>{rewardBusy ? "保存中…" : "保存奖励偏好"}</Text>
              </Pressable>
            </OpenSection>

            <OpenSection title="安全工具" caption={tools?.banned_note ?? undefined}>
              {toolsState === "loading" ? (
                <Text style={styles.emptyText}>正在读取训练工具说明……</Text>
              ) : toolsState === "error" ? (
                <Text style={styles.emptyText}>训练工具说明暂时没有加载成功；不会用默认建议替代真实配置。</Text>
              ) : tools ? (
                tools.tools.map((t) => (
                  <View key={t.name} style={styles.toolRow}>
                    <Text style={styles.toolName}>{t.name}</Text>
                    <Text style={styles.toolUse}>{t.use}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>当前没有可用的训练工具说明。</Text>
              )}
            </OpenSection>

            <View style={styles.formSection}>
              <Pressable
                testID="pli.training.action"
                accessibilityRole="button"
                accessibilityLabel={formOpen ? "收起新训练目标表单" : "新建训练目标"}
                accessibilityState={{ expanded: formOpen }}
                onPress={() => setFormOpen((v) => !v)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <Text style={styles.formToggleText}>{formOpen ? "收起" : "+ 新训练目标"}</Text>
              </Pressable>
              {formOpen ? (
                <View style={styles.formWrap}>
                  <Text style={styles.fieldLabel}>目标名称</Text>
                  <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="例如：安静应对门铃" placeholderTextColor={COLORS.textTertiary} />
                  {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="创建目标"
                    accessibilityState={{ disabled: !title.trim() }}
                    disabled={!title.trim()}
                    onPress={() => void createGoal()}
                    style={({ pressed }) => [styles.submitBtn, !title.trim() && styles.pressed, pressed && styles.pressed]}
                  >
                    <Text style={styles.submitText}>创建</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(status: string): string {
  if (status === "ACTIVE" || status === "OPEN") return "进行中";
  if (status === "ACHIEVED" || status === "COMPLETED") return "已完成";
  if (status === "PAUSED") return "已暂停";
  if (status === "ARCHIVED") return "已归档";
  return "状态已记录";
}

function SessionChip({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`记录会话：${label}`} accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.sessionChip, disabled && styles.pressed, pressed && styles.pressed]}>
      <Text style={styles.sessionChipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  // V4 §5 SoftPanel: warm soft surface, no white bordered box.
  goalCard: { backgroundColor: COLORS.brandSoftAmber, borderRadius: RADIUS.xl, padding: SPACE.s4 },
  goalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s2 },
  goalTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, flex: 1 },
  statusPill: { backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  progressMeta: { fontSize: TYPE.meta, color: COLORS.textTertiary, flex: 1 },
  rewardText: { fontSize: TYPE.meta, color: COLORS.textSecondary, marginTop: SPACE.s2 },
  statusText: { fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s2 },
  progressText: { fontSize: TYPE.sm, color: COLORS.brandSecondary, fontWeight: "600" },
  steps: { marginTop: SPACE.s2, gap: 6 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  stepMark: { fontSize: TYPE.body, color: COLORS.brandPrimaryDeep, width: 16 },
  stepText: { fontSize: TYPE.sm, color: COLORS.textSecondary, flex: 1 },
  sessionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  sessionChip: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: SPACE.s3, paddingVertical: 8 },
  sessionChipText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  rewardChip: { minHeight: 40, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceRaised },
  rewardChipSelected: { backgroundColor: COLORS.brandSoftGreen },
  rewardChipText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  rewardChipTextSelected: { color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  progressNote: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  historyRow: { paddingVertical: 10 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.dividerSubtle },
  historyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s2 },
  historyGoal: { flex: 1, fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  historyOutcome: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  historyMeta: { marginTop: 4, fontSize: TYPE.meta, color: COLORS.textTertiary },
  toolRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  toolName: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  toolUse: { fontSize: TYPE.meta, color: COLORS.textTertiary },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { minHeight: 48, justifyContent: "center", paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center" },
  formToggleText: { fontSize: TYPE.button, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  formWrap: { marginTop: SPACE.s3 },
  fieldLabel: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginBottom: SPACE.s1 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger, marginTop: SPACE.s2 },
  submitBtn: { minHeight: 48, justifyContent: "center", marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
