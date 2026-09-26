/**
 * LifeViewScreen — "豆豆的可视生命状态入口" (Stage R.2 §31-36).
 * Photo-first: the pet visual is the focal point; 此刻 shows only real,
 * 真实服务" status — never as a diagnostics page. Provider/model/raw keys
 * 真实服务" status — never as a diagnostics page. Provider/model/raw keys
 * stay out of the owner surface (Developer settings hosts diagnostics).
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { PetMedia } from "../components/media/PetMedia";
import { OpenSection } from "../components/feedback/OpenSection";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../components/timeline/LifeStream";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";
import { eventTypeLabel, sourceLabel } from "./ui_labels";

type StackNav = NativeStackNavigationProp<StackParamList>;

export function LifeViewScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [today, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [error, setError] = useState(false);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    api
      .get<{ events: LifeEvent[] }>(`/pets/${pet.id}/today`)
      .then((r) => {
        if (alive) setToday(r);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  const petEvents = (today?.events ?? []).filter((e) => e.event_type !== "today.viewed");
  const lastEvent = petEvents[0] ?? null;

  const streamRows: LifeStreamRow[] = petEvents.slice(0, 4).map((e) => ({
    id: e.event_id,
    time: new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    typeLabel: eventTypeLabel(e.event_type),
    sourceLabel: sourceLabel(e.source_type),
    icon: "ellipse-outline" as const,
    mediaUri: null,
  }));
  const streamDays: LifeStreamDay[] = streamRows.length
    ? [{ id: "now", label: "此刻", isToday: true, rows: streamRows }]
    : [];

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>生命视图</Text>
        <Text style={styles.pageSub}>{pet ? `${pet.name} · 此刻` : "宠物 · 此刻"}</Text>

        <View style={styles.stage}>
          <PetMedia pet={pet} uri={resolvePetMediaUri(pet)} variant="full-bleed" accessibilityLabel={`${pet?.name ?? "宠物"}当前的形象`} />
          <View style={styles.stageOverlay}>
            <Text style={styles.stageName}>{pet?.name ?? "宠物"}</Text>
            <Text style={styles.stageNow}>
              {error ? "暂时连接不上" : lastEvent ? `最近一次记录：${eventTypeLabel(lastEvent.event_type)}` : "今天还没有记录"}
            </Text>
          </View>
          {DEMO_ENV ? (
            <View style={styles.demoChip}>
              <Text style={styles.demoChipText}>示例数据</Text>
            </View>
          ) : null}
        </View>

        <OpenSection title="生命轨迹">
          {streamDays.length ? (
            <LifeStream days={streamDays} />
          ) : (
            <Text style={styles.emptyText}>
              {error ? "暂时连接不上，稍后自动恢复。" : "从第一次喂食、散步或健康记录开始，轨迹会慢慢成形。"}
            </Text>
          )}
        </OpenSection>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3D 形象</Text>
          <View style={styles.card3d}>
            <View style={styles.card3dIcon}>
              <Ionicons name="cube-outline" size={20} color={COLORS.textTertiary} />
            </View>
            <View style={styles.card3dText}>
              <Text style={styles.card3dTitle}>尚未创建</Text>
              <Text style={styles.card3dSub}>等待连接真实 3D 服务后生成。当前以照片与记录呈现。</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <PressableGhost label="回到今日" onPress={() => navigation.navigate("Tabs")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}




function PressableGhost({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  pageTitle: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  pageSub: { fontSize: TYPE.sm, color: COLORS.textTertiary, paddingHorizontal: SPACE.s4, marginTop: 2 },
  stage: {
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s4,
    borderRadius: RADIUS.hero,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceDark,
  },
  stageOverlay: { position: "absolute", left: SPACE.s4, bottom: SPACE.s4, right: SPACE.s4 },
  stageName: { fontSize: TYPE.heroName, fontWeight: "700", color: COLORS.textInverse },
  stageNow: { fontSize: TYPE.sm, color: COLORS.textOnDark, opacity: 0.92, marginTop: 2 },
  demoChip: { position: "absolute", top: 14, right: 14, backgroundColor: COLORS.surfaceOverlay, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  demoChipText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary, lineHeight: 22 },
  section: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  sectionTitle: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary, marginBottom: SPACE.s2 },
  card3d: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s3,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.dividerSubtle,
    padding: SPACE.s4,
  },
  card3dIcon: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  card3dText: { flex: 1 },
  card3dTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  card3dSub: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 2 },
  actionRow: { flexDirection: "row", justifyContent: "center", padding: SPACE.s5 },
  ghost: { paddingHorizontal: SPACE.s5, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.dividerStrong },
  ghostText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
});
