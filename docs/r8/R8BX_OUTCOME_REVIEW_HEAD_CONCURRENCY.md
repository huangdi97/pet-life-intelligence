# PLI R8BX · Owner Outcome Review-Head Concurrency Gate

## Gap

R8BV/R8BW prove that an Outcome is anchored to a real follow-up observation and
that later source withdrawal invalidates its current evidentiary support.

A remaining race existed between those facts: while one Android screen was
open, another owner action could append a newer Case Review. The stale screen
could still POST an Outcome against the older journal snapshot because Outcome
CAS previously guarded only the Outcome chain.

## Invariant

An Outcome must freeze two distinct identities:

- `observation_review_id`: which real follow-up observation the owner is
  assessing;
- `case_review_head_id`: the latest append-only Review the owner had actually
  seen when submitting that assessment.

The write request carries `expected_latest_review_id`. Under the Case row lock,
the server reads the current Review head and rejects the Outcome with conflict
when those IDs differ.

This does **not** require the assessed observation itself to be the newest
Review. A later `FOLLOW_UP_LATER` decision may exist; after refresh, the owner
can still explicitly assess the earlier real observation. What is forbidden is
silently writing from an obsolete screen snapshot.

## Replay and audit

`case_review_head_id` is persisted on the immutable Outcome. An idempotency
replay must match the same observation, assessment, note, prior Outcome and
frozen Review head. Audit detail includes both the assessed observation Review
and the frozen Case Review head.

## Android

The Case detail passes its current `latest_review_id` into the Outcome action.
The transport includes it in the request and also verifies that the server ACK
returns the same `case_review_head_id`. A stale A→new Review race therefore
refreshes/fails rather than painting an accepted Outcome locally.

Hosted Android evidence records `case_review_head_id` in
`case-outcome-truth.json`.

`NO_VISION_MODEL_USED = TRUE`.
`HUMAN_VISUAL_ACCEPTANCE = PENDING`.
PR #2 stays open; no merge, tag, Release or visual-baseline promotion.
