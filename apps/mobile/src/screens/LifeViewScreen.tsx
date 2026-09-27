/**
 * LifeViewScreen — Pet Living Stage (R2-P3D §22–24 / v3.4 §46.8).
 *
 * Full 3D Living Stage: the shared demo pet asset is interactive here
 * (drag rotate, pinch zoom, reset). State anchors are clickable and open a
 * detail sheet with facts / self-comparison / source / updated-at / evidence —
 * all real API data, never invented scores. Modes: 此刻 (complete) /
 * 趋势 / 时间线 / 外观 (minimal but real). Provider/model/raw keys never
 * appear on the owner surface.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, type LifeEvent } from "../api";
import { usePets } from "../context";
import { COLORS, DEMO_ENV, SPACE, TYPE } from "../tokens";
import { PetLivingStage } from "../components/life/PetLivingStage";
import { LivingModeSwitcher, type LivingMode } from "../components/life/LivingModeSwitcher";
import { LifeStream, type LifeStreamDay, type LifeStreamRow } from "../components/timeline/LifeStream";
import { resolvePetStage } from "../components/pet/PetStageRenderer";
import { eventTypeLabel, sourceLabel } from "./ui_labels";

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
  const [today, setToday] = useState<{ events: LifeEvent[] } | null>(null);
  const [mode, setMode] = useState<LivingMode>("now");
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<AnchorDetail | null>(null);

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
  const petEvents = useMemo(() => (today?.events ?? []).filter((e) => e.event_type !== "today.viewed"), [today]);
  const lastEvent = petEvents[0] ?? null;

  const anchors = useMemo(() => {
    const rows = petEvents.map((e) => e.event_type);
    const c = (t: string) => rows.filter((x) => x === t).length;
    const duration = (t: string) =>
      petEvents
        .filter((e) => e.event_type === t)
        .reduce((a, e) => a + (Number((e.payload as Record<string, unknown>)?.duration_minutes) || 0), 0);
    const matching = (t: string) => petEvents.filter((e) => e.event_type === t);
    const mk = (id: string, label: string, value: string, icon: keyof typeof Ionicons.glyphMap, type: string) => ({
      id,
      label,
      value,
      icon,
      onPress: () => {
        const evs = matching(type);
        const src = evs.length ? Array.from(new Set(evs.map((e) => sourceLabel(e.source_type)))).join(" + ") : "—";
        const at = evs[0]
          ? new Date(evs[0].occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : "—";
        const evi = evs[0] ? `${eventTypeLabel(evs[0].event_type)} · ${at}` : "暂无记录";
        setDetail({ id, label, value, source: src, updatedAt: at, evidence: evi, compare: "暂无（数据积累后显示）" });
      },
    });
    const list = [
      mk("drink", "饮水", c("daily.drink") ? `${c("daily.drink")} 次` : "", "water-outline", "daily.drink"),
      mk("meal", "进食", c("daily.meal") ? `${c("daily.meal")} 次` : "", "restaurant-outline", "daily.meal"),
      mk(
        "activity",
        "活动",
        duration("daily.walk") + duration("daily.play") ? `${duration("daily.walk") + duration("daily.play")} 分钟` : "",
        "walk-outline",
        "daily.walk",
      ),
      mk("sleep", "睡眠", c("daily.sleep") ? `${c("daily.sleep")} 次` : "", "moon-outline", "daily.sleep"),
    ];
    return list.filter((a) => a.value !== "");
  }, [petEvents]);

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

  const nowLine = error
    ? "暂时连接不上，稍后自动恢复。"
    : !pet
      ? ""
      : petEvents.length === 0
        ? "今天还没有记录，豆豆安安静静的。"
        : lastEvent
          ? `最近一次记录：${eventTypeLabel(lastEvent.event_type)} · ${new Date(lastEvent.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
          : "";

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PetLivingStage
          pet={pet}
          spec={resolvePetStage(pet)}
          variant="life"
          anchors={anchors}
          headline={mode === "now" ? "豆豆 · 此刻" : undefined}
          caption={mode === "now" ? nowLine : undefined}
          note="演示 3D 形象（开发环境）· 未来连接真实服务后，将用豆豆的照片生成"
          demo={DEMO_ENV}
          interactive
        />

        <LivingModeSwitcher value={mode} onChange={setMode} />

        <View style={styles.panel} accessibilityLiveRegion="polite">
          {mode === "now" ? (
            <Text style={styles.panelText}>
              {anchors.length
                ? "上面的数值来自今天真实的记录。点一下数值，可以看到事实、来源与更新时间。拖动宠物可以旋转，双指缩放。"
                : "今天还没有足够记录，记下第一件事后，这里会围绕豆豆展开。"}
            </Text>
          ) : null}

          {mode === "trend" ? (
            anchors.length ? (
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

          {mode === "timeline" ? (
            streamDays.length ? (
              <LifeStream days={streamDays} />
            ) : (
              <Text style={styles.panelText}>
                {error ? "暂时连接不上。" : "从第一次喂食、散步或健康记录开始，生命轨迹会慢慢成形。"}
              </Text>
            )
          ) : null}

          {mode === "look" ? (
            <View style={styles.lookRow}>
              <Ionicons name="cube-outline" size={18} color={COLORS.textTertiary} />
              <Text style={styles.panelText}>
                现在显示的是演示 3D 形象（开发环境），只来自演示数据。未来连接真实服务后，会用豆豆的真实照片生成，并经过你确认后才会显示。外观不会替代真实照片与记录。
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
  sheetClose: { padding: 4 },
  sheetValue: { fontSize: TYPE.metric, fontWeight: "700", color: COLORS.brandPrimaryDeep, marginBottom: SPACE.s3 },
  row: { flexDirection: "row", paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.dividerSubtle },
  rowKey: { width: 92, fontSize: TYPE.body, color: COLORS.textTertiary },
  rowVal: { flex: 1, fontSize: TYPE.body, color: COLORS.textPrimary, lineHeight: 20 },
});