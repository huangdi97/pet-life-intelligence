/** R8AQ: owner correction of a recorded source is an append-only supersede.
 *
 * The UI may only change the documented daily value; it never edits the
 * original row, never moves the occurrence instant, and never invents fields.
 */
export interface CorrectionField {
  key: "duration_minutes";
  label: string;
  unit: string;
}

const FIELDS: Record<string, CorrectionField> = {
  walk_minutes_per_day: { key: "duration_minutes", label: "当时记录的散步时长", unit: "分钟" },
  sleep_minutes_per_day: { key: "duration_minutes", label: "当时记录的睡眠时长", unit: "分钟" },
};

/** meal_count_per_day is intentionally unsupported: a meal record's meaning is
 *  not one editable number, so the owner must retract and record again. */
export function correctionFieldForMetric(metric: string): CorrectionField | null {
  return FIELDS[metric] ?? null;
}

export function correctionPayload(
  field: CorrectionField, raw: string,
): Record<string, number> | null {
  const text = raw.trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > 1440) return null;
  return { [field.key]: value };
}

/** One immutable correction instruction per (event, corrected value). */
export function correctionIdempotencyKey(eventId: string, value: number): string {
  return `r8-web-correction-${eventId}-${value}`;
}
