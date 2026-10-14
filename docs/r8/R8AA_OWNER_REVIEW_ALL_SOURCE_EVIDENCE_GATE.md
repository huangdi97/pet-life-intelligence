# R8AA · 查看全部原始记录来源 · 2026-10-14

## Real current-HEAD evidence and defect
Current PR #2 HEAD `04df0036022046210e31065ed193def26ab112c9` had CI, Android APK/runtime, and OpenAPI sync SUCCESS. The archived real Android R8 source panel showed 5 immutable event rows, but implementation `LifeChangeReviewPanel.inspectEvidence()` fetched only `evidence_event_ids.slice(0, 8)` and for >8 said vaguely "时间线继续查看". It could not inspect the full Case source set in the owner-review panel. A source-backed claim is not adequately owner-reviewable if the Case cites a larger set than the UI offers.

## Change
- Keep case/source fingerprint, retry idempotency, SecureStore protection, all current owner review decisions, and human verification constraints unchanged.
- First expand loads a maximum of 8 actual GET `/events/{id}` responses; each new "继续查看余下 N 条来源" button loads the next maximum of 8 (not infinite concurrent requests). Never silently truncate after eight.
- Validate every API source's full immutable `event_id` and `pet_id` against the requested Case and active pet **before** accepting a batch. Identity mismatch fails closed and displays a retriable error.
- Keep the complete immutable event ID in each accessibility label and testID, while visual rows show concise Chinese type, actual date and reporter with an 8-character ID hint. Sort shown entries by real occurred timestamp for readability without rewriting their provenance.
- A transient network failure leaves previous valid rows readable, surfaces error and allows another explicit tap for the next batch.
- Preserve existing async generation and active pet/Case source-key checks; late responses cannot paint a different pet or replace source set.
- Executable Node test runs the actual TS pure paging/identity helper against 23 IDs, duplicate IDs, wrong pet/event, short batches and UI wiring. It is a logic gate, **not** real mobile visual acceptance.

## Gates
Exact-new-HEAD Frontend TypeScript, owner evidence Node regression, Blind UI source contract, Backend, Playwright, Android APK and hosted emulator R8 evidence. Existing real demo fixture only provides 5 sources, so a >8-source native scroll/tap scenario must be explicitly added before declaring runtime pagination complete. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`; `3D_ASSET_QUALITY=BLOCKED_BY_SOURCE_ASSET`. No PR merge, tags, Release or baseline update.

## R8AA native pagination gate added

Hosted Android now plants **11 real event IDs** (five historical same-clock dates × two events each, plus one current-day walk), forcing the owner Review Case to exceed eight sources. The capture navigates a real Android app, taps the native source expansion and the real `pli.r8.owner-review.sources.more` Pressable, tracks each full observed ID from raw native XML, and fails unless all planted IDs have appeared and at least one actual pagination tap occurred. The evidence archive records tap counts and the full native-observed ID set separately from API truth. CI/build success alone is not human visual acceptance.
