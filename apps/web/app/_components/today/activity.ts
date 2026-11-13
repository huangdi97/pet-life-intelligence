import type { LifeEvent } from "@pli/api-client";

/**
 * Today activity anchor is a sum of observed movement/play sessions only.
 * duration_minutes on sleep, medication, care or other events is NOT activity.
 * Never infer activity from a timeline entry that does not contain that fact.
 */
const OBSERVED_ACTIVITY_TYPES = new Set(["daily.walk", "daily.play"]);

export function observedActivityMinutes(
  events: readonly Pick<LifeEvent, "event_type" | "payload">[],
): number {
  return events.reduce((total, event) => {
    if (!OBSERVED_ACTIVITY_TYPES.has(event.event_type)) return total;
    const raw = (event.payload as Record<string, unknown> | null)?.duration_minutes;
    if (raw === null || raw === undefined || raw === "") return total;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
    return total + minutes;
  }, 0);
}

export function observedDurationMinutes(
  events: readonly Pick<LifeEvent, "event_type" | "payload">[],
  eventType: string,
): number {
  return events.reduce((total, event) => {
    if (event.event_type !== eventType) return total;
    const raw = (event.payload as Record<string, unknown> | null)?.duration_minutes;
    if (raw === null || raw === undefined || raw === "") return total;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return total;
    return total + minutes;
  }, 0);
}

export function formatObservedDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} 小时`;
}
