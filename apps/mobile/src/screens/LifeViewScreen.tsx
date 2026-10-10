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
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, type DeviceRow, type HealthEventRow, type LifeEvent, type Task } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import { PetLivingStage } from "../components/life/PetLivingStage";
import type { Pet3DViewerHandle } from "../components/three/Pet3DViewer";
import { LivingModeSwitcher, type LivingMode } from "../components/life/LivingModeSwitcher";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { eventTypeLabel, sourceLabel } from "./ui_labels";
import { observedActivityMinutes } from "./today_helpers";
import { usePetTwin } from "../hooks/usePetTwin";
import { poseForEvent, type TwinDescriptor } from "@pli/pet-3d";
import type { StackParamList } from "../navigation";

interface BaselineRow {
  metric: string;
  value: string;
  sample_count: number;
  window_days: number;
  computed_at: string;
}

type TimeScope = "now" | "today" | "7d" | "30d" | "date";
interface HistoricalVisualModel {
  version: number;
  status: string;
  activated_at: string | null;
  retired_at: string | null;
  artifact_map?: { twin_descriptor?: TwinDescriptor };
  metadata_json?: { demo_fixture?: boolean };
}
interface HistoricalTwin {
  version: number;
  descriptor: TwinDescriptor;
  demoFixture: boolean;
  activatedAt: string;
  observedRegions: string[];
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
  const route = useRoute<RouteProp<StackParamList, "LifeView">>();
  const requestedDate =
    route.params?.date && /^\d{4}-\d{2}-\d{2}$/.test(route.params.date)
      ? route.params.date
      : null;
  const { twin, loading: twinLoading, error: twinError } = usePetTwin(petId);
  const [rawToday, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [mode, setMode] = useState<LivingMode>("now");
  const [timeScope, setTimeScope] = useState<TimeScope>(requestedDate ? "date" : "now");
  const [selectedDate, setSelectedDate] = useState(() => requestedDate ?? new Date().toISOString().slice(0, 10));
  const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
  const [historyPetId, setHistoryPetId] = useState<string | null>(null);
  const [historyModels, setHistoryModels] = useState<HistoricalVisualModel[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
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
  const [supportHealth, setSupportHealth] = useState<HealthEventRow[]>([]);
  const [taskSupportState, setTaskSupportState] = useState<"loading" | "ready" | "error">("loading");
  const [deviceSupportState, setDeviceSupportState] = useState<"loading" | "ready" | "error">("loading");
  const [healthSupportState, setHealthSupportState] = useState<"loading" | "ready" | "error">("loading");

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const scopeKey = pet?.id
    ? `${pet.id}:${timeScope}:${timeScope === "date" ? selectedDate : ""}`
    : "";
  const currentFactScope = timeScope === "now" || timeScope === "today";
  const stagePet = currentFactScope
    ? pet
    : pet
      ? { ...pet, avatar_artifact_id: null }
      : null;
  // Each fact and any open detail sheet belongs to one pet. Hide stale state
  // synchronously while React switches selected identity, before fetch effects.
  const scoped = !!pet?.id && loadedScopeKey === scopeKey;
  const today = scoped ? rawToday : null;
  const error = scoped ? rawError : false;
  const detail = detailPetId === pet?.id ? rawDetail : null;
  const baseline = baselinePetId === pet?.id ? rawBaseline : [];
  const scopedBaselineState = baselinePetId === pet?.id ? baselineState : "loading";

  useEffect(() => {
    if (!requestedDate) return;
    setSelectedDate(requestedDate);
    setTimeScope("date");
    setMode("now");
    setDetail(null);
  }, [requestedDate]);

  useEffect(() => {
    if (!pet?.id) return;
    const targetPetId = pet.id;
    const targetScopeKey = scopeKey;
    let alive = true;
    setToday(null);
    setError(false);
    setDetail(null);

    const loadEvents = async (): Promise<{ events: LifeEvent[] }> => {
      if (timeScope === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return { events: [] };
        return api.get<{ events: LifeEvent[] }>(`/pets/${targetPetId}/today?date=${selectedDate}`);
      }
      if (timeScope === "7d" || timeScope === "30d") {
        const days = timeScope === "7d" ? 7 : 30;
        const response = await api.get<{ events: LifeEvent[] }>(`/pets/${targetPetId}/events?limit=200`);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return {
          events: response.events.filter((event) => {
            const at = new Date(event.occurred_at).getTime();
            return Number.isFinite(at) && at >= cutoff;
          }),
        };
      }
      return api.get<{ events: LifeEvent[] }>(`/pets/${targetPetId}/today`);
    };

    loadEvents()
      .then((r) => {
        if (!alive) return;
        setToday(r);
        setError(false);
        setLoadedScopeKey(targetScopeKey);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoadedScopeKey(targetScopeKey);
      });

    return () => {
      alive = false;
    };
  }, [pet?.id, scopeKey, timeScope, selectedDate]);

  useEffect(() => {
    if (!pet?.id) return;
    let alive = true;
    setBaseline([]);
    setBaselinePetId(null);
    setBaselineState("loading");
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
    return () => { alive = false; };
  }, [pet?.id]);

  useEffect(() => {
    if (!pet?.id) return;
    const targetPetId = pet.id;
    let alive = true;
    setHistoryPetId(null);
    setHistoryModels([]);
    setHistoryState("loading");
    api.get<{ models: HistoricalVisualModel[] }>(`/pets/${targetPetId}/visual-models`)
      .then((response) => {
        if (!alive) return;
        setHistoryModels(response.models ?? []);
        setHistoryPetId(targetPetId);
        setHistoryState("ready");
      })
      .catch(() => {
        if (!alive) return;
        setHistoryModels([]);
        setHistoryPetId(targetPetId);
        setHistoryState("error");
      });
    return () => { alive = false; };
  }, [pet?.id]);

  useEffect(() => {
    if (!pet?.id) return;
    const targetPetId = pet.id;
    let alive = true;
    setSupportPetId(null);
    setSupportTasks([]);
    setSupportDevices([]);
    setSupportHealth([]);
    setTaskSupportState("loading");
    setDeviceSupportState("loading");
    setHealthSupportState("loading");
    Promise.allSettled([
      api.get<Task[]>(`/pets/${targetPetId}/tasks`),
      api.get<DeviceRow[]>(`/pets/${targetPetId}/devices`),
      api.get<HealthEventRow[]>(`/pets/${targetPetId}/health-events`),
    ]).then(([tasksResult, devicesResult, healthResult]) => {
      if (!alive) return;
      setSupportTasks(tasksResult.status === "fulfilled" ? tasksResult.value : []);
      setSupportDevices(devicesResult.status === "fulfilled" ? devicesResult.value : []);
      setSupportHealth(healthResult.status === "fulfilled" ? healthResult.value : []);
      setTaskSupportState(tasksResult.status === "fulfilled" ? "ready" : "error");
      setDeviceSupportState(devicesResult.status === "fulfilled" ? "ready" : "error");
      setHealthSupportState(healthResult.status === "fulfilled" ? "ready" : "error");
      setSupportPetId(targetPetId);
    });
    return () => { alive = false; };
  }, [pet?.id]);

  const petEvents = useMemo(() => (today?.events ?? []).filter((e) => e.event_type !== "today.viewed"), [today]);
  const historicalTwin = useMemo<HistoricalTwin | null>(() => {
    if (timeScope !== "date" || historyPetId !== pet?.id || historyState !== "ready") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return null;
    const dayStart = new Date(`${selectedDate}T00:00:00+08:00`).getTime();
    const dayEnd = new Date(`${selectedDate}T23:59:59.999+08:00`).getTime();
    const candidates = historyModels
      .filter((model) => {
        const descriptor = model.artifact_map?.twin_descriptor;
        if (!descriptor || !model.activated_at) return false;
        const activated = new Date(model.activated_at).getTime();
        const retired = model.retired_at ? new Date(model.retired_at).getTime() : Number.POSITIVE_INFINITY;
        return Number.isFinite(activated) && activated <= dayEnd && retired >= dayStart;
      })
      .sort((a, b) => (b.activated_at ?? "").localeCompare(a.activated_at ?? ""));
    const model = candidates[0];
    const descriptor = model?.artifact_map?.twin_descriptor;
    if (!model || !descriptor || !model.activated_at) return null;
    const surface = (descriptor as { surface?: { observed_regions?: string[] } }).surface;
    return {
      version: model.version,
      descriptor,
      demoFixture: model.metadata_json?.demo_fixture === true,
      activatedAt: model.activated_at,
      observedRegions: surface?.observed_regions ?? [],
    };
  }, [timeScope, selectedDate, historyPetId, historyState, historyModels, pet?.id]);

  const displayTwin =
    timeScope === "now" || timeScope === "today"
      ? twin
      : timeScope === "date"
        ? historicalTwin
        : null;
  const historicalRange = timeScope === "7d" || timeScope === "30d";
  const scopeLabel =
    timeScope === "now" ? "此刻" :
    timeScope === "today" ? "今天" :
    timeScope === "7d" ? "最近 7 天" :
    timeScope === "30d" ? "最近 30 天" :
    selectedDate;
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
      if (timeScope === "date") return "历史常态未版本化，不用当前常态解释过去";
      if (historicalRange) return "这是时间范围汇总，不与单日常态直接比较";
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
  }, [petEvents, pet?.id, baseline, scopedBaselineState, timeScope, historicalRange]);

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
  const healthText = !supportOwned || healthSupportState === "loading"
    ? "读取中"
    : healthSupportState === "error"
      ? "暂不可用"
      : supportHealth.some((row) => row.latest_triage_level === "URGENT" || row.latest_triage_level === "EMERGENCY")
        ? "需立即关注"
        : supportHealth.length > 0
          ? "有健康记录"
          : "暂无记录";

  const scopeEmptyCopy =
    timeScope === "date"
      ? `${selectedDate} 没有已记录事件。`
      : historicalRange
        ? `${scopeLabel}还没有足够记录。`
        : `${pet?.name ?? "宠物"}今天安安静静的。`;
  const scopeModelStatus =
    timeScope === "date"
      ? historyState === "loading"
        ? "历史 3D 版本读取中"
        : historyState === "error"
          ? "历史 3D 版本暂不可用"
          : historicalTwin
            ? `历史第 ${historicalTwin.version} 版 · ${new Date(historicalTwin.activatedAt).toLocaleDateString("zh-CN")} 激活`
            : "该日无可确认 3D 版本"
      : historicalRange
        ? "时间范围汇总 · 不使用当前 3D"
        : twinLoading
          ? "3D 状态读取中"
          : twinError
            ? "3D 状态暂时不可用"
            : twin
              ? twin.demoFixture
                ? "示例形象 · 仅用于体验"
                : "个体形象 · 已确认"
              : "暂无已确认个体 3D";

  const nowLine = error
    ? "暂时连接不上，稍后自动恢复。"
    : !pet
      ? ""
      : petEvents.length === 0
        ? scopeEmptyCopy
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
                : `${scopeLabel}暂无新记录`}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText} testID="pli.lifeview.model-status">
              {scopeModelStatus}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeScopeRow}
          testID="pli.lifeview.time-scrubber"
          accessibilityLabel="生命视图时间范围"
        >
          {([
            ["now", "现在"],
            ["today", "今天"],
            ["7d", "7天"],
            ["30d", "30天"],
            ["date", "某一天"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: timeScope === value }}
              onPress={() => setTimeScope(value)}
              style={[styles.timeScopeChip, timeScope === value && styles.timeScopeChipActive]}
              testID={`pli.lifeview.time.${value}`}
            >
              <Text style={[styles.timeScopeChipText, timeScope === value && styles.timeScopeChipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {timeScope === "date" ? (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>查看日期</Text>
            <TextInput
              testID="pli.lifeview.time.date-input"
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              style={styles.dateInput}
            />
          </View>
        ) : null}

        <View style={styles.stageWrap}>
          <PetLivingStage
            pet={stagePet}
            spec={resolvePetStage(stagePet)}
            variant="life"
            anchors={anchors}
            headline={mode === "now" ? `${pet?.name ?? "宠物"} · ${scopeLabel}` : undefined}
            caption={mode === "now" ? nowLine : undefined}
            note={historicalRange ? "时间范围汇总不使用当前 3D 形象冒充历史。" : timeScope === "date" && !historicalTwin ? "该日没有可确认的历史 3D 版本；保留真实记录与照片。" : undefined}
            demo={displayTwin ? (DEMO_ENV || displayTwin.demoFixture === true) : false}
            interactive={Boolean(displayTwin)}
            twin={displayTwin?.descriptor ?? null}
            sourceMediaCount={displayTwin?.observedRegions.length ?? 0}
            frameTarget={0.54}
            viewerRef={viewerRef}
            pose={displayTwin ? representativePose : null}
          />
        </View>

        {displayTwin ? (
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
        ) : null}


        <View testID="pli.lifeview.control.modes">
          <LivingModeSwitcher value={mode} onChange={setMode} onTimeline={() => navigation.navigate("Tabs", { screen: "Timeline" })} />
        </View>

        {currentFactScope ? (
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
            testID="pli.lifeview.support.health"
            accessibilityRole="button"
            accessibilityLabel={`健康状态：${healthText}，点击查看健康记录`}
            onPress={() => navigation.navigate("Health")}
            style={styles.supportFact}
          >
            <Ionicons name="heart-outline" size={17} color={healthText === "需立即关注" ? COLORS.danger : COLORS.brandPrimaryDeep} />
            <Text style={styles.supportLabel}>健康</Text>
            <Text style={[styles.supportValue, healthText === "需立即关注" && styles.supportValueDanger]}>{healthText}</Text>
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
        ) : (
          <View style={styles.historyTruth} testID="pli.lifeview.history-truth">
            <Ionicons name="time-outline" size={16} color={COLORS.textTertiary} />
            <Text style={styles.historyTruthText}>
              历史范围只显示当时存在的事件和可验证 3D 版本；今天的体重、任务、健康与设备状态不会倒灌到过去。
            </Text>
          </View>
        )}


        <View testID="pli.lifeview.panel" style={styles.panel} accessibilityLiveRegion="polite">
          {mode === "now" ? (
            <Text style={styles.panelText}>
              {petEvents.length > 0
                ? currentFactScope
                  ? "上面的数值来自今天真实的记录。点一下数值，可以看到事实、来源与更新时间。拖动宠物可以旋转，双指缩放。"
                  : `${scopeLabel}的数值只汇总该时间范围内真实存在的记录；不会混入今天的任务、设备、健康或头像。`
                : currentFactScope
                  ? `今天还没有足够记录，记下第一件事后，这里会围绕${pet?.name ?? "宠物"}展开。`
                  : scopeEmptyCopy}
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
                {timeScope === "date"
                  ? historicalTwin
                    ? `这一天使用当时有效的第 ${historicalTwin.version} 版 3D 形象；不会使用后来版本替代。`
                    : "这一天没有可确认的历史 3D 版本；不会用现在的样子补画过去。"
                  : historicalRange
                    ? "该时间范围跨越多个日期，不使用当前 3D 形象代表整个历史区间。"
                    : twin
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
  timeScopeRow: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3, gap: SPACE.s2 },
  timeScopeChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceRaised },
  timeScopeChipActive: { backgroundColor: COLORS.brandPrimary },
  timeScopeChipText: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textSecondary },
  timeScopeChipTextActive: { color: COLORS.textInverse },
  dateRow: { marginHorizontal: SPACE.s4, marginTop: SPACE.s2, flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  dateLabel: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  dateInput: { flex: 1, minHeight: 44, borderRadius: 16, paddingHorizontal: SPACE.s3, backgroundColor: COLORS.surfaceRaised, color: COLORS.textPrimary },
  historyTruth: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3, flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2, padding: SPACE.s3, borderRadius: 18, backgroundColor: COLORS.surfaceRaised },
  historyTruthText: { flex: 1, fontSize: TYPE.sm, lineHeight: 20, color: COLORS.textSecondary },
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
    flexWrap: "wrap",
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s3,
    gap: SPACE.s2,
  },
  supportFact: {
    width: "48%",
    flexGrow: 1,
    minWidth: 140,
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
  supportValueDanger: { color: COLORS.danger },
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