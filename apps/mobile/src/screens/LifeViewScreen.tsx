/**
 * LifeViewScreen — Pet Living Stage (R2-P3D §22–24 / v3.4 §46.8).
 *
 * Full 3D Living Stage: the shared demo pet asset is interactive here
 * (drag rotate, pinch zoom, reset). State anchors are clickable and open a
 * detail sheet with facts / self-comparison / source / updated-at / evidence —
 * all real API data, never invented scores. Modes: 此刻 / 趋势 / 时间线 / 外观.
 * Timeline remains the canonical event destination and is linked from this
 * inspection space rather than duplicated here. Provider/model/raw keys never
 * appear on the owner surface.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import { PetLivingStage } from "../components/life/PetLivingStage";
import type { Pet3DViewerHandle } from "../components/three/Pet3DViewer";
import { LivingModeSwitcher, type LivingMode } from "../components/life/LivingModeSwitcher";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { eventTypeLabel, sourceLabel } from "./ui_labels";
import { observedActivityMinutes } from "./today_helpers";
import { usePetTwin } from "../hooks/usePetTwin";
import { poseForEvent } from "@pli/pet-3d";
import type { StackParamList } from "../navigation";

interface AnchorDetail {
  id: string;
  label: string;
  value: string;
  source: string;
  updatedAt: string;
  evidence: string;
  compare: string;
}
export function LifeViewScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const { twin } = usePetTwin(petId);
  const [loadedPetId, setLoadedPetId] = useState<string | null>(null);
  const [rawToday, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [mode, setMode] = useState<LivingMode>("now");
  const viewerRef = useRef<Pet3DViewerHandle>(null);
  const [rawError, setError] = useState(false);
  const [rawDetail, setDetail] = useState<AnchorDetail | null>(null);
  const [detailPetId, setDetailPetId] = useState<string | null>(null);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  // Each fact and any open detail sheet belongs to one pet. Hide stale state
  // synchronously while React switches selected identity, before fetch effects.
  const scoped = !!pet?.id && loadedPetId === pet.id;
  const today = scoped ? rawToday : null;
  const error = scoped ? rawError : false;
  const detail = detailPetId === pet?.id ? rawDetail : null;

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setToday(null);
    setError(false);
    setDetail(null);
    api
      .get<{ events: LifeEvent[] }>(`/pets/${pet.id}/today`)
      .then((r) => {
        if (alive) {
          setToday(r);
          setError(false);
          setLoadedPetId(pet.id);
        }
      })
      .catch(() => {
        if (alive) {
          setError(true);
          setLoadedPetId(pet.id);
        }
      });
    return () => {
      alive = false;
    };
  }, [pet?.id]);
  const petEvents = useMemo(() => (today?.events ?? []).filter((e) => e.event_type !== "today.viewed"), [today]);
  const lastEvent = petEvents[0] ?? null;
  // Owner UI does not expose an animation-demo toolbar. Motion follows the
  // most recent non-health life event as a representative pose; otherwise the
  // twin rests in Idle. This keeps Life View about the pet, not model controls.
  const representativePose = poseForEvent(lastEvent?.event_type ?? null) ?? "Idle";

  const anchors = useMemo(() => {
    const rows = petEvents.map((e) => e.event_type);
    const c = (t: string) => rows.filter((x) => x === t).length;
    const activityMinutes = observedActivityMinutes(petEvents);
    const matching = (t: string) => petEvents.filter((e) => e.event_type === t);
    const mk = (id: string, label: string, value: string, icon: keyof typeof Ionicons.glyphMap, type: string) => ({
      id,
      label,
      value,
      icon,
      testID: `pli.lifeview.anchor.${id}`,
      onPress: () => {
        // The activity metric aggregates observed walk AND play. Its evidence
        // sheet must expose both sources, never only walking records.
        const evs = id === "activity" ? petEvents.filter((e) => e.event_type === "daily.walk" || e.event_type === "daily.play") : matching(type);
        const src = evs.length ? Array.from(new Set(evs.map((e) => sourceLabel(e.source_type)))).join(" + ") : "—";
        const at = evs[0]
          ? new Date(evs[0].occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : "—";
        const evi = evs[0] ? `${eventTypeLabel(evs[0].event_type)} · ${at}` : "暂无记录";
        setDetailPetId(pet?.id ?? null);
        setDetail({ id, label, value, source: src, updatedAt: at, evidence: evi, compare: "暂无（数据积累后显示）" });
      },
    });
    const list = [
      mk("drink", "饮水", c("daily.drink") ? `${c("daily.drink")} 次` : "—", "water-outline", "daily.drink"),
      mk("meal", "进食", c("daily.meal") ? `${c("daily.meal")} 次` : "—", "restaurant-outline", "daily.meal"),
      mk(
        "activity",
        "活动",
        activityMinutes > 0 ? `${activityMinutes} 分钟` : "—",
        "walk-outline",
        "daily.walk",
      ),
      mk("sleep", "睡眠", c("daily.sleep") ? `${c("daily.sleep")} 次` : "—", "moon-outline", "daily.sleep"),
    ];
    return list;
  }, [petEvents, pet?.id]);

  const nowLine = error
    ? "暂时连接不上，稍后自动恢复。"
    : !pet
      ? ""
      : petEvents.length === 0
        ? `${pet?.name ?? "宠物"}今天安安静静的。`
        : lastEvent
          ? `最近一次记录：${eventTypeLabel(lastEvent.event_type)} · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
          : "";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityRow} testID="pli.lifeview.identity">
          <Text style={styles.identityText}>{pet?.name ?? "宠物"} · 此刻</Text>
        </View>
        <View style={styles.stageWrap}>
          <PetLivingStage
            pet={pet}
            spec={resolvePetStage(pet)}
            variant="life"
            anchors={anchors}
            headline={mode === "now" ? `${pet?.name ?? "宠物"} · 此刻` : undefined}
            caption={mode === "now" ? nowLine : undefined}
            demo={DEMO_ENV || twin?.demoFixture === true}
            interactive
            twin={twin?.descriptor ?? null}
            sourceMediaCount={twin?.observedRegions.length ?? 0}
            frameTarget={0.54}
            viewerRef={viewerRef}
            pose={twin ? representativePose : null}
          />
        </View>

        <View testID="pli.lifeview.control.zoom" style={styles.controlRow} accessibilityLabel="3D 视图控制">
          <Pressable accessibilityRole="button" onPress={() => viewerRef.current?.zoomOut()} style={styles.controlBtn}>
            <Ionicons name="remove" size={16} color={COLORS.textSecondary} />
            <Text style={styles.controlBtnText}>缩小</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => viewerRef.current?.zoomIn()} style={styles.controlBtn}>
            <Ionicons name="add" size={16} color={COLORS.textSecondary} />
            <Text style={styles.controlBtnText}>放大</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => viewerRef.current?.resetView()} style={styles.controlBtn}>
            <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
            <Text style={styles.controlBtnText}>重置视图</Text>
          </Pressable>
        </View>


        <View testID="pli.lifeview.control.modes">
          <LivingModeSwitcher value={mode} onChange={setMode} onTimeline={() => navigation.navigate("Tabs", { screen: "Timeline" })} />
        </View>

        <View testID="pli.lifeview.panel" style={styles.panel} accessibilityLiveRegion="polite">
          {mode === "now" ? (
            <Text style={styles.panelText}>
              {petEvents.length > 0
                ? "上面的数值来自今天真实的记录。点一下数值，可以看到事实、来源与更新时间。拖动宠物可以旋转，双指缩放。"
                : `今天还没有足够记录，记下第一件事后，这里会围绕${pet?.name ?? "宠物"}展开。`}
            </Text>
          ) : null}

          {mode === "trend" ? (
            petEvents.length > 0 ? (
              <View style={styles.trendRow}>
                {anchors.map((a) => (
                  <View key={a.id} style={styles.trendCell}>
                    <Ionicons name={a.icon} size={16} color={COLORS.brandPrimaryDeep} />
                    <Text style={styles.trendLabel}>{a.label}</Text>
                    <Text style={styles.trendValue}>{a.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.panelText}>数据积累后，这里会展示它自己的趋势。</Text>
            )
          ) : null}

          {mode === "look" ? (
            <View style={styles.lookRow}>
              <Ionicons name="cube-outline" size={18} color={COLORS.textTertiary} />
              <Text style={styles.panelText}>
                {twin
                  ? twin.demoFixture
                    ? "当前是示例 3D 形象，用于体验交互；它不代表真实宠物扫描或已验证个体外观。"
                    : `这是${pet?.name ?? "宠物"}的 3D 形象，已通过你的确认。外观不会替代真实照片与记录。`
                  : "暂时使用简化形象。连接照片后，会生成更像它的 3D 形象，并经你确认后才会显示。"}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.scrim} onPress={() => setDetail(null)}>
          <Pressable style={styles.sheet} accessibilityRole="none" onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{detail?.label ?? ""}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={() => setDetail(null)} style={styles.sheetClose}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.sheetValue}>{detail?.value}</Text>
            <View style={styles.row}>
              <Text style={styles.rowKey}>事实</Text>
              <Text style={styles.rowVal}>{detail?.value}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>与自己相比</Text>
              <Text style={styles.rowVal}>{detail?.compare}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>来源</Text>
              <Text style={styles.rowVal}>{detail?.source}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>更新时间</Text>
              <Text style={styles.rowVal}>{detail?.updatedAt}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>证据</Text>
              <Text style={styles.rowVal}>{detail?.evidence}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  stageWrap: { alignSelf: "center", width: "100%", maxWidth: 430 },
  panel: { marginHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  panelText: { fontSize: TYPE.body, color: COLORS.textSecondary, lineHeight: 22 },
  trendRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s3 },
  trendCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: 14,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
  },
  trendLabel: { fontSize: TYPE.meta, color: COLORS.textTertiary },
  trendValue: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  lookRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2 },
  controlBtnText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  identityRow: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  identityText: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  controlRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: SPACE.s3 },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceOverlay,
    minHeight: 44,
  },
  scrim: { flex: 1, backgroundColor: "rgba(16,13,11,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACE.s5,
    paddingBottom: SPACE.s8,
  },
  sheetHead: { flexDirection: "row", alignItems: "center", marginBottom: SPACE.s2 },
  sheetTitle: { flex: 1, fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetValue: { fontSize: TYPE.metric, fontWeight: "700", color: COLORS.brandPrimaryDeep, marginBottom: SPACE.s3 },
  row: { flexDirection: "row", paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.dividerSubtle },
  rowKey: { width: 92, fontSize: TYPE.body, color: COLORS.textTertiary },
  rowVal: { flex: 1, fontSize: TYPE.body, color: COLORS.textPrimary, lineHeight: 20 },
});