/** PetHubScreen — 宠物页 (mobile Pet hub, mirrors canonical §8.5 Pet):
 *  宠物身份作为视觉主体 + 当前状态摘要 + Health/Behavior/Training/Welfare/
 *  Social/3D 生命视图入口。真实宠物信息来自 /pets/{id}，状态来自 /today
 *  （仅后端真实事实，不做本地推断）。 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { fmtDate, fmtTime, sexLabel, speciesLabel } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { Card, CardTitle, GhostButton, MutedText, ScreenTitle } from "./ui";
import { eventTypeLabel } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

const ENTRIES: Array<{ route: keyof StackParamList; label: string; icon: string }> = [
  { route: "LifeView", label: "3D 生命视图", icon: "🌱" },
  { route: "Health", label: "健康", icon: "🩺" },
  { route: "Behavior", label: "行为", icon: "🐾" },
  { route: "Training", label: "训练", icon: "🎯" },
  { route: "Welfare", label: "福利", icon: "🏡" },
  { route: "Social", label: "社交", icon: "🤝" },
  { route: "Assistant", label: "助手", icon: "💬" },
];

export function PetHubScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [lastActivity, setLastActivity] = useState<LifeEvent | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0];

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    api
      .get<{ events: LifeEvent[]; event_counts: Record<string, number> }>(`/pets/${pet.id}/today`)
      .then((r) => {
        if (!alive) return;
        setLastActivity(r.events.find((e) => e.event_type !== "today.viewed") ?? null);
        setTodayCount(Object.values(r.event_counts).reduce((a, b) => a + b, 0));
      })
      .catch(() => {
        if (alive) {
          setLastActivity(null);
          setTodayCount(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  if (!pet) {
    return (
      <SafeAreaView style={styles.page} edges={["top"]}>
        <ScreenTitle title="宠物" sub="还没有宠物档案" />
        <MutedText>登录后即可看到宠物档案。</MutedText>
      </SafeAreaView>
    );
  }

  const ageText = pet.birth_date
    ? `出生 ${fmtDate(pet.birth_date)}`
    : "出生日期未记录";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title={pet.name} sub="宠物档案与生命视图" />

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{pet.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{pet.name}</Text>
            <Text style={styles.heroMeta}>
              {speciesLabel(pet.species)} · {pet.breed} · {sexLabel(pet.sex)}
            </Text>
            <Text style={styles.heroMeta}>{ageText}</Text>
          </View>
        </View>

        <Card>
          <CardTitle>当前状态</CardTitle>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>最后活动</Text>
            <Text style={styles.stateValue}>
              {lastActivity
                ? `${eventTypeLabel(lastActivity.event_type)} · ${fmtTime(lastActivity.occurred_at)}`
                : "今天还没有活动记录"}
            </Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={styles.stateLabel}>今天事件</Text>
            <Text style={styles.stateValue}>{todayCount === null ? "—" : `${todayCount} 条`}</Text>
          </View>
        </Card>

        <View style={styles.grid}>
          {ENTRIES.map((e) => (
            <View key={e.route} style={styles.gridItem}>
              <GhostButton label={`${e.icon} ${e.label}`} onPress={() => navigation.navigate(e.route)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  hero: { flexDirection: "row", alignItems: "center", marginBottom: SPACE.s3 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: TYPE.xxxl, fontWeight: TYPE.weightBold, color: COLORS.primary700 },
  heroText: { flex: 1, marginLeft: SPACE.s4 },
  heroName: { fontSize: TYPE.xxl, fontWeight: TYPE.weightBold, color: COLORS.inkPrimary },
  heroMeta: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: 2 },
  stateRow: { flexDirection: "row", marginTop: SPACE.s2 },
  stateLabel: { fontSize: TYPE.sm, color: COLORS.inkMuted, width: 72 },
  stateValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  gridItem: { width: "48%", flexGrow: 1 },
});
