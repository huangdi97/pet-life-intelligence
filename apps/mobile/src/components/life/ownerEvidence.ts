/** Owner-facing review evidence is paged for responsiveness, never truncated.
 * Each resolved event has to belong to the same pet and immutable requested ID.
 * No AI interpretations, identity substitutes, or client-generated sources.
 */
export const OWNER_EVIDENCE_BATCH_SIZE = 8;

export interface OwnerEvidenceIdentity {
  event_id: string;
  pet_id: string;
}

export function nextOwnerEvidenceIds(
  sourceIds: readonly string[],
  loadedIds: readonly string[],
): string[] {
  const existing = new Set(loadedIds);
  const page: string[] = [];
  for (const id of sourceIds) {
    if (!id || existing.has(id)) continue;
    existing.add(id);
    page.push(id);
    if (page.length === OWNER_EVIDENCE_BATCH_SIZE) break;
  }
  return page;
}

export function verifyOwnerEvidenceBatch(
  rows: readonly OwnerEvidenceIdentity[],
  requestedIds: readonly string[],
  petId: string,
): void {
  if (rows.length !== requestedIds.length ||
      rows.some((row, index) =>
        !row || row.pet_id !== petId || row.event_id !== requestedIds[index])) {
    throw new Error("原始记录身份与当前宠物或来源不符，已停止展示；请重新核对。");
  }
}

/** R8AB owner-visible values reflect only whitelisted *recorded* payload fields. */
export interface OwnerEvidenceFact {
  event_type: string;
  payload?: unknown;
  occurred_at: string;
  recorded_at: string;
  retracted_at?: string | null;
}

export function ownerEvidenceValue(event: OwnerEvidenceFact): string {
  if (event.retracted_at) return "这条记录已撤回，不再是当前变化的有效依据";
  if (event.event_type === "daily.meal") {
    return "按 1 条进食记录计数，不代表食物摄入量";
  }
  if (event.event_type !== "daily.walk" && event.event_type !== "daily.sleep") {
    return "仅展示有来源的生活记录";
  }
  const rawPayload = event.payload;
  const payload = rawPayload !== null && typeof rawPayload === "object" && !Array.isArray(rawPayload)
    ? rawPayload as Record<string, unknown> : null;
  const raw = payload?.duration_minutes;
  const numeric = typeof raw === "number"
    ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 1440) {
    return "时长未记录或无有效值，不能按零分钟计算";
  }
  return `记录时长 ${numeric} 分钟（非实时测量）`;
}

export function ownerEvidenceLocalTime(iso: string): string {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return "时间未确认";
  return instant.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Comparison role is based on the algorithm's UTC+08 day, not device TZ.
 * It classifies a saved observation in a Case; it is NOT clinical verification.
 */
export type OwnerEvidenceRole = "当日依据" | "同期参考" | "日期待核实";

export function ownerEvidenceRole(occurredAt: string, caseComputedAt: string): OwnerEvidenceRole {
  const eventMs = new Date(occurredAt).getTime();
  const computedMs = new Date(caseComputedAt).getTime();
  if (!Number.isFinite(eventMs) || !Number.isFinite(computedMs)) return "日期待核实";
  const policyDay = (ms: number): string =>
    new Date(ms + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (policyDay(eventMs) === policyDay(computedMs) && eventMs <= computedMs) return "当日依据";
  if (policyDay(eventMs) < policyDay(computedMs)) return "同期参考";
  return "日期待核实";
}

export function ownerEvidenceRoleCounts(
  events: readonly {occurred_at: string}[], caseComputedAt: string,
): {current: number; historical: number; unknown: number} {
  const counts = {current: 0, historical: 0, unknown: 0};
  for (const event of events) {
    const role = ownerEvidenceRole(event.occurred_at, caseComputedAt);
    if (role === "当日依据") counts.current++;
    else if (role === "同期参考") counts.historical++;
    else counts.unknown++;
  }
  return counts;
}
