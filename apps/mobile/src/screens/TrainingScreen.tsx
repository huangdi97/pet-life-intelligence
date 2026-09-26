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

export function TrainingScreen() {
  const { pets, petId } = usePets();
  const [goals, setGoals] = useState<TrainingGoalRow[]>([]);
  const [tools, setTools] = useState<TrainingTools | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyGoal, setBusyGoal] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
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
    api
      .get<TrainingTools>("/training/tools")
      .then((r) => {
        if (alive) setTools(r);
      })
      .catch(() => {
        if (alive) setTools(null);
      });
    return () => {
      alive = false;
    };
  }, [petId, version]);

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
        rewards_used: ["零食"],
      });
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setFormError(humanizeError(e));
    } finally {
      setBusyGoal(null);
    }
  }

  const current = goals[0] ?? null;

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
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
            <OpenSection title="当前目标">
              {current ? (
                <View style={styles.goalCard}>
                  <View style={styles.goalHead}>
                    <Text style={styles.goalTitle}>{current.title}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{statusLabel(current.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressText}>掌握度 {current.mastery_level}/5</Text>
                    <Text style={styles.progressMeta}>{current.target_behavior || "目标行为待细化"}</Text>
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
                  body="记录豆豆正在学习的第一件事。"
                  actionLabel="创建目标"
                  onAction={() => setFormOpen(true)}
                />
              )}
            </OpenSection>

            {current ? (
              <OpenSection title="进展">
                <Text style={styles.progressNote}>每次会话都会累积到掌握度。与它自己相比，慢慢进步就好。</Text>
              </OpenSection>
            ) : null}

            {tools ? (
              <OpenSection title="安全工具" caption={tools.banned_note ?? undefined}>
                {tools.tools.map((t) => (
                  <View key={t.name} style={styles.toolRow}>
                    <Text style={styles.toolName}>{t.name}</Text>
                    <Text style={styles.toolUse}>{t.use}</Text>
                  </View>
                ))}
              </OpenSection>
            ) : null}

            <View style={styles.formSection}>
              <Pressable
                accessibilityRole="button"
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
  if (status === "ACTIVE") return "进行中";
  if (status === "ACHIEVED") return "已达成";
  if (status === "PAUSED") return "已暂停";
  return status;
}

function SessionChip({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`记录会话：${label}`} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.sessionChip, disabled && styles.pressed, pressed && styles.pressed]}>
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
  goalCard: { backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.dividerSubtle, padding: SPACE.s4 },
  goalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s2 },
  goalTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, flex: 1 },
  statusPill: { backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s2 },
  progressText: { fontSize: TYPE.sm, color: COLORS.brandSecondary, fontWeight: "600" },
  progressMeta: { fontSize: TYPE.meta, color: COLORS.textTertiary, flex: 1 },
  steps: { marginTop: SPACE.s2, gap: 6 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  stepMark: { fontSize: TYPE.body, color: COLORS.brandPrimaryDeep, width: 16 },
  stepText: { fontSize: TYPE.sm, color: COLORS.textSecondary, flex: 1 },
  sessionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  sessionChip: { backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: SPACE.s3, paddingVertical: 8 },
  sessionChipText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  progressNote: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  toolRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  toolName: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  toolUse: { fontSize: TYPE.meta, color: COLORS.textTertiary },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { paddingVertical: 12, borderRadius: 999, backgroundColor: COLORS.brandSoftGreen, alignItems: "center" },
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
  submitBtn: { marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  submitText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
