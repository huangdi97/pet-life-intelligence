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

const ELIMINATION_KIND_LABELS: Record<string, string> = {
  urine: "尿",
  stool: "便",
  both: "尿和便",
};
const ELIMINATION_QUALITY_LABELS: Record<string, string> = {
  normal: "和平时一样",
  abnormal: "和平时不一样",
  concerning: "明显需要关注",
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
  else if (e.event_type === "daily.elimination") {
    const kind = ELIMINATION_KIND_LABELS[String(payload.kind ?? "")] ?? "";
    const quality = ELIMINATION_QUALITY_LABELS[String(payload.quality ?? "")] ?? "";
    meta = [kind, quality].filter(Boolean).join(" · ");
  }
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
    mediaCount: e.artifact_ids?.length ?? 0,
    artifactIds: e.artifact_ids ?? [],
  };
}

/** Group by local calendar day, then display the most recent *actual* time first.
 * Sorting the English `Date.toDateString()` labels alphabetically put weekdays
 * before dates and could silently reorder a pet's life history.
 */
export function localLifeDayKey(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function groupEventsByDay(events: LifeEvent[]): LifeStreamDay[] {
  const groups = new Map<string, LifeEvent[]>();
  for (const event of events) {
    const key = localLifeDayKey(event.occurred_at);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  const today = localLifeDayKey(new Date().toISOString());
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => {
      const d = new Date(`${key}T12:00:00`);
      return {
        id: key,
        date: key,
        label: `${d.getMonth() + 1}月${d.getDate()}日`,
        isToday: key === today,
        rows: [...list].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).map(eventRowFromEvent),
      };
    });
}
