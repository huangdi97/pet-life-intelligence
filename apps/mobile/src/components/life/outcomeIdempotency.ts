/** Build a bounded, deterministic idempotency key for R8BX Outcome writes.
 *
 * Backend OutcomeCreate intentionally caps idempotency_key at 96 chars.
 * Three raw UUIDs plus the assessment exceed that contract, so keep the two
 * concurrency anchors lossless and include an 88-bit prefix of the prior
 * Outcome identity. The server still verifies the complete request body on
 * replay, so a theoretical prefix collision fails closed as a conflict.
 */
export type OutcomeIdempotencyAssessment =
  | "CONTINUE_OBSERVING"
  | "NO_LONGER_CONCERNED"
  | "NEEDS_FURTHER_FOLLOW_UP";

const ASSESSMENT_CODE: Record<OutcomeIdempotencyAssessment, string> = {
  CONTINUE_OBSERVING: "co",
  NO_LONGER_CONCERNED: "nc",
  NEEDS_FURTHER_FOLLOW_UP: "ff",
};

function compactUuid(value: string): string {
  return value.replace(/-/g, "").toLowerCase();
}

export function buildOutcomeIdempotencyKey(
  observationReviewId: string,
  latestReviewId: string,
  assessment: OutcomeIdempotencyAssessment,
  latestOutcomeId: string | null,
): string {
  const observation = compactUuid(observationReviewId);
  const reviewHead = compactUuid(latestReviewId);
  const priorOutcome = latestOutcomeId
    ? compactUuid(latestOutcomeId).slice(0, 22)
    : "initial";
  const key = `r8x-${ASSESSMENT_CODE[assessment]}-${observation}-${reviewHead}-${priorOutcome}`;
  if (key.length > 96) {
    throw new Error("OUTCOME_IDEMPOTENCY_KEY_TOO_LONG");
  }
  return key;
}
