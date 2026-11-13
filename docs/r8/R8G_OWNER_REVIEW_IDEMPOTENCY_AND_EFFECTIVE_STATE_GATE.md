# PLI R8G · Owner review idempotency and effective-state consistency

**Scope:** narrow server correction at PR #2; no new inference, diagnosis, automatic decision or visual baseline promotion.

## Verified source-level inconsistencies

1. `GET /life-change-cases` and `GET /life-change-cases/{id}` derive a Case's `FOLLOW_UP_EVIDENCE_INVALIDATED` state after a follow-up LifeEvent is retracted or superseded, preserving the stored `FOLLOW_UP` and owner Review history. However, the idempotent `POST /life-change-cases` path returned `_case_response(existing, ...)` without loading the latest accepted Review, so retrying an unchanged Case silently reported the old stored status. A client could therefore display a stale completed follow-up immediately after replaying the existing Case.
2. The `POST .../reviews` idempotency-key lookup reused the old owner Review **regardless of the new decision and note**, allowing an identical key to quietly resolve contradictory owner actions to a different persisted intention.

## Implementation

- On a Case's fingerprint-replay path, read the latest append-only `RECORD_OBSERVATION` and derive `follow_up_source_valid` using the same current-source checker as list/detail. Return computed `state` alongside immutable `recorded_state`; no write occurs.
- For a previously used Review idempotency key, return the original Review only when the entire human instruction is the same (decision, private note, related source IDs as a set, related task ID, and previous-review concurrency token). A changed request is `409`, not silently substituted. Real unchanged network retries remain `201` with `replayed=true`. The actual review remains append-only.

## Evidence and non-goals

HTTP regression builds a real sourced Case, appends a real follow-up observation, withdraws it, and checks that repeat POST Case, list and detail agree on `FOLLOW_UP_EVIDENCE_INVALIDATED`. A second test proves same-key/same-body retries return the same Review ID, while modified decisions, notes and prior-review tokens conflict and do not append anything.

No changes to Android visual baseline, R8 metrics, medical data, or pet identity. Same-HEAD Backend, CI, Android and runtime evidence must still be checked after the commit. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## R8G Android ambiguity-safe owner decisions

The Android Today Review panel previously submitted Review decisions with no idempotency key. If the server committed but the 15-second mobile request timed out before the response, a retry fetched a new latest Review token and could append a second human action. The panel now remembers one **pending Case+decision+original optimistic predecessor** and reuses a stable server-scoped key on retries. A different decision while the prior outcome is uncertain is blocked with a Chinese owner-facing explanation. Once POST and the source-scoped GET both succeed, the pending instruction clears; definitive 4xx conflicts also clear it. Network/5xx ambiguity preserves the original key instead of issuing a new human action. No automated owner choice or background retry has been introduced. In-memory intent survives the immediate retry; persistence across app restart and on-device timeout injection remain subsequent acceptance gates.
