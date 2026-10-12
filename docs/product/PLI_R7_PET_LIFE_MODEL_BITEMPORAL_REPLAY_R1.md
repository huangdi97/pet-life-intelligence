# PLI R7-R1 · Pet Life Model / Bitemporal Life Replay

**Status:** first **read-only, event-backed** slice; not a complete Pet Life Model or digital animal consciousness; not diagnosis; not an actual historic twin reconstruction. Based on current repository `LifeEvent` schema. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. PR #2 remains open.

## Why this exists

The product distinction is not another activity dashboard. A pet has a continuous, accountable history. An owner should be able to answer: **what happened then; what did we know then; what has since been corrected; where did this record come from?** A photo, individual appearance model and AI explanation must point to actual historical evidence before being presented as historical truth.

### Conceptual references, not compliance claims

- Martin Fowler, *Bitemporal History* (2021), https://martinfowler.com/articles/bitemporal-history.html : distinguish actual-time from record-time.
- HL7 FHIR R5 *Provenance*, https://hl7.org/fhir/provenance.html : source, agent and entity linkage govern trust. PLI does **not** claim FHIR interoperability or FHIR conformance from this design.
- Existing PLI fields: `occurred_at`, `recorded_at`, `source_type`, `provenance_level`, `actor_id`, `source_ref`, `artifact_ids`, `supersedes_event_id`, `retracted_at`.

## Implemented first slice

`GET /api/v1/pets/{pet_id}/life-replay?date=YYYY-MM-DD&perspective=verified_now|as_known_then`

- **verified_now (现在已核实的记录):** includes late historical entries with original occurred dates, but hides later retracted/superseded versions.
- **as_known_then (当时所知):** only events recorded before that day's end, preserving what was knowable then, not rewriting the past with late entries.
- Every event remains a source-labelled `LifeEvent`; no mood, health, disease or pain conclusion inferred. Daily counts include observed/reported/professionally sourced facts, not AI/SYSTEM aggregation.
- A correction on another calendar day can suppress the older version on its original day. Revisions, including corrections of corrections, are followed with a bounded explicit guard (if too deep => fail, not false success).
- Pet permission: existing `DAILY_READ` and per-pet ID before selecting events; unrelated pet records are excluded; no new autonomous actions or storage mutation; `GET` is side-effect free.
- Local date uses legacy `UTC+08:00` product fallback for compatibility with `/today`. **Not** a fully implemented user-configurable pet timezone. Retroactive edits to recorded timestamps are outside this first slice.
- Historical Twin manifest/source validity remains handled by the existing visual history stack. This endpoint does not extrapolate a current 3D model into a historical image.

## Non-goals / future gates

1. Atomically versioned physical measurements and exact per-device timezone/DST semantics (requires migration and explicit API contract).
2. Full append-only correction authoring UX, validation that a superseded id belongs to the pet, non-cyclic chain and permission checks; pure projection supports existing persisted relationships, but no new correction-write interface is created here.
3. Cross-domain clinical claims, causal AI explanation and automatic medical decisions: **not authorized**.
4. Native Android/Web/Mini dual-perspective UI and generated narrative summaries: follow-up implementation; until a client consumes this endpoint, label this server-side substrate only.
5. Real user media, individually confirmed 3D reconstruction, native device screenshots and owner acceptance remain separately gated.
6. Keep `HUMAN_VISUAL_ACCEPTANCE = PENDING`, `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET` until evidence changes.

## Next R7 implementation gates

A. Backend: unit + integration PASS, OpenAPI deterministic sync, security & idempotency not weakened. B. Android: historical Life View consumes `life-replay` and allows comparison of both perspectives, while every shown fact retains source/time. C. Historical media: original artifact identities and permissions; no synthetic thumbnail replacing missing evidence. D. Explainable signals: compare recorded personal baseline over aligned clock windows with explicit sample count, missingness, thresholds and uncertainty; no disease inference. E. Owner review of real device before declaring UI visually accepted.

## Android integration (R7-R2)

Android LifeView date scope now calls the R7 endpoint with a source-preserving selector `现有记录 / 当时所知`. The fetch result is bound to pet ID, selected day and knowledge perspective; late responses cannot render another pet's facts. Web/Mini still use the legacy date route; no parity claim is made until their independent evidence. Physical-device and visual gates remain PENDING.
