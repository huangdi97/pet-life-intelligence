# R8D · Android 3D lifecycle / second-pet runtime-manifest gate

2026-10-12. Branch `feat/r2p3d-r3-render-truth-ui-closure`. PR #2 OPEN, no merge.

## Observed failure, not a visual-pass claim

At code HEAD `1a47ef2ced8615a6959e2b13a3c7c457a87f8c06`, full CI, browser E2E and Android APK build passed. Android runtime evidence run [38235554965](https://github.com/huangdi97/pet-life-intelligence/actions/runs/38235554965) **failed** after real Today, Twin Review, R7 and R8 flows: the secondary pet `today` stage yielded **no acceptable rigged RUNTIME 3D manifest** within the mandatory check. The error was at `capture-android-final.py:1140`; it was not the initial primary Today view. Earlier boot-time adb-offline and SDK snapshot warnings were transient and cannot substitute for explaining the late failure.

## Identified reproducible lifecycle hazard

`App.tsx/applyDemoNav` scheduled **10 root navigation resets for every single deep link**, even when the NavigationContainer was already ready. The repeated resets can unmount/recreate the WebView containing the actual 3D scene, racing the RN→WebView→FileSystem runtime-manifest channel. This is a grounded source defect and plausible cause of the secondary manifest loss; the failed run alone does not prove it was the sole cause.

## Change

Make `navigateToDemoScreen` return a boolean indicating that the reset was actually dispatched, then retry only while navigation is not ready. Stop immediately after the first successful reset and keep the generation counter that cancels stale links. Bound bootstrap retries to 20 × 400 ms. DEMO only; production navigation is unchanged.

## Mandatory remaining gates

1. On new exact HEAD: Backend, Frontend, Blind Contract, Playwright.
2. Android hosted emulator full sweep must still require RUNTIME/rigged/PBR/identity metadata for **both** pet IDs; no fabricated/synthetic manifest; no weakening `_is_product_manifest`.
3. Keep primary and secondary Twin Review real yaw/side/back screenshots distinct; R7 late-backfill two-time views; R8 owner review→QuickLog screenshot chain.
4. Require a same-HEAD Android evidence artifact and inspect its screenshots, manifest JSON, pet IDs and provenance.
5. If failure persists, collect UI hierarchy, same-pet 3D status and per-WebView diagnostics; report BLOCKED rather than self-certifying 3D.
6. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No tag, release, merge or baseline promotion.
