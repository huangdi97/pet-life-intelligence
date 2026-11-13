# PLI R8AZ · Android Case history async scope protection

## Actual repository difference

R8AY finished Web and Mini pagination guards, but Android `LifeChangeHistoryScreen` still displayed cached `rows` and `total` on the first render after a pet/filter change, before `useEffect` could clear them. A read started before a pet switch could complete after the route had changed; navigation may keep a stack screen mounted. A fast double-click of "继续查看更早的档案" could also dispatch multiple requests before React committed loading state. These are identity/presentation correctness issues, not missing DB authorization.

## Implemented Android safeguards

- Synchronous render key = selected pet + route pet + metric + trimmed query + source validity. The previous scope's rows, total, pagination button, error, and cursor disappear **on the first frame** of a change.
- A generation guard invalidates **all** old first-page and pagination responses on every dependency change and cleanup. The request still calls the real server `listCaseHistory`, which rejects cross-pet responses.
- `moreInFlight` protects the same cursor from double-clicks while React has not yet re-rendered.
- Pet mismatch abandons requests and clears local state. No old Case can be reopened by a late response.
- Errors retain the existing honest retry UX: no fabricated empty results, and no cross-pet cached data.

## Evidence and limits

Added `tests/blind_ui/test_r8az_android_history_scope.py` as a deterministic source/architecture regression. **This test is not an Android network-race runtime proof.** Require exact-new-HEAD CI, Android runtime evidence, and a dedicated delayed-response native test before marking the latency race `RUNTIME_PASS`. Existing real A→B→A Today evidence does not exercise this history pagination. No new device APIs, visual baseline, 3D or case-truth changes.

`HUMAN_VISUAL_ACCEPTANCE=PENDING`, `NO_VISION_MODEL_USED=TRUE`, PR #2 remains OPEN; never merge, tag, release, or promote a screenshot baseline without owner instruction.

## R8AZ-R2: native real filter transition coverage

The existing `capture-android-final.py` journey already opens a real persisted Case's history before the source is withdrawn. It now checks the same Case through the live `VALID` and `INVALID` server filters, taps the **real Android** INVALID chip, waits for settled UI without the Case, taps VALID, and requires the immutable Case to reappear. The evidence artifact contains `case-history-r8az-invalid.xml/png`, `case-history-r8az-valid.xml/png`, and `case-history-r8az-filter-truth.json`. This must remain **PENDING** until same-HEAD Android hosted execution passes. It demonstrates filter correctness after requests settle; because a 0.7-second UIAutomator polling test cannot prove the first rendered frame in a deliberately delayed request, the source-scope guard is a separate gate and `first_frame_async_race_runtime = NOT_MEASURED_BY_THIS_TEST` is explicitly recorded.

## R8AZ-R3: earliest available native transition samples (not a first-frame proof)

The capture now saves UIAutomator XML + PNG **immediately after** tapping both native validity chips, before 0.7-second settled-state polling. The manifest reports whether the old Case was visible at that first accessible sample. UIAutomator collection is asynchronous and no network latency was injected; the artifact explicitly says this sample is **not** the first composited frame and retains `first_frame_async_race_runtime = NOT_MEASURED_BY_THIS_TEST`. This makes possible visual staleness observable without fabricating a strict race PASS. A deterministic delayed-response test is still required to close the first-frame gate.
