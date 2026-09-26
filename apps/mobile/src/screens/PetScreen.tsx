/**
 * PetScreen — Pet World / Pet Identity page (Stage R.2 §28-30).
 * One large pet visual + identity + life summary + Life View entry +
 * per-domain meaning (what each domain means for THIS pet right now),
 * sourced from real API data. No feature grid, no letter-avatar primary.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, type BehaviorEventRow, type HealthEventRow, type LifeEvent, type TrainingGoalRow, type WelfareEvidence } from "../api";
import { usePets } from "../context";
import { petAgeText, sexLabel, speciesLabel } from "../format";
import { COLORS, DEMO_ENV, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { PetHero } from "../components/pet/PetHero";
import { OpenSection } from "../components/feedback/OpenSection";
import { Skeleton } from "../components/feedback/Feedback";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { eventTypeLabel } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

interface DomainRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meaning: string;
  route: keyof StackParamList;
}

export function PetScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [today, setToday] = useState<{ events: LifeEvent[]; event_counts: Record<string, number> } | null>(null);
  const [healthCount, setHealthCount] = useState<number | null>(null);
  const [lastBehavior, setLastBehavior] = useState<BehaviorEventRow | null>(null);
  const [goal, setGoal] = useState<TrainingGoalRow | null>(null);
  const [welfare, setWelfare] = useState<WelfareEvidence | null>(null);
  const [loading, setLoading] = useState(true);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<{ events: LifeEvent[]; event_counts: Record<string, number> }>(`/pets/${pet.id}/today`),
      api.get<HealthEventRow[]>(`/pets/${pet.id}/health-events`),
      api.get<BehaviorEventRow[]>(`/pets/${pet.id}/behavior-events`),
      api.get<TrainingGoalRow[]>(`/pets/${pet.id}/training-goals`),
      api.get<WelfareEvidence>(`/pets/${pet.id}/welfare-evidence`),
    ]).then(([t, he, be, tg, wv]) => {
      if (!alive) return;
      if (t.status === "fulfilled") setToday(t.value);
      if (he.status === "fulfilled") setHealthCount(he.value.length);
      if (be.status === "fulfilled") setLastBehavior(be.value[0] ?? null);
      if (tg.status === "fulfilled") setGoal(tg.value[0] ?? null);
      if (wv.status === "fulfilled") setWelfare(wv.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  const todayCount = today ? Object.values(today.event_counts).reduce((a, b) => a + b, 0) : null;
  const lastActivity = today?.events.find((e) => e.event_type !== "today.viewed") ?? null;

  const rows = useMemo<DomainRow[]>(() => {
    const healthMeaning = healthCount === null ? "暂无记录" : `最近 7 天 · ${healthCount} 条记录`;
    const behaviorMeaning = lastBehavior ? `最近一次：${lastBehavior.behavior.slice(0, 22)}${lastBehavior.behavior.length > 22 ? "…" : ""}` : "还没有行为观察";
    const trainingMeaning = goal ? `当前目标：${goal.title}` : "还没有训练目标";
    const welfareMeaning = welfare && Object.keys(welfare.observation_counts ?? {}).length
      ? `近期 ${Object.values(welfare.observation_counts).reduce((a, b) => a + b, 0)} 条观察`
      : "最近没有新增观察";
    return [
      { key: "health", icon: "medkit-outline", label: "健康", meaning: healthMeaning, route: "Health" },
      { key: "behavior", icon: "paw-outline", label: "行为", meaning: behaviorMeaning, route: "Behavior" },
      { key: "training", icon: "ribbon-outline", label: "训练", meaning: trainingMeaning, route: "Training" },
      { key: "welfare", icon: "home-outline", label: "福利", meaning: welfareMeaning, route: "Welfare" },
      { key: "social", icon: "people-outline", label: "社交", meaning: "关系与最近互动", route: "Social" },
    ];
  }, [healthCount, lastBehavior, goal, welfare]);

  const identityLine = pet
    ? [`${petAgeText(pet.birth_date) ?? "年龄未知"}`, pet.breed, sexLabel(pet.sex)].filter(Boolean).join(" · ")
    : "";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PetHero
          pet={pet}
          mediaUri={resolvePetMediaUri(pet)}
          headline={identityLine || "宠物档案"}
          identity={pet ? `${speciesLabel(pet.species)} · ${pet.name}` : undefined}
          demo={DEMO_ENV}
          height={300}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={2} />
          </View>
        ) : (
          <>
            <OpenSection title="生活摘要">
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>最近一次记录</Text>
                <Text style={styles.summaryValue}>
                  {lastActivity ? `${eventTypeLabel(lastActivity.event_type)} · ${new Date(lastActivity.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}` : "今天还没有活动记录"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>今天事件</Text>
                <Text style={styles.summaryValue}>{todayCount === null ? "—" : `${todayCount} 条`}</Text>
              </View>
            </OpenSection>

            <Pressable
              accessibilityRole="button"
              style={styles.lifeViewEntry}
              onPress={() => navigation.navigate("LifeView")}
            >
              <View style={styles.lifeViewGlyph}>
                <Ionicons name="planet-outline" size={22} color={COLORS.textOnDark} />
              </View>
              <View style={styles.lifeViewText}>
                <Text style={styles.lifeViewTitle}>生命视图</Text>
                <Text style={styles.lifeViewSub}>豆豆 · 此刻与长期生活轨迹</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </Pressable>

            <OpenSection title="它最近怎么样">
              {rows.map((r, i) => (
                <Pressable
                  key={r.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.label}，${r.meaning}`}
                  onPress={() => navigation.navigate(r.route)}
                  style={[styles.domainRow, i > 0 && styles.domainDivider]}
                >
                  <View style={styles.domainIcon}>
                    <Ionicons name={r.icon} size={18} color={COLORS.brandPrimaryDeep} />
                  </View>
                  <View style={styles.domainText}>
                    <Text style={styles.domainLabel}>{r.label}</Text>
                    <Text style={styles.domainMeaning}>{r.meaning}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                </Pressable>
              ))}
            </OpenSection>

            <OpenSection title="陪伴与在家">
              <Pressable accessibilityRole="button" style={styles.entryRow} onPress={() => navigation.navigate("Companion")}>
                <Ionicons name="heart-outline" size={18} color={COLORS.brandSecondary} />
                <Text style={styles.entryText}>陪伴模式 · 连接设备后可在不打扰的前提下观察互动</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </Pressable>
              <Pressable accessibilityRole="button" style={[styles.entryRow, styles.entryDivider]} onPress={() => navigation.navigate("Monitoring")}>
                <Ionicons name="videocam-outline" size={18} color={COLORS.brandSecondary} />
                <Text style={styles.entryText}>在家 · 设备与当前环境</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </Pressable>
            </OpenSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary },
  summaryValue: { fontSize: TYPE.meta, color: COLORS.textPrimary, flex: 1, textAlign: "right" },
  lifeViewEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s3,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: RADIUS.xl,
    padding: SPACE.s4,
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s5,
  },
  lifeViewGlyph: { width: 40, height: 40, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceDarkRaised, alignItems: "center", justifyContent: "center" },
  lifeViewText: { flex: 1 },
  lifeViewTitle: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textOnDark },
  lifeViewSub: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 2 },
  domainRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingVertical: 12 },
  domainDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  domainIcon: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoftGreen, alignItems: "center", justifyContent: "center" },
  domainText: { flex: 1 },
  domainLabel: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  domainMeaning: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 1 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 10 },
  entryDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  entryText: { fontSize: TYPE.sm, color: COLORS.textSecondary, flex: 1 },
});
