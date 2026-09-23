/** Event item component + canonical value labels (colocated with ui.tsx).
 *  zh-CN copy everywhere; labels map canonical backend values, never invented
 *  ones. */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { type LifeEvent } from "../api";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { Card } from "./ui_shared";

/** Event list item: type / time / actor / source (backend values only). */
export function EventItem({ event }: { event: LifeEvent }) {
  return (
    <Card>
      <View style={s.eventHead}>
        <Text style={s.eventType}>{eventTypeLabel(event.event_type)}</Text>
        <Text style={s.eventTime}>{fmtTime(event.occurred_at)}</Text>
      </View>
      <Text style={s.eventMeta}>
        {event.actor_name || "未知"} · {sourceLabel(event.source_type)}
      </Text>
    </Card>
  );
}

/** zh-CN labels for canonical life-event types. Unknown types fall back to
 *  the raw value — never invented labels. */
export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    "daily.meal": "喂食",
    "daily.drink": "饮水",
    "daily.elimination": "排泄",
    "daily.walk": "散步",
    "daily.play": "玩耍",
    "daily.weight": "体重",
    "daily.sleep": "睡觉",
    "medication.administered": "用药",
    "behavior.observed": "行为",
    "diary.created": "备注",
    "health.event_opened": "健康",
    "care.task_created": "任务",
    "care.task_completed": "任务完成",
    "care.task_conflict": "任务冲突",
    "today.viewed": "今日查看",
  };
  return map[eventType] ?? eventType;
}

/** zh-CN labels for canonical source types (domain enums.SourceType). */
export function sourceLabel(sourceType: string): string {
  const map: Record<string, string> = {
    OWNER_REPORTED: "主人记录",
    CAREGIVER_REPORTED: "照护人记录",
    DEVICE_DERIVED: "设备",
    AI_DERIVED: "AI",
    PROFESSIONAL_CONFIRMED: "专业确认",
    LAB_CONFIRMED: "化验确认",
    SYSTEM_CALCULATED: "系统计算",
  };
  return map[sourceType] ?? sourceType;
}

/** Timeline filter chips — 全部 + the daily.* types, as repeated event_type=
 *  params on GET /pets/{id}/events. */
export const TIMELINE_FILTERS: Array<{ key: string; zh: string; types: string[] }> = [
  { key: "all", zh: "全部", types: [] },
  { key: "meal", zh: "进食", types: ["daily.meal"] },
  { key: "drink", zh: "饮水", types: ["daily.drink"] },
  { key: "elimination", zh: "排泄", types: ["daily.elimination"] },
  { key: "walk", zh: "散步", types: ["daily.walk"] },
  { key: "play", zh: "玩耍", types: ["daily.play"] },
  { key: "weight", zh: "体重", types: ["daily.weight"] },
  { key: "sleep", zh: "睡眠", types: ["daily.sleep"] },
];

/** Device status labels (same vocabulary as apps/web monitoring deviceStates;
 *  backend PetDevice.status). 设备集成为原型 — never fake online: anything
 *  unrecognized shows 未知. */
export function deviceStateLabel(status: string): string {
  const map: Record<string, string> = {
    connected: "在线",
    offline: "离线",
    degraded: "降级",
    needs_review: "需检查",
    unknown: "未知",
  };
  return map[status] ?? "未知";
}

export function deviceStateColors(status: string): { color: string; bg: string } {
  if (status === "connected") return { color: COLORS.ok, bg: COLORS.okBg };
  if (status === "degraded") return { color: COLORS.notice, bg: COLORS.noticeBg };
  if (status === "needs_review") return { color: COLORS.accent500, bg: COLORS.accent50 };
  return { color: COLORS.inkMuted, bg: COLORS.bgSurfaceMuted };
}

const s = StyleSheet.create({
  eventHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  eventTime: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  eventMeta: { fontSize: TYPE.xs, color: COLORS.inkSecondary, marginTop: SPACE.s1 },
});
