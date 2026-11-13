# R8C · Second-pet runtime WebView recovery and evidence gate

This is an evidence-based *repair candidate*, not a claim of already-passing device tests.

## Failure reproduced from exact previous HEAD

At `1a47ef2ced8615a6959e2b13a3c7c457a87f8c06`:
- Code CI SUCCESS; Android APK and Web standalone artifacts SUCCESS; hosted Android runtime evidence FAILED.
- Android workflow: `38235554965`, failing job `114765558947`, gate `Capture real Android runtime evidence`.
- Downloaded diagnostic artifact `11741322543`. The earlier pet had a valid `RUNTIME`, `rigged-glb-twin`, `stageRole=today`, `sourceMediaCount=0`, `individualIdentityEvidence=false` manifest. This remains a demo/stylized reference, **not** owner-confirmed individual 3D.
- The second pet ("咪咪") was correctly selected in the UI tree; the Today stage and Android WebView node existed, but `pli.today.pet-boot-fallback` remained and there was no second-pet 3D manifest before the capture timed out. The last saved `pli_diag.json` marker was `load-end` before second-pet checking; no second-pet ready evidence. This is a WebView bootstrap/lifecycle failure, not a pet-selection leak.
- The current script's secondary read used 10 iterations at 2 s, less than the bounded Android bridge remediation interval. Increasing a timeout **alone** is not the correction.

## Product and harness repair

1. The entire `Pet3DViewer` is remounted when its `pet id + stage + twin version + attempt` changes; its hook state/bridge handlers cannot linger across pet identities. A child's WebView `key` alone is insufficient because the React wrapper persisted.
2. Native WebView boot receives a bounded 22-second watchdog with at most two remount attempts. Status is owned by the exact view attempt; a previous pet's success cannot lift the boot fallback for the new pet. After two failed restarts, the UI uses the truthful photo/2.5D fallback and the rigged-runtime gate **must fail** rather than report a fake pass.
3. The same Android API/UIAutomator evidence flow saves `secondary_today_before_manifest.png` for debugging and waits up to 55 read attempts for an exact `petId`, `stageRole=today`, `RUNTIME`, `rigged-glb-twin` manifest. No thresholds, source identity or 3D fidelity rules are weakened.
4. Android runtime outcome and real three-view distinction must be checked again on the **new HEAD**; code tests and source guards cannot substitute for emulator evidence.

## Release boundary

No merge to main, no tag, no Release, no visual reference acceptance. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`, individual pet 3D source evidence still absent.

## R8D owner source-expansion gate root cause (run 38241236170)

The newer 1bde46f8 Android runtime failed at `R8 native raw-source expansion did not show real event identity`, **before reaching the second pet**. The diagnostic `raw-sources.png` and `source-ui.xml` explicitly showed the owner tapped and expanded the panel. A case had five source rows; the phone's first fold exposed only three rows, while the script immediately asserted the fourth, most recent seeded ID. This was a clipped accessibility viewport, NOT an absent source in the API. The fix keeps strict provenance: Android owner text becomes human-readable Chinese, each row exposes its **full immutable event ID** through accessibility labels/resource ids, and UIAutomator swipes until *all four* seeded full IDs were observed in the real native hierarchy. It saves both initial and completed source screenshots. No API-only substitute or weakened source assertion is allowed.
