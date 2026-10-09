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
import { api, type DeviceRow, type LifeEvent, type Task } from "../api";
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

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  computed_at: string;
}

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
  const { twin, loading: twinLoading, error: twinError } = usePetTwin(petId);
  const [loadedPetId, setLoadedPetId] = useState<string | null>(null);
  const [rawToday, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [mode, setMode] = useState<LivingMode>("now");
  const viewerRef = useRef<Pet3DViewerHandle>(null);
  const [rawError, setError] = useState(false);
  const [rawDetail, setDetail] = useState<AnchorDetail | null>(null);
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [rawBaseline, setBaseline] = useState<BaselineRow[]>([]);
  const [baselinePetId, setBaselinePetId] = useState<string | null>(null);
  const [baselineState, setBaselineState] = useState<"loading" | "ready" | "error">("loading");
  const [supportPetId, setSupportPetId] = useState<string | null>(null);
  const [supportTasks, setSupportTasks] = useState<Task[]>([]);
  const [supportDevices, setSupportDevices] = useState<DeviceRow[]>([]);
  const [taskSupportState, setTaskSupportState] = useState<"loading" | "ready" | "error">("loading");
  const [deviceSupportState, setDeviceSupportState] = useState<"loading" | "ready" | "error">("loading");

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  // Each fact and any open detail sheet belongs to one pet. Hide stale state
  // synchronously while React switches selected identity, before fetch effects.
  const scoped = !!pet?.id && loadedPetId === pet.id;
  const today = scoped ? rawToday : null;
  const error = scoped ? rawError : false;
  const detail = detailPetId === pet?.id ? rawDetail : null;
  const baseline = baselinePetId === pet?.id ? rawBaseline : [];
  const scopedBaselineState = baselinePetId === pet?.id ? baselineState : "loading";

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setToday(null);
    setError(false);
    setDetail(null);
    setBaseline([]);
    setBaselinePetId(null);
    setBaselineState("loading");
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
    api
      .get<BaselineRow[]>(`/pets/${pet.id}/baseline`)
      .then((rows) => {
        if (!alive) return;
        setBaseline(rows);
        setBaselinePetId(pet.id);
        setBaselineState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setBaseline([]);
        setBaselinePetId(pet.id);
        setBaselineState("error");
      });
    return () => {
      alive = false;
    };
  }, [pet?.id]);

  useEffect(() => {
    if (!pet?.id) return;
    const targetPetId = pet.id;
    let alive = true;
    setSupportPetId(null);
    setSupportTasks([]);
    setSupportDevices([]);
    setTaskSupportState("loading");
    setDeviceSupportState("loading");
    Promise.allSettled([
      api.get<Task[]>(`/pets/${targetPetId}/tasks`),
      api.get<DeviceRow[]>(`/pets/${targetPetId}/devices`),
    ]).then(([tasksResult, devicesResult]) => {
      if (!alive) return;
      setSupportTasks(tasksResult.status === "fulfilled" ? tasksResult.value : []);
      setSupportDevices(devicesResult.status === "fulfilled" ? devicesResult.value : []);
      setTaskSupportState(tasksResult.status === "fulfilled" ? "ready" : "error");
      setDeviceSupportState(devicesResult.status === "fulfilled" ? "ready" : "error");
      setSupportPetId(targetPetId);
    });
    return () => { alive = false; };
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
    const durationMinutes = (eventType: string) =>
      petEvents.reduce((total, event) => {
        if (event.event_type !== eventType) return total;
        const minutes = Number(event.payload?.duration_minutes);
        return Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60 ? total + minutes : total;
      }, 0);
    const sleepMinutes = durationMinutes("daily.sleep");
    const comparisonFor = (metric: string | null, current: number) => {
      if (!metric) return "暂无（当前没有同口径常态）";
      if (current <= 0) return "暂无（今天没有足够记录）";
      if (scopedBaselineState === "loading") return "常态读取中";
      if (scopedBaselineState !== "ready") return "常态暂时不可用";
      const row = baseline.find((item) => item.metric === metric);
      const usual = Number(row?.value);
      if (!row || row.sample_count < 3 || !Number.isFinite(usual) || usual <= 0) return "数据还不足以比较";
      const delta = Math.round(((current - usual) / usual) * 100);
      if (Math.abs(delta) < 5) return `接近最近 ${row.window_days} 天常态（${row.sample_count} 天样本）`;
      return `比最近 ${row.window_days} 天常态${delta > 0 ? "高" : "低"} ${Math.abs(delta)}%（${row.sample_count} 天样本）`;
    };
    const matching = (t: string) => petEvents.filter((e) => e.event_type === t);
    const mk = (
      id: string,
      label: string,
      value: string,
      icon: keyof typeof Ionicons.glyphMap,
      type: string,
      baselineMetric: string | null,
      current: number,
    ) => ({
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
        setDetail({ id, label, value, source: src, updatedAt: at, evidence: evi, compare: comparisonFor(baselineMetric, current) });
      },
    });
    const list = [
      mk("drink", "饮水", c("daily.drink") ? `${c("daily.drink")} 次` : "—", "water-outline", "daily.drink", null, c("daily.drink")),
      mk("meal", "进食", c("daily.meal") ? `${c("daily.meal")} 次` : "—", "restaurant-outline", "daily.meal", "meal_count_per_day", c("daily.meal")),
      mk(
        "activity",
        "活动",
        activityMinutes > 0 ? `${activityMinutes} 分钟` : "—",
        "walk-outline",
        "daily.walk",
        null,
        activityMinutes,
      ),
      mk("sleep", "睡眠", sleepMinutes > 0 ? `${sleepMinutes} 分钟` : "—", "moon-outline", "daily.sleep", "sleep_minutes_per_day", sleepMinutes),
    ];
    return list;
  }, [petEvents, pet?.id, baseline, scopedBaselineState]);

  const supportOwned = supportPetId === pet?.id;
  const openTaskCount = supportOwned && taskSupportState === "ready"
    ? supportTasks.filter((task) => task.status === "OPEN").length
    : 0;
  const weightText = pet?.weight_note?.trim() || "未记录";
  const taskText = !supportOwned || taskSupportState === "loading"
    ? "读取中"
    : taskSupportState === "error"
      ? "暂不可用"
      : openTaskCount > 0
        ? `${openTaskCount} 项待办`
        : "暂无待办";
  const deviceText = !supportOwned || deviceSupportState === "loading"
    ? "读取中"
    : deviceSupportState === "error"
      ? "暂不可用"
      : supportDevices.length === 0
        ? "未连接"
        : supportDevices.every((device) => ["connected", "online"].includes(String(device.status).toLowerCase()))
          ? `${supportDevices.length} 个在线`
          : supportDevices.some((device) => String(device.status).toLowerCase() === "offline")
            ? "有设备离线"
            : "状态待确认";

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
          <Text style={styles.identityText}>{pet?.name ?? "宠物"} · 生命视图</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} testID="pli.lifeview.freshness">
              {lastEvent
                ? `更新 ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                : "今天暂无新记录"}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText} testID="pli.lifeview.model-status">
              {twinLoading
                ? "3D 状态读取中"
                : twinError
                  ? "3D 状态暂时不可用"
                  : twin
                    ? twin.demoFixture
                      ? "示例形象 · 仅用于体验"
                      : "个体形象 · 已确认"
                    : "暂无已确认个体 3D"}
            </Text>
          </View>
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

        <View testID="pli.lifeview.support-facts" style={styles.supportFacts} accessibilityLabel="体重、任务与设备状态">
          <Pressable
            testID="pli.lifeview.support.weight"
            accessibilityRole="button"
            accessibilityLabel={`体重记录：${weightText}，点击编辑宠物资料`}
            onPress={() => navigation.navigate("PetProfile", { mode: "edit" })}
            style={styles.supportFact}
          >
            <Ionicons name="scale-outline" size={17} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.supportLabel}>体重</Text>
            <Text numberOfLines={1} style={styles.supportValue}>{weightText}</Text>
          </Pressable>
          <Pressable
            testID="pli.lifeview.support.tasks"
            accessibilityRole="button"
            accessibilityLabel={`待办任务：${taskText}，点击回到今天`}
            onPress={() => navigation.navigate("Tabs", { screen: "Today" })}
            style={styles.supportFact}
          >
            <Ionicons name="checkmark-done-outline" size={17} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.supportLabel}>任务</Text>
            <Text style={styles.supportValue}>{taskText}</Text>
          </Pressable>
          <Pressable
            testID="pli.lifeview.support.devices"
            accessibilityRole="button"
            accessibilityLabel={`设备状态：${deviceText}，点击查看设备`}
            onPress={() => navigation.navigate("Monitoring")}
            style={styles.supportFact}
          >
            <Ionicons name="hardware-chip-outline" size={17} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.supportLabel}>设备</Text>
            <Text style={styles.supportValue}>{deviceText}</Text>
          </Pressable>
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
                  : "当前还没有已确认的个体 3D 形象。真实照片与记录仍可正常使用；生成能力可用并经你确认后，才会显示个体 3D。"}
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
  supportFacts: {
    flexDirection: "row",
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s3,
    gap: SPACE.s2,
  },
  supportFact: {
    flex: 1,
    minWidth: 0,
    minHeight: 82,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s2,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  supportLabel: { marginTop: 4, fontSize: TYPE.caption, color: COLORS.textTertiary },
  supportValue: { marginTop: 2, maxWidth: "100%", fontSize: TYPE.sm, fontWeight: "700", color: COLORS.textPrimary },
  controlBtnText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  identityRow: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  identityText: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  metaDot: { fontSize: TYPE.caption, color: COLORS.dividerStrong },
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