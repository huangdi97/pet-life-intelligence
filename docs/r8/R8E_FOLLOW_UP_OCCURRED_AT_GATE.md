# PLI R8E — Temporal causality of owner follow-up evidence

**Status:** Security and truth-preserving R8 follow-up hardening candidate. This is not a disease model or a verified animal behaviour detector.

## Verified source-level defect

`POST /pets/{pet_id}/life-change-cases/{case_id}/reviews` correctly required real, same-pet, same-metric, still-current source events; however, it previously compared only `event.recorded_at > case.computed_at`.

Under PLI's dual-time model, **when the event happened** (`occurred_at`) and **when it became known** (`recorded_at`) differ. A walk from last week recorded today is late historical data, **not** evidence of how the animal behaved *after* the review Case opened. This can falsely close the observation-feedback loop.

## Enforced rule

For each `RECORD_OBSERVATION` review source event:

- `event.pet_id == case.pet_id`; must be a current supported event of the Case's metric and source class (existing rule).
- `event.recorded_at > case.computed_at`; must have been entered after Case creation (existing rule).
- **`event.occurred_at > case.computed_at`**; must actually have happened after Case creation (new).
- **`event.occurred_at <= server_now`**; event in the future cannot act as observed feedback (new).
- All timestamps must be timezone-aware and compared as instants. An event failing these gates receives `422`; no Review is appended. A later report of an older event remains valid history and can inform historical projections but cannot masquerade as a new follow-up.
- Genuine, newer reported walking observations remain accepted through the same API and existing optimistic Review concurrency token.

## Evidence

New HTTP integration cases create an owner Case from real comparable events, then (a) backfill an older walk after Case creation and reject it as follow-up, (b) create a newer walk and accept it, and (c) reject a future-dated walk even if entered now. The original event remains available as historical data and no model-generated evidence is used.

## Limits and next gates

The current cutoff is creation-time, not necessarily when the owner first viewed the card. This is conservative. A cross-source duplicate, compromised clock, or incorrect manual date can still create misleading evidence and requires later review/attestation. Real Android owner interaction screenshots, medical privacy, individual 3D approval and `HUMAN_VISUAL_ACCEPTANCE = PENDING` remain separate gates. No merge, release, tag or visual-baseline promotion; `NO_VISION_MODEL_USED = TRUE`.
