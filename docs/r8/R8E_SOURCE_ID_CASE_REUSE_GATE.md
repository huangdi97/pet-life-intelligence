# R8E — Evidence-identity matching for the owner Review card

## Source-level error

The Android `LifeChangeReviewPanel` looked up an existing Case by `petId`, metric, current_value and baseline_value, but the Case record actually freezes specific current and historical `LifeEvent` IDs. Two different days can coincidentally record exactly 20 minutes against a 90-minute baseline. Both Sets may remain valid concurrently. Reusing the previous Case under these circumstances routes today's owner's feedback to another day's evidence — even though every value on the card appears plausible.

## Invariant

- The R7 hint already returns `current_event_ids` and `historical_event_ids`, generated from sourced present/history data.
- Android now carries both collections into the R8 panel. Existing Case reuse requires **same active pet, metric, source_valid, numeric values AND exact immutable event-ID set**.
- Unavailable or empty source IDs must **never match an existing Case** by numbers alone. The owner can still choose the explicit "核对这次记录变化" action, which asks the server to construct an up-to-date Case.
- A new current/historical set changes the React panel key and its async load dependencies. Older source details/evidence rows do not remain visible just because the metric and summary values happen to match.
- Do not use a hash of rendered Chinese copy as source identity; IDs come from the event fabric.
- Existing R8C real-Android owner-review gate still verifies creation, evidence expansion, owner decision and real QuickLog feedback; no screenshots or visual baselines are auto-approved by this source guard.

## Negative scenario

Oct 12: record A = 20 minutes, personal baseline 90, owner Case C1 with evidence IDs [A,H1,H2,H3].
Oct 13: record B = 20 minutes, baseline also 90. Old numbers match C1, but source set [B,H1,H2,H3] does not. Android must offer a new Case for B and must not interpret a Review on C1 as acknowledgement of B.

**Status:** implementation candidate requiring exact-HEAD CI/TypeScript and current Android runtime. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No merge, tags, release or baseline promotion.
