/** TrainingScreen — 训练 (PLI-085..088 mobile port of apps/web/app/training):
 *  奖励式训练目标与会话记录，仅使用正向强化；记录环境/反应/奖励，
 *  不只是“完成课程”。目标/会话数据均来自既有后端路由。 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type TrainingGoalRow, type TrainingTools } from "../api";
import { usePets } from "../context";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Badge, Card, EmptyText, ErrorText, GhostButton, Loading, MutedText, PrimaryButton, ScreenTitle, SectionTitle } from "./ui";

export function TrainingScreen() {
  const { petId } = usePets();
  const [goals, setGoals] = useState<TrainingGoalRow[]>([]);
  const [tools, setTools] = useState<TrainingTools | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busyGoal, setBusyGoal] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<TrainingGoalRow[]>(`/pets/${petId}/training-goals`)
      .then((r) => {
        if (!alive) return;
        setGoals(r);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
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

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="训练" sub="奖励式训练目标与会话记录（PLI-085..088）。仅使用正向强化方法。" />

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <Loading />}

        <Card>
          <SectionTitle>新建训练目标</SectionTitle>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="例如：安静应对门铃"
            placeholderTextColor={COLORS.inkDisabled}
          />
          {formError && <ErrorText>{formError}</ErrorText>}
          <PrimaryButton label="创建" onPress={() => void createGoal()} disabled={!title.trim()} />
        </Card>

        <SectionTitle>训练目标</SectionTitle>
        {!loading && goals.length === 0 ? (
          <EmptyText>还没有训练目标。</EmptyText>
        ) : (
          goals.map((g) => (
            <Card key={g.goal_id}>
              <View style={styles.headRow}>
                <Text style={styles.goalTitle}>{g.title}</Text>
                <Badge text={statusLabel(g.status)} color={COLORS.primary700} bg={COLORS.primary100} />
              </View>
              <View style={styles.metaRow}>
                <Badge text={`掌握度 ${g.mastery_level}/5`} color={COLORS.accent600} bg={COLORS.accent50} />
                <Text style={styles.metaText}>{g.target_behavior || "—"}</Text>
              </View>
              <View style={styles.sessionRow}>
                <GhostButton small label="记录会话：表现好" onPress={() => void logSession(g.goal_id, "GOOD")} />
                <GhostButton small label="表现很好" onPress={() => void logSession(g.goal_id, "GREAT")} />
                <GhostButton small label="遇到困难" onPress={() => void logSession(g.goal_id, "POOR")} />
              </View>
            </Card>
          ))
        )}

        {tools && (
          <>
            <SectionTitle>训练工具库（仅安全工具）</SectionTitle>
            <Card>
              {tools.tools.map((t) => (
                <View key={t.name} style={styles.toolRow}>
                  <Text style={styles.toolName}>{t.name}</Text>
                  <Badge text={t.use} color={COLORS.inkSecondary} bg={COLORS.bgSurfaceMuted} />
                </View>
              ))}
              {tools.banned_note ? <MutedText>{tools.banned_note}</MutedText> : null}
            </Card>
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: 10,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.base,
    color: COLORS.inkPrimary,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary, flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s2 },
  metaText: { fontSize: TYPE.xs, color: COLORS.inkSecondary, flex: 1 },
  sessionRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  toolRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: SPACE.s1 },
  toolName: { fontSize: TYPE.base, color: COLORS.inkPrimary },
});
