# PLI R8H · Owner Review acknowledgement and exact replay identity gate

**Status:** Android client source fix on existing PR #2. No change to server decision rules, no new human action automation, no merge or visual-baseline promotion.

## Reproduced source-contract risk

The R8G Android owner-review panel preserved an in-memory Case+decision+optimistic predecessor+idempotency key when a POST or follow-up GET failed. It did not, however, check the immutable Review ID that POST actually returned. If a successful POST was followed by a stale but correctly scoped GET Case detail, `updated.pet_id` and `updated.case_id` matched; the panel then cleared its pending intent and displayed `已记录` even though its GET did not yet contain that Review. Replaying a subsequent human choice could then use the wrong optimistic predecessor.

## R8H safety contract

- The POST result is typed as `ReviewAcknowledgement` with `review_id`, `case_id`, `pet_id`, `decision`; all fields must match the actual owner instruction.
- GET must contain **that exact immutable Review ID and decision**, not merely the same Case and pet.
- Until that confirmation is visible, the original `pendingReview` stays held, with its original idempotency key and expected predecessor. The owner sees a clear Chinese "pending confirmation; retry the same decision" message instead of an unsupported success claim.
- Definitive client/permission/conflict rejections continue to clear the pending request; ambiguous network and stale-data states do not. A retry is an explicit user action, never background automation.
- The server's idempotency + immutable review sequence remains authoritative. This is a client acceptance guard, **not** proof that every network failure can be recovered without a later explicit re-query.

## Gates

Exact-HEAD TypeScript, blind source contracts, backend idempotency tests, real Android R8 owner review capture and full GitHub CI. A forced stale-GET / timed-out-POST physical-device fault-injection test is a separate follow-up gate. App-restart persistence of unconfirmed human intent is also separate.

`NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`; no owner review is auto-created or rewritten.

## R8H Android real-screenshot pet-tab avatar sizing (follow-on)

The previously green `41b9ce3c` real Today screenshot showed the third bottom navigation pet avatar as an almost blank sage circle. Source diagnosis: `PetAvatar` constrains the parent to ~28dp while `PetMedia variant="square"` paints a 120dp frame with a 96dp fallback dog/cat glyph; clipping removes the subject. Introduce an optional exact `compactSize` only for avatar usage, scaling both the image frame and honest species fallback within the tab bounds. Other portrait/hero/timeline media variants retain their current dimensions. This addresses a demonstrated visual problem, but **a new current-HEAD emulator screenshot is required** before declaring the tab icon visibly fixed. Source-based blind tests do not replace pixel evidence or the owner's final review.
