/** R8AM: Mini-program follow-up observation loop (parity with Android/Web).
 *
 * The Mini Owner IA has no non-tab Quick Log route, so the Case detail hands a
 * SHORT-LIVED intent through platform storage, then switches to Today. The
 * intent is consumed once, validated against the canonical metric map, and can
 * only link an event that was actually saved for the same pet + metric.
 */
import { api } from "../services/api";
import { getPlatform } from "../platform";

export interface MiniFollowUpTarget {
  caseId: string;
  petId: string;
  metric: string;
  eventType: string;
}

const STORAGE_KEY = "pli_r8_followup_target";
const METRIC_EVENT: Record<string, string> = {
  walk_minutes_per_day: "daily.walk",
  meal_count_per_day: "daily.meal",
  sleep_minutes_per_day: "daily.sleep",
};

export function followUpEventType(metric: string): string | null {
  return METRIC_EVENT[metric] ?? null;
}

export function rememberFollowUpTarget(target: MiniFollowUpTarget): void {
  getPlatform().storage.setJson(STORAGE_KEY, target);
}

export function clearFollowUpTarget(): void {
  getPlatform().storage.remove(STORAGE_KEY);
}

/** Read-and-remove. A tampered/unknown stored shape is discarded, never used. */
export function consumeFollowUpTarget(): MiniFollowUpTarget | null {
  const raw = getPlatform().storage.getJson<Partial<MiniFollowUpTarget>>(STORAGE_KEY);
  clearFollowUpTarget();
  if (!raw || typeof raw.caseId !== "string" || typeof raw.petId !== "string"
      || typeof raw.metric !== "string") {
    return null;
  }
  const eventType = followUpEventType(raw.metric);
  if (!eventType) return null;
  return { caseId: raw.caseId, petId: raw.petId, metric: raw.metric, eventType };
}

export function isFollowUpEvent(
  target: MiniFollowUpTarget | null, petId: string, eventType: string,
): boolean {
  return Boolean(target) && target!.petId === petId && target!.eventType === eventType;
}

export function followUpIdempotencyKey(eventId: string): string {
  return `r8-mini-observation-${eventId}`;
}

export interface MiniFollowUpResult {
  linked: boolean;
  message: string;
}

/** Append exactly one owner observation Review; the saved event is never
 *  rolled back when only the linkage fails. */
export async function linkFollowUpObservation(
  target: MiniFollowUpTarget, eventId: string,
): Promise<MiniFollowUpResult> {
  try {
    const detail = await api.get<{
      case_id: string;
      pet_id: string;
      source_valid: boolean;
      reviews: Array<{ review_id: string }>;
    }>(`/pets/${target.petId}/life-change-cases/${target.caseId}`);
    if (detail.pet_id !== target.petId || detail.case_id !== target.caseId) {
      return { linked: false, message: "档案身份与当前宠物不一致，本次记录未关联。" };
    }
    if (!detail.source_valid) {
      return { linked: false, message: "原始依据已变更；记录已保存，但未关联，请先重新核对档案。" };
    }
    const latest = detail.reviews.length ? detail.reviews[detail.reviews.length - 1].review_id : null;
    const ack = await api.post<{
      review_id: string; pet_id: string; case_id: string; decision: string;
    }>(`/pets/${target.petId}/life-change-cases/${target.caseId}/reviews`, {
      decision: "RECORD_OBSERVATION",
      related_event_ids: [eventId],
      expected_latest_review_id: latest,
      idempotency_key: followUpIdempotencyKey(eventId),
    });
    if (ack.pet_id !== target.petId || ack.case_id !== target.caseId
        || ack.decision !== "RECORD_OBSERVATION" || !ack.review_id) {
      return { linked: false, message: "服务器未确认这条后续观察；记录已保存，但未关联。" };
    }
    return { linked: true, message: "已把这条真实记录关联到生活观察档案。" };
  } catch {
    return { linked: false, message: "记录已保存，但关联未完成；可在档案页稍后核对。" };
  }
}
