/**
 * Life stream data helpers — canonical event → presentation row, day grouping.
 * Shared by Today (memory preview) and Timeline (full stream).
 */
import type { LifeEvent } from "../../api";
import type { LifeStreamDay, LifeStreamRow } from "./LifeStream";
import { eventTypeLabel, sourceLabel } from "../../screens/ui_labels";

export const EVENT_ICONS: Record<string, string> = {
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

function hourMinute(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export function eventRowFromEvent(e: LifeEvent): LifeStreamRow {
  const payload = (e.payload ?? {}) as Record<string, unknown>;
  let meta = "";
  if (e.event_type === "daily.meal") meta = `${payload.food_type ?? "食物"} ${payload.amount ?? ""}${payload.unit ?? ""}`.trim();
  else if (e.event_type === "daily.drink") meta = `${payload.amount ?? ""}${payload.unit ?? "ml"}`.trim();
  else if (e.event_type === "daily.walk") meta = `户外 ${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.play") meta = `${payload.duration_minutes ?? "—"} 分钟`;
  else if (e.event_type === "daily.weight") meta = `${payload.weight_kg ?? ""} kg`;
  else if (e.event_type === "daily.elimination") meta = `${payload.kind ?? ""} · ${payload.quality ?? ""}`.replace(/·\s*$/, "");
  else if (e.event_type === "medication.administered") meta = `${payload.medicine_name ?? ""} ${payload.dose_text ?? ""}`.trim();
  return {
    id: e.event_id,
    time: hourMinute(e.occurred_at),
    typeLabel: eventTypeLabel(e.event_type),
    meta,
    sourceLabel: sourceLabel(e.source_type),
    outcome: e.retracted_at ? "已撤回" : null,
    icon: (EVENT_ICONS[e.event_type] ?? "ellipse-outline") as LifeStreamRow["icon"],
    mediaUri: null,
  };
}

export function groupEventsByDay(events: LifeEvent[]): LifeStreamDay[] {
  const groups = new Map<string, LifeEvent[]>();
  for (const e of events) {
    const key = new Date(e.occurred_at).toDateString();
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  const nowKey = new Date().toDateString();
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, list]) => {
      const d = new Date(key);
      return {
        id: key,
        label: `${d.getMonth() + 1}月${d.getDate()}日`,
        isToday: key === nowKey,
        rows: list.map(eventRowFromEvent),
      };
    });
}
