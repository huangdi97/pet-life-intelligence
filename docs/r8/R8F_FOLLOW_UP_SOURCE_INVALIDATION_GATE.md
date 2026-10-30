# PLI R8F — Follow-up source invalidation and owner review integrity

**Status:** code-level candidate awaiting exact-HEAD CI and real Android verification. PR #2 stays OPEN; no merge, baseline promotion, tag or release. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## Confirmed source-level gap

Case `source_valid` checked only frozen current + historical evidence from the original Case. If an owner later submitted a genuine new `RECORD_OBSERVATION` and subsequently withdrew or corrected that follow-up event, the Case continued displaying stored `FOLLOW_UP` with no notice that the follow-up evidence ceased to be current. This misrepresents the provenance-dependent feedback loop even though owner review history correctly remains append-only.

## Implemented narrow fix

- Maintain independent states: initial `source_valid` continues to validate the original Case's frozen evidence. New `follow_up_source_valid` validates the **latest accepted RECORD_OBSERVATION** and is `null` for a Case that never received a recorded observation.
- Each GET Case Review includes a derived `related_sources_valid` flag for `RECORD_OBSERVATION`, `null` for other decisions. It rechecks event pet, metric, allowed source, retraction and supersession and original recorded/occurred-after-Case time gate. It never rewrites existing Review rows.
- When the original Case is valid, the stored Case state is FOLLOW_UP, and the latest observation is no longer valid, the computed `state` is `FOLLOW_UP_EVIDENCE_INVALIDATED`; the `recorded_state` remains FOLLOW_UP and review history remains intact.
- The List and Detail endpoints share the same derived status; neither claims an invalid source is still active. A human FOLLOW_UP_LATER without an observation remains normal FOLLOW_UP and the new validity field is null.
- A valid newer observation on an append-only Review can later close this invalidation; an unverified retrospective entry cannot masquerade as a post-Case observation.
- No diagnosis, automatic health conclusion, automatic task or notification; new fields are evidence provenance facts, not animal-health claims.

## Regression

HTTP integration tests: one real changed pet Case, real post-Case owner observation and Review, retract only the follow-up event, verify source_valid remains true but effective state invalidates in both list and detail, and original Review ID, note and stored state remain unchanged. Verify FOLLOW_UP_LATER alone is not falsely marked invalidated.

## Deliberately open

Android must display the new effective state and avoid prompting a stale Case as normal FOLLOW_UP, then obtain same-HEAD emulator proof. Privacy and follow-up timestamps remain as enforced in R8D/R8E. Actor/date-policy and revised current evidence refresh remain separate gates.

## R8F Android owner experience

The Android Today LifeChangeReviewPanel now distinguishes a saved owner decision from valid follow-up observation evidence. When the API returns `FOLLOW_UP_EVIDENCE_INVALIDATED`, an explicit warm warning appears: the old feedback remains preserved, its cited observation has since been withdrawn/corrected, and a new real observation is required before concluding anything. Existing `补充真实观察` QuickLog stays reachable. This is only source/UI wiring until exact-HEAD runtime and human visual gates succeed.

## R8F owner navigation refresh

Android Today now refetches current pet-scoped Today, baseline hint and Review list when its screen regains focus after QuickLog/other owner flows. The first focus is already served by initial `petId` fetching; it is not needlessly double-loaded. This prevents a successfully recorded post-Case observation (or correction/retraction made in another screen) from leaving the old explanatory Review visible until app restart. The 3D/WebView bootstrap identity key is untouched; true on-device behavior still requires same-HEAD Android runtime evidence.

## R8F Android decision visible-state gate — 2026-10-13

Exact HEAD `37e99f1a` failed the Android R8 owner-review capture despite API `POST /reviews` returning 201. The failed artifact `11752159857` contains `r8-owner-review/later-ui.xml`: the source evidence panel was still expanded, and its six rows pushed the existing decision message (rendered after the action controls) below the viewport. The XML already showed `已有主人反馈` and the backend log showed the new Review, so the failure was **visibility of owner confirmation**, not evidence of a failed write.

This fix renders the human-readable decision confirmation in an explicit `pli.r8.owner-review.decision-status` region BEFORE the action row. The real emulator capture collapses the source disclosure after proving all immutable event IDs, taps `稍后关注`, requires a *visible* confirmation with that test ID, and separately checks the stored exact Review sequence `[FOLLOW_UP_LATER]` and later linked QuickLog `RECORD_OBSERVATION`. No screenshot threshold, source privacy, or real-tap gate is waived. Same-HEAD Android runtime and actual screenshot remain required; `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## R8F exact-HEAD backend gate: fixture-time correctness

The first CI attempt for `e59a1679` returned 501 passing and 2 failing backend tests, both old baseline fixtures unrelated to the R8F UI. The old time-travel test generated only `daily.drink` values across 30 days but required a Baseline even though supported `BASELINE_METRICS` only include meal/walk/sleep and the default window is 14 days. The old deterministic test depended on seeded Coco's scheduled 10:00 CST walk, which is **in the future** when GitHub executes shortly after 00:00 CST; current-truth projection correctly excludes that event. These test inputs now use supported, in-window, already-occurred real source LifeEvents and retain strict persisted value/sample assertions. **Production algorithms are unchanged**: unsupported metrics and future observations must not be counted just to satisfy fixtures. Re-run latest-HEAD CI/Android before claiming PASS.
