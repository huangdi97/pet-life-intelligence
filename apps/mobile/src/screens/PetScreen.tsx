/**
 * PetScreen — Pet World (R2-P §7.2 / v3.4 §46.7).
 *
 * Identity stage first (2.5D pet + name + age/breed/sex), then Life Pulse
 * (现在 / 最近变化 / 记忆), then per-domain meaning — what each domain means
 * for THIS pet right now (narrative first, navigation second). Never a profile
 * card list, never a feature grid.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, type BehaviorEventRow, type HealthEventRow, type LifeEvent, type TrainingGoalRow, type WelfareEvidence } from "../api";
import { usePets } from "../context";
import { petAgeText, sexLabel } from "../format";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { usePetTwin } from "../hooks/usePetTwin";
import { PetLivingStage } from "../components/life/PetLivingStage";
import { ChangeNarrative } from "../components/life/ChangeNarrative";
import { OpenSection } from "../components/feedback/OpenSection";
import { Skeleton } from "../components/feedback/Feedback";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { eventTypeLabel } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

type DomainRoute = "LifeView" | "Health" | "Behavior" | "Training" | "Welfare" | "Social";

interface DomainRow {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  meaning: string;
  route: DomainRoute;
}

const DOMAIN_LABELS: Record<string, string> = {
  health: "健康",
  behavior: "行为",
  training: "训练",
  welfare: "福祉",
  social: "社交",
  life: "生活",
};

export function PetScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [today, setToday] = useState<{ events: LifeEvent[]; event_counts: Record<string, number> } | null>(null);
  const [hint, setHint] = useState<{ hints: string[]; rule: string } | null>(null);
  const [health, setHealth] = useState<HealthEventRow[] | null>(null);
  const [lastBehavior, setLastBehavior] = useState<BehaviorEventRow | null>(null);
  const [goal, setGoal] = useState<TrainingGoalRow | null>(null);
  const [welfare, setWelfare] = useState<WelfareEvidence | null>(null);
  const [loading, setLoading] = useState(true);
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  // Individual Twin (R2P3D-R3 D): same canonical per-pet asset as Today/Life
  // View, so Pet World shows the ACTIVE twin (generic demo only without one).
  const { twin } = usePetTwin(pet?.id ?? null);
  const otherPets = (pets ?? []).filter((p) => p.id !== pet?.id);

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<{ events: LifeEvent[]; event_counts: Record<string, number> }>(`/pets/${pet.id}/today`),
      api.get<{ hints: string[]; rule: string }>(`/pets/${pet.id}/abnormal-day-hint`),
      api.get<HealthEventRow[]>(`/pets/${pet.id}/health-events`),
      api.get<BehaviorEventRow[]>(`/pets/${pet.id}/behavior-events`),
      api.get<TrainingGoalRow[]>(`/pets/${pet.id}/training-goals`),
      api.get<WelfareEvidence>(`/pets/${pet.id}/welfare-evidence`),
    ]).then(([t, h, he, be, tg, wv]) => {
      if (!alive) return;
      if (t.status === "fulfilled") setToday(t.value);
      if (h.status === "fulfilled") setHint(h.value);
      if (he.status === "fulfilled") setHealth(he.value);
      if (be.status === "fulfilled") setLastBehavior(be.value[0] ?? null);
      if (tg.status === "fulfilled") setGoal(tg.value[0] ?? null);
      if (wv.status === "fulfilled") setWelfare(wv.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  const todayEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const lastActivity = todayEvents[0] ?? null;
  const abnormal = hint?.hints.find((x) => !x.includes("无明显异常"));
  const stable = hint !== null && !abnormal;

  const healthCount = health?.length ?? null;
  const rows = useMemo<DomainRow[]>(() => {
    const healthMeaning =
      healthCount === null || healthCount === 0
        ? "最近还没有健康记录"
        : `最近有 ${healthCount} 条健康记录`;
    const behaviorMeaning = lastBehavior
      ? `最近一次：${lastBehavior.behavior.slice(0, 22)}${lastBehavior.behavior.length > 22 ? "…" : ""}`
      : "还没有行为观察";
    const trainingMeaning = goal ? `正在学习：${goal.title}` : "还没有训练目标";
    const welfareMeaning =
      welfare && Object.keys(welfare.observation_counts ?? {}).length
        ? `近期观察 ${Object.values(welfare.observation_counts).reduce((a, b) => a + b, 0)} 条`
        : "最近没有新增观察";
    return [
      { key: "life", icon: "planet-outline", meaning: "此刻、趋势与外观都在这里", route: "LifeView" },
      { key: "health", icon: "medkit-outline", meaning: healthMeaning, route: "Health" },
      { key: "behavior", icon: "paw-outline", meaning: behaviorMeaning, route: "Behavior" },
      { key: "training", icon: "ribbon-outline", meaning: trainingMeaning, route: "Training" },
      { key: "welfare", icon: "home-outline", meaning: welfareMeaning, route: "Welfare" },
      { key: "social", icon: "people-outline", meaning: "关系与互动记录都在这里", route: "Social" },
    ];
  }, [healthCount, lastBehavior, goal, welfare]);

  /** Memory preview — the most recent meaningful event (real event data). */
  const memoryText = lastActivity
    ? `${eventTypeLabel(lastActivity.event_type)} · ${new Date(lastActivity.occurred_at).toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
      })} ${new Date(lastActivity.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : `${pet?.name ?? "宠物"}的生活轨迹会在这里留下重要的回忆`;

  const identityLine = pet
    ? [`${petAgeText(pet.birth_date) ?? ""}`, pet.breed, sexLabel(pet.sex)].filter(Boolean).join(" · ")
    : "";

  const navigateDomain = (route: DomainRoute) => {
    // React Navigation's generated overloads cannot safely accept
    // `keyof StackParamList` because some routes require params. Keep this
    // owner-domain list explicitly narrowed to its six parameterless screens.
    switch (route) {
      case "LifeView":
        navigation.navigate("LifeView");
        break;
      case "Health":
        navigation.navigate("Health");
        break;
      case "Behavior":
        navigation.navigate("Behavior");
        break;
      case "Training":
        navigation.navigate("Training");
        break;
      case "Welfare":
        navigation.navigate("Welfare");
        break;
      case "Social":
        navigation.navigate("Social");
        break;
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View testID="pli.pet.identity">
          <PetLivingStage
            pet={pet}
            spec={resolvePetStage(pet)}
            variant="pet"
            headline={lastActivity ? `最近记录了${eventTypeLabel(lastActivity.event_type)}` : "今天还没有记录"}
            caption={identityLine || undefined}
            demo={DEMO_ENV}
            onPressPet={pet ? () => navigation.navigate("LifeView") : undefined}
            twin={twin?.descriptor ?? null}
            sourceMediaCount={twin?.observedRegions.length ?? 0}
            frameTarget={0.25}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={2} />
          </View>
        ) : (
          <>
            <OpenSection title={`${pet?.name ?? "宠物"}最近`} testID="pli.pet.recent">
              <View style={styles.pulseRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.brandPrimaryDeep} />
                <Text style={styles.pulseText}>
                  {lastActivity ? `最近一次记录：${eventTypeLabel(lastActivity.event_type)}` : "还没有活动记录"}
                </Text>
              </View>
              {abnormal ? (
                <ChangeNarrative summary={abnormal} evidenceHint={hint?.rule} />
              ) : stable ? (
                <View style={styles.pulseRow}>
                  <Ionicons name="leaf-outline" size={16} color={COLORS.success} />
                  <Text style={styles.pulseText}>与它自己相比，最近没有明显变化。</Text>
                </View>
              ) : null}
              <View style={[styles.pulseRow, styles.pulseDivider]}>
                <Ionicons name="bookmark-outline" size={16} color={COLORS.brandSecondary} />
                <Text style={styles.pulseText}>{memoryText}</Text>
              </View>
            </OpenSection>

            <OpenSection title="它的生活" caption="点进去看这一部分">
              {rows.map((r, i) => (
                <Pressable
                  key={r.key}
                  testID={`pli.pet.domain.${r.key}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${DOMAIN_LABELS[r.key] ?? r.key}：${r.meaning}，点击查看`}
                  onPress={() => navigateDomain(r.route)}
                  style={[styles.domainRow, i > 0 && styles.domainDivider]}
                >
                  <View style={styles.domainText}>
                    <Text style={styles.domainLabel}>{DOMAIN_LABELS[r.key] ?? r.key}</Text>
                    <Text style={styles.domainMeaning}>{r.meaning}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                </Pressable>
              ))}
            </OpenSection>

            <View testID="pli.pet.friends">
              <OpenSection title="它的朋友">
                {otherPets.length > 0 ? (
                  otherPets.slice(0, 2).map((o) => (
                    <View key={o.id} style={styles.friendRow}>
                      <Text style={styles.friendText}>和{o.name}是朋友</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>还没有宠物朋友，社交记录会出现在这里。</Text>
                )}
              </OpenSection>
            </View>

            <View testID="pli.pet.caregivers">
              <OpenSection title="照护它的人">
                <View style={styles.friendRow}>
                  <Text style={styles.friendText}>你 · 主人</Text>
                </View>
                <Text style={styles.caregiverNote}>家庭成员与临时照护人加入后会显示在这里。</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Care")} style={styles.entryRow}>
                  <Ionicons name="people-outline" size={18} color={COLORS.brandPrimaryDeep} />
                  <Text style={styles.entryText}>管理照护交接与限时权限</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                </Pressable>
              </OpenSection>
            </View>

            <OpenSection title="生命与陪伴">
              <Pressable
                testID="pli.pet.entry.lifeview"
                accessibilityRole="button"
                accessibilityLabel={`打开${pet?.name ?? "宠物"}的生命视图`}
                onPress={() => navigation.navigate("LifeView")}
                style={({ pressed }) => [styles.entryRow, pressed && styles.entryRowPressed]}
              >
                <Ionicons name="planet-outline" size={18} color={COLORS.brandPrimaryDeep} />
                <Text style={styles.entryText}>生命视图 · {pet?.name ?? "宠物"}的此刻、趋势与外观</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`查看${pet?.name ?? "宠物"}的 3D 形象版本`}
                onPress={() => navigation.navigate("TwinVersion")}
                style={({ pressed }) => [styles.entryRow, pressed && styles.entryRowPressed]}
              >
                <Ionicons name="sparkles-outline" size={18} color={COLORS.brandPrimaryDeep} />
                <Text style={styles.entryText}>3D 形象 · 为{pet?.name ?? "宠物"}创建/查看 3D 形象</Text>
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
  pulseRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 8 },
  pulseDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle, marginTop: 4 },
  pulseText: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  domainRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s3, paddingVertical: 12 },
  domainDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  domainText: { flex: 1 },
  domainLabel: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  domainMeaning: { fontSize: TYPE.body, color: COLORS.textSecondary, lineHeight: 21, marginTop: 2 },
  friendRow: { paddingVertical: 8 },
  friendText: { fontSize: TYPE.body, color: COLORS.textPrimary },
  caregiverNote: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 2 },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, paddingVertical: 8, lineHeight: 22 },
  entryRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 10 },
  entryRowPressed: { opacity: 0.72 },
  entryText: { fontSize: TYPE.sm, color: COLORS.textSecondary, flex: 1 },
});
