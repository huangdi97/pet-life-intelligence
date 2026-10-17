/** R8AK Case history transport: bounded pages, identity-checked sources.
 *
 * The server is authoritative for what an owner may read. These helpers only
 * shape requests and reject a response whose pet/Case identity does not match
 * the request that produced it, so an A→B→A switch cannot paint B's history on
 * A's screen.
 */
import { api } from "../../api";
import type { LifeChangeCaseSummary } from "./ownerCaseHistory";

export type CaseDecision =
  | "FOLLOW_UP_LATER"
  | "NOT_RELEVANT"
  | "CORRECT_SOURCE";

export interface CaseSourceEvent {
  event_id: string;
  pet_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  source_type: string;
  payload: Record<string, unknown>;
  artifact_ids: string[];
  retracted_at: string | null;
  supersedes_event_id?: string | null;
  role: "CURRENT" | "HISTORICAL" | null;
  role_source: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
  scope: "CASE_EVIDENCE" | "FOLLOW_UP_REVIEW";
  valid: boolean;
}

export interface CaseSourcePage {
  case_id: string;
  pet_id: string;
  scope: "CASE_EVIDENCE" | "FOLLOW_UP_REVIEW";
  review_id: string | null;
  sources: CaseSourceEvent[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
  missing_event_ids: string[];
}

export interface CaseHistoryPage {
  cases: LifeChangeCaseSummary[];
  next_cursor: string | null;
  has_more: boolean;
  total: number;
}

export interface CaseHistoryQuery {
  limit?: number;
  cursor?: string | null;
  metric?: string | null;
  q?: string | null;
}

export interface CaseReviewAck {
  review_id: string;
  case_id: string;
  pet_id: string;
  decision: string;
  replayed: boolean;
}

export async function listCaseHistory(
  petId: string, query: CaseHistoryQuery,
): Promise<CaseHistoryPage> {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 10));
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.metric) params.set("metric", query.metric);
  if (query.q?.trim()) params.set("q", query.q.trim());
  const page = await api.get<CaseHistoryPage>(
    `/pets/${petId}/life-change-cases?${params.toString()}`,
  );
  // Never paint another pet's immutable Cases, even after a stale response.
  if (page.cases.some((item) => item.pet_id !== petId)) {
    throw new Error("HISTORY_PET_MISMATCH");
  }
  return page;
}

export async function listCaseSources(
  petId: string, caseId: string, offset: number, limit: number,
  reviewId?: string,
): Promise<CaseSourcePage> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (reviewId) params.set("review_id", reviewId);
  const page = await api.get<CaseSourcePage>(
    `/pets/${petId}/life-change-cases/${caseId}/sources?${params.toString()}`,
  );
  if (page.pet_id !== petId || page.case_id !== caseId) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (page.sources.some((item) => item.pet_id !== petId)) {
    throw new Error("SOURCE_PET_MISMATCH");
  }
  return page;
}

/** Continue reviewing an OLD Case: the server still enforces owner role,
 * source validity and the latest-review compare-and-swap token. */
export async function continueCaseReview(
  petId: string, caseId: string, decision: CaseDecision, latestReviewId: string | null,
): Promise<CaseReviewAck> {
  const ack = await api.post<CaseReviewAck>(
    `/pets/${petId}/life-change-cases/${caseId}/reviews`,
    {
      decision,
      expected_latest_review_id: latestReviewId,
      // One immutable human instruction per (Case, decision, predecessor).
      idempotency_key: `r8-detail-${decision}-${latestReviewId ?? "initial"}`,
    },
  );
  if (ack.pet_id !== petId || ack.case_id !== caseId || ack.decision !== decision) {
    throw new Error("REVIEW_ACK_MISMATCH");
  }
  return ack;
}
