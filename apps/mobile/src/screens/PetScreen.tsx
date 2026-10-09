/**
 * PetScreen — Pet World (R2-P §7.2 / v3.4 §46.7).
 *
 * Identity stage first (2.5D pet + name + age/breed/sex), then Life Pulse
 * (现在 / 最近变化 / 记忆), then per-domain meaning — what each domain means
 * for THIS pet right now (narrative first, navigation second). Never a profile
 * card list, never a feature grid.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, type BehaviorEventRow, type HealthEventRow, type LifeEvent, type PetFriend, type TrainingGoalRow, type WelfareEvidence } from "../api";
import { usePets } from "../context";
import { breedLabel, petAgeText, sexLabel } from "../format";
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

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  algorithm: string;
  computed_at: string;
}

const BASELINE_LABELS: Record<string, { label: string; suffix: string }> = {
  meal_count_per_day: { label: "每日进食次数", suffix: " 次/天" },
  walk_minutes_per_day: { label: "每日散步", suffix: " 分钟/天" },
  sleep_minutes_per_day: { label: "每日睡眠", suffix: " 分钟/天" },
};

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
  const [loadedPetId, setLoadedPetId] = useState<string | null>(null);
  const [rawToday, setToday] = useState<{ events: LifeEvent[]; event_counts: Record<string, number> } | null>(null);
  const [rawHint, setHint] = useState<{ hints: string[]; rule: string } | null>(null);
  const [rawHealth, setHealth] = useState<HealthEventRow[] | null>(null);
  const [rawLastBehavior, setLastBehavior] = useState<BehaviorEventRow | null>(null);
  const [rawGoal, setGoal] = useState<TrainingGoalRow | null>(null);
  const [rawWelfare, setWelfare] = useState<WelfareEvidence | null>(null);
  const [rawFriends, setFriends] = useState<PetFriend[]>([]);
  const [rawFriendsState, setFriendsState] = useState<"loading" | "ready" | "error">("loading");
  const [rawBaseline, setBaseline] = useState<BaselineRow[]>([]);
  const [rawBaselineState, setBaselineState] = useState<"loading" | "ready" | "error">("loading");
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [rawLoading, setLoading] = useState(true);
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const activePetRef = useRef<string | null>(null);
  activePetRef.current = pet?.id ?? null;
  // Hide previously selected pets' API facts before the effect runs, including
  // baseline, social contacts and medical observations.
  const scoped = !!pet?.id && loadedPetId === pet.id;
  const today = scoped ? rawToday : null;
  const hint = scoped ? rawHint : null;
  const health = scoped ? rawHealth : null;
  const lastBehavior = scoped ? rawLastBehavior : null;
  const goal = scoped ? rawGoal : null;
  const welfare = scoped ? rawWelfare : null;
  const friends = scoped ? rawFriends : [];
  const friendsState = scoped ? rawFriendsState : "loading";
  const baseline = scoped ? rawBaseline : [];
  const baselineState = scoped ? rawBaselineState : "loading";
  const loading = rawLoading || !scoped;

  // Individual Twin (R2P3D-R3 D): same canonical per-pet asset as Today/Life
  // View, so Pet World shows the ACTIVE twin (generic demo only without one).
  const { twin } = usePetTwin(pet?.id ?? null);

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setLoading(true);
    setToday(null);
    setHint(null);
    setHealth(null);
    setLastBehavior(null);
    setGoal(null);
    setWelfare(null);
    setFriends([]);
    setBaseline([]);
    setFriendsState("loading");
    setBaselineState("loading");
    Promise.allSettled([
      api.get<{ events: LifeEvent[]; event_counts: Record<string, number> }>(`/pets/${pet.id}/today`),
      api.get<{ hints: string[]; rule: string }>(`/pets/${pet.id}/abnormal-day-hint`),
      api.get<HealthEventRow[]>(`/pets/${pet.id}/health-events`),
      api.get<BehaviorEventRow[]>(`/pets/${pet.id}/behavior-events`),
      api.get<TrainingGoalRow[]>(`/pets/${pet.id}/training-goals`),
      api.get<WelfareEvidence>(`/pets/${pet.id}/welfare-evidence`),
      api.get<PetFriend[]>(`/pets/${pet.id}/friends`),
      api.get<BaselineRow[]>(`/pets/${pet.id}/baseline`),
    ]).then(([t, h, he, be, tg, wv, fr, bl]) => {
      if (!alive) return;
      if (t.status === "fulfilled") setToday(t.value);
      if (h.status === "fulfilled") setHint(h.value);
      if (he.status === "fulfilled") setHealth(he.value);
      if (be.status === "fulfilled") setLastBehavior(be.value[0] ?? null);
      if (tg.status === "fulfilled") setGoal(tg.value[0] ?? null);
      if (wv.status === "fulfilled") setWelfare(wv.value);
      if (fr.status === "fulfilled") {
        setFriends(fr.value);
        setFriendsState("ready");
      } else {
        setFriendsState("error");
      }
      if (bl.status === "fulfilled") {
        setBaseline(bl.value);
        setBaselineState("ready");
      } else {
        setBaseline([]);
        setBaselineState("error");
      }
      setLoadedPetId(pet.id);
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
  const visibleRelationships = friends.filter((f) => f.status === "ACTIVE" || f.status === "ACCEPTED" || f.status === "PENDING");
  const petNameById = (id: string) => (pets ?? []).find((candidate) => candidate.id === id)?.name ?? "宠物朋友";
  const relationshipText = (friend: PetFriend) => {
    const name = petNameById(friend.friend_pet_id);
    if (friend.status === "PENDING") return `与${name}的关系待确认`;
    return `和${name}已连接`;
  };
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
    ? [`${petAgeText(pet.birth_date) ?? ""}`, breedLabel(pet.breed), sexLabel(pet.sex)].filter(Boolean).join(" · ")
    : "";

  async function recomputeBaseline() {
    if (!pet?.id || baselineBusy) return;
    const targetPetId = pet.id;
    setBaselineBusy(true);
    try {
      await api.post(`/pets/${targetPetId}/baseline/recompute?window_days=14`, {});
      const rows = await api.get<BaselineRow[]>(`/pets/${targetPetId}/baseline`);
      if (activePetRef.current !== targetPetId) return;
      setBaseline(rows);
      setBaselineState("ready");
    } catch {
      if (activePetRef.current === targetPetId) setBaselineState("error");
    } finally {
      setBaselineBusy(false);
    }
  }

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
            demo={DEMO_ENV || twin?.demoFixture === true}
            onPressPet={pet ? () => navigation.navigate("LifeView") : undefined}
            twin={twin?.descriptor ?? null}
            sourceMediaCount={twin?.observedRegions.length ?? 0}
            frameTarget={0.56}
          />
        </View>

        <Pressable
          testID="pli.pet.entry.lifeview"
          accessibilityRole="button"
          accessibilityLabel={`进入${pet?.name ?? "宠物"}的生命视图`}
          onPress={() => navigation.navigate("LifeView")}
          style={styles.lifeViewCta}
        >
          <View>
            <Text style={styles.lifeViewCtaKicker}>生命视图</Text>
            <Text style={styles.lifeViewCtaText}>进入它的此刻、趋势与外观</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={COLORS.textInverse} />
        </Pressable>

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
                  <View style={styles.domainIcon}>
                    <Ionicons name={r.icon} size={18} color={COLORS.brandPrimaryDeep} />
                  </View>
                  <View style={styles.domainText}>
                    <Text style={styles.domainLabel}>{DOMAIN_LABELS[r.key] ?? r.key}</Text>
                    <Text style={styles.domainMeaning}>{r.meaning}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                </Pressable>
              ))}
            </OpenSection>

            <OpenSection title="它的常态" caption="最近 14 天">
              <Text style={styles.baselineIntro}>用真实生活记录形成可解释基线，只和它自己比较；没有足够记录时不会猜测。</Text>
              {baselineState === "ready" && baseline.length ? baseline.map((row) => {
                const meta = BASELINE_LABELS[row.metric] ?? { label: "生活基线", suffix: "" };
                return (
                  <View key={row.metric} style={styles.baselineRow}>
                    <Text style={styles.baselineLabel}>{meta.label}</Text>
                    <Text style={styles.baselineValue}>{row.value}{meta.suffix} · {row.sample_count} 天样本</Text>
                  </View>
                );
              }) : baselineState === "ready" ? (
                <Text style={styles.emptyText}>还没有足够的生活记录形成常态。继续真实记录后再计算。</Text>
              ) : baselineState === "error" ? (
                <Text style={styles.emptyText}>常态暂时没有加载成功；不会把未知显示成正常。</Text>
              ) : (
                <Text style={styles.emptyText}>正在读取常态…</Text>
              )}
              <Pressable
                testID="pli.pet.baseline.recompute"
                accessibilityRole="button"
                accessibilityLabel="重新计算宠物生活常态"
                accessibilityState={{ disabled: baselineBusy }}
                disabled={baselineBusy}
                onPress={() => void recomputeBaseline()}
                style={[styles.baselineAction, baselineBusy && styles.entryRowPressed]}
              >
                <Text style={styles.baselineActionText}>{baselineBusy ? "计算中…" : "重新计算常态"}</Text>
              </Pressable>
            </OpenSection>

            <View testID="pli.pet.friends">
              <OpenSection title="它的关系">
                {friendsState === "loading" ? (
                  <Text style={styles.emptyText}>正在读取已记录的宠物关系……</Text>
                ) : friendsState === "error" ? (
                  <Text style={styles.emptyText}>关系记录暂时没有加载成功；进入「社交」页可以重试。</Text>
                ) : visibleRelationships.length > 0 ? (
                  visibleRelationships.slice(0, 2).map((friend) => (
                    <View key={friend.request_id} style={styles.friendRow}>
                      <Text style={styles.friendText}>{relationshipText(friend)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>还没有已连接或待确认的宠物关系；真实互动会从「社交」页开始积累。</Text>
                )}
              </OpenSection>
            </View>

            <Pressable
              testID="pli.pet.management.toggle"
              accessibilityRole="button"
              accessibilityState={{ expanded: showManagement }}
              onPress={() => setShowManagement((value) => !value)}
              style={styles.managementToggle}
            >
              <View style={styles.managementToggleText}>
                <Text style={styles.managementTitle}>更多档案与管理</Text>
                <Text style={styles.managementHint}>照护、基础档案与 3D 版本等低频维护</Text>
              </View>
              <Ionicons name={showManagement ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} />
            </Pressable>

            {showManagement ? (
              <>
                <View testID="pli.pet.caregivers">
                  <OpenSection title="照护它的人">
                    <Text style={styles.caregiverNote}>查看谁可以照护、能做什么，以及临时权限何时到期；未读取到的成员关系不会在这里猜测。</Text>
                    <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Care")} style={styles.entryRow}>
                      <Ionicons name="people-outline" size={18} color={COLORS.brandPrimaryDeep} />
                      <Text style={styles.entryText}>管理照护交接与限时权限</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                    </Pressable>
                  </OpenSection>
                </View>

                <OpenSection title="档案">
                  <Pressable
                    testID="pli.pet.profile.edit"
                    accessibilityRole="button"
                    accessibilityLabel={`编辑${pet?.name ?? "宠物"}的档案`}
                    onPress={() => navigation.navigate("PetProfile", { mode: "edit" })}
                    style={({ pressed }) => [styles.entryRow, pressed && styles.entryRowPressed]}
                  >
                    <Ionicons name="create-outline" size={18} color={COLORS.brandPrimaryDeep} />
                    <Text style={styles.entryText}>编辑名字、品种、生日、性别与体重备注</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                  </Pressable>
                </OpenSection>

                <OpenSection title="3D 形象">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`查看${pet?.name ?? "宠物"}的 3D 形象版本`}
                    onPress={() => navigation.navigate("TwinVersion")}
                    style={({ pressed }) => [styles.entryRow, pressed && styles.entryRowPressed]}
                  >
                    <Ionicons name="sparkles-outline" size={18} color={COLORS.brandPrimaryDeep} />
                    <Text style={styles.entryText}>创建、查看或重新确认生成的 3D 形象</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                  </Pressable>
                </OpenSection>
              </>
            ) : null}
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
  lifeViewCta: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, minHeight: 76, borderRadius: 26, backgroundColor: COLORS.brandPrimary, paddingHorizontal: SPACE.s4, paddingVertical: SPACE.s3, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lifeViewCtaKicker: { fontSize: TYPE.caption, color: COLORS.textInverse, opacity: 0.78, fontWeight: "700", letterSpacing: 1.2 },
  lifeViewCtaText: { fontSize: TYPE.bodyStrong, color: COLORS.textInverse, fontWeight: "700", marginTop: 3 },
  managementToggle: { marginHorizontal: SPACE.s4, marginTop: SPACE.s5, minHeight: 64, paddingHorizontal: SPACE.s3, borderRadius: 22, backgroundColor: COLORS.surfaceRaised, flexDirection: "row", alignItems: "center", gap: SPACE.s3 },
  managementToggleText: { flex: 1 },
  managementTitle: { fontSize: TYPE.bodyStrong, color: COLORS.textPrimary, fontWeight: "700" },
  managementHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 3 },
  pulseRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingVertical: 8 },
  pulseDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle, marginTop: 4 },
  pulseText: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  baselineIntro: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginBottom: SPACE.s2 },
  baselineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SPACE.s3, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  baselineLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1 },
  baselineValue: { fontSize: TYPE.sm, color: COLORS.textSecondary, textAlign: "right", flex: 1 },
  baselineAction: { minHeight: 44, marginTop: SPACE.s2, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: 22, backgroundColor: COLORS.brandSoftGreen },
  baselineActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  domainRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s3, paddingVertical: 12 },
  domainDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  domainIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.brandSoftGreen },
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
