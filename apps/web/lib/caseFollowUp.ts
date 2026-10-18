/** R8AK/R8AL: close the owner observation loop on the Web client.
 *
 * INVARIANT: a follow-up Review may only cite a REAL LifeEvent that was just
 * saved by the owner. This module never fabricates an event id, never invents
 * a health conclusion, and keeps the server's owner-role/source-validity/CAS
 * checks authoritative.
 */
import { api } from "@pli/api-client";

export interface FollowUpTarget {
  caseId: string;
  petId: string;
  metric: string;
  eventType: string;
}

const METRIC_EVENT: Record<string, string> = {
  walk_minutes_per_day: "daily.walk",
  meal_count_per_day: "daily.meal",
  sleep_minutes_per_day: "daily.sleep",
};

export function followUpEventType(metric: string): string | null {
  return METRIC_EVENT[metric] ?? null;
}

export function followUpHref(petId: string, caseId: string, metric: string): string {
  const params = new URLSearchParams({
    followUpCase: caseId,
    followUpPet: petId,
    followUpMetric: metric,
  });
  return `/?${params.toString()}`;
}

/** A saved event is linked only when the archive and the sheet agree on BOTH
 *  the same pet and the same metric's event type. */
export function isFollowUpTarget(
  target: FollowUpTarget | null, petId: string, eventType: string,
): boolean {
  return Boolean(target) && target!.petId === petId && target!.eventType === eventType;
}

export function followUpIdempotencyKey(eventId: string): string {
  return `r8-web-observation-${eventId}`;
}

interface CaseDetailForFollowUp {
  case_id: string;
  pet_id: string;
  source_valid: boolean;
  reviews: Array<{ review_id: string }>;
}

export interface FollowUpResult {
  linked: boolean;
  message: string;
}

/** Append exactly one owner observation Review to the existing Case.
 *  A network/ack failure is reported honestly; the saved event stays saved. */
export async function linkFollowUpObservation(
  target: FollowUpTarget, eventId: string,
): Promise<FollowUpResult> {
  try {
    const detail = await api.get<CaseDetailForFollowUp>(
      `/pets/${target.petId}/life-change-cases/${target.caseId}`,
    );
    if (detail.pet_id !== target.petId || detail.case_id !== target.caseId) {
      return { linked: false, message: "档案身份与当前宠物不一致，本次记录未关联。" };
    }
    if (!detail.source_valid) {
      return { linked: false, message: "原始依据已变更，本次记录已保存但未关联；请先在档案中重新核对。" };
    }
    const latest = detail.reviews.at(-1)?.review_id ?? null;
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
      return { linked: false, message: "服务器未确认这条后续观察，记录已保存但未关联。" };
    }
    return { linked: true, message: "已把这条真实记录关联到生活观察档案。" };
  } catch {
    return {
      linked: false,
      message: "记录已保存，但关联核对未完成；可在档案页稍后重试，不会丢记录。",
    };
  }
}
