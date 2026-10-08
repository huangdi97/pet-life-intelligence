/**
 * today_helpers — pure TodayScreen helpers (event rows, relative freshness,
 * time context). Kept out of TodayScreen so it stays under the 300-line limit.
 */
import type { LifeEvent } from "../api";
import type { LifeStreamRow } from "../components/timeline/LifeStream";
import { eventTypeLabel, sourceLabel } from "./ui_labels";

const EVENT_ICONS: Record<string, keyof typeof import("@expo/vector-icons").Ionicons.glyphMap> = {
  "daily.meal": "restaurant-outline",
  "daily.drink": "water-outline",
  "daily.elimination": "remove-outline",
  "daily.walk": "walk-outline",
  "daily.play": "game-controller-outline",
  "daily.weight": "scale-outline",
  "daily.sleep": "moon-outline",
  "medication.administered": "medkit-outline",
  "behavior.observed": "paw-outline",
  "diary.created": "create-outline",
  "health.event_opened": "heart-outline",
  "care.task_completed": "checkmark-circle-outline",
  "social.interaction_logged": "people-outline",
};

export function dayPeriod(now: Date): string {
  const h = now.getHours();
  if (h < 6) return "凌晨";
  if (h < 12) return "上午";
  if (h < 18) return "下午";
  return "晚上";
}

export function timeContextText(): string {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 · ${dayPeriod(now)}`;
}

/** "最近记录 X 分钟前" — real relative freshness from the latest event. */
export function recentContext(events: LifeEvent[]): string | null {
  const last = events[0];
  if (!last) return null;
  const mins = Math.max(0, Math.round((Date.now() - new Date(last.occurred_at).getTime()) / 60000));
  if (mins < 1) return `最近记录了${eventTypeLabel(last.event_type)}`;
  if (mins < 60) return `最近记录 · ${mins} 分钟前`;
  const h = Math.floor(mins / 60);
  return `最近记录 · ${h} 小时前`;
}

export function eventRowFromEvent(e: LifeEvent): LifeStreamRow {
  const payload = e.payload ?? {};
  let meta = "";
  if (e.event_type === "daily.meal") meta = `${payload.food_type ?? "食物"} ${payload.amount ?? ""}${payload.unit ?? ""}`.trim();
  else if (e.event_type === "daily.drink") meta = `${payload.amount ?? ""}${payload.unit ?? "ml"}`.trim();
  else if (e.event_type === "daily.walk") meta = `户外 ${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.play") meta = `${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.weight") meta = `${payload.weight_kg ?? ""} kg`;
  else if (e.event_type === "daily.elimination") meta = `${payload.kind ?? ""} · ${payload.quality ?? ""}`.replace(/·\s*$/, "");
  return {
    id: e.event_id,
    time: new Date(e.occurred_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    typeLabel: eventTypeLabel(e.event_type),
    meta,
    sourceLabel: sourceLabel(e.source_type),
    outcome: e.retracted_at ? "已撤回" : null,
    icon: EVENT_ICONS[e.event_type] ?? "ellipse-outline",
    mediaUri: null,
  };
}

/**
 * Keep the native Today movement anchor faithful to observed events.
 * A sleep, medication or care duration is NOT an activity minute.
 * Matches the Web owner activity contract (daily.walk / daily.play only).
 */
const OBSERVED_MOVEMENT_EVENTS = new Set(["daily.walk", "daily.play"]);
export function observedActivityMinutes(events: readonly Pick<LifeEvent, "event_type" | "payload">[]): number {
  return events.reduce((total, event) => {
    if (!OBSERVED_MOVEMENT_EVENTS.has(event.event_type)) return total;
    const raw = (event.payload as Record<string, unknown> | null)?.duration_minutes;
    if (raw === null || raw === undefined || raw === "") return total;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
    return total + minutes;
  }, 0);
}
