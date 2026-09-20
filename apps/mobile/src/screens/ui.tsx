/** Shared screen primitives for the Stage H mobile screens (Card / Chip /
 *  Badge / buttons / titles / event item). All styling values come from
 *  tokens.ts — colors are never hardcoded outside tokens.ts. zh-CN copy
 *  everywhere; labels map canonical backend values, never invented ones. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { type LifeEvent } from "../api";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";

// --- primitives -----------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={s.titleWrap}>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.cardTitle}>{children}</Text>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipActiveText]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/** PROTOTYPE tag — rendered on every prototype / feature-flagged control. */
export function ProtoTag() {
  return <Badge text="PROTOTYPE" color={COLORS.accent600} bg={COLORS.accent50} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.primaryBtn, disabled && s.btnDisabled, pressed && !disabled && s.btnPressed]}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, small }: { label: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ghostBtn, small && s.ghostBtnSmall, pressed && s.btnPressed]}>
      <Text style={[s.ghostBtnText, small && s.ghostBtnTextSmall]}>{label}</Text>
    </Pressable>
  );
}

export function MutedText({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

export function EmptyText({ children }: { children: React.ReactNode }) {
  return <Text style={s.empty}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={s.error}>{children}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={s.loading} color={COLORS.primary500} />;
}

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

// --- canonical value labels (registry / enum patterns) ---------------------

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

// --- styles ----------------------------------------------------------------

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    padding: SPACE.s4,
    marginVertical: SPACE.s2,
  },
  titleWrap: { marginTop: SPACE.s2, marginBottom: SPACE.s3 },
  title: { fontSize: TYPE.xxl, fontWeight: TYPE.weightBold, color: COLORS.inkPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s1 },
  section: {
    fontSize: TYPE.md,
    fontWeight: TYPE.weightSemibold,
    color: COLORS.inkPrimary,
    marginTop: SPACE.s5,
    marginBottom: SPACE.s2,
  },
  cardTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  chip: {
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgSurfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
  },
  chipActive: { backgroundColor: COLORS.primary100, borderColor: COLORS.primary500 },
  chipText: { fontSize: TYPE.base, color: COLORS.inkMuted },
  chipActiveText: { color: COLORS.primary800, fontWeight: TYPE.weightSemibold },
  badge: {
    paddingHorizontal: SPACE.s2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: TYPE.xs, fontWeight: TYPE.weightMedium },
  primaryBtn: {
    backgroundColor: COLORS.primary500,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s5,
    alignItems: "center",
    marginTop: SPACE.s3,
  },
  primaryBtnText: { color: COLORS.bgSurface, fontSize: TYPE.base, fontWeight: TYPE.weightSemibold },
  ghostBtn: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s5,
    alignItems: "center",
  },
  ghostBtnSmall: { paddingVertical: SPACE.s2, paddingHorizontal: SPACE.s3 },
  ghostBtnText: { color: COLORS.inkPrimary, fontSize: TYPE.base },
  ghostBtnTextSmall: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  muted: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s2 },
  empty: { fontSize: TYPE.base, color: COLORS.inkMuted, textAlign: "center", paddingVertical: SPACE.s6 },
  error: { fontSize: TYPE.base, color: COLORS.danger, marginVertical: SPACE.s2 },
  loading: { marginVertical: SPACE.s6 },
  eventHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  eventTime: { fontSize: TYPE.xs, color: COLORS.inkMuted },
  eventMeta: { fontSize: TYPE.xs, color: COLORS.inkSecondary, marginTop: SPACE.s1 },
});
