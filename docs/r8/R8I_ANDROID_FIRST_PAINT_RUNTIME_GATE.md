# PLI R8I · Android first-paint truth gate · 2026-10-13

**PR #2 only.** No merge, tag, Release or visual baseline promotion. `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## Actual failure concealed by earlier SUCCESS

The exact `9c42fa582c2b0f522e22a51b1c483568485ce840` Android Actions run `38291822033` succeeded and published RUNTIME manifests. We downloaded the **same-run** artifact `11767338043` and inspected its real screenshot `android/today/today.png` plus `android/today/ui.xml`:

- Manifest: RUNTIME / rigged / owner pet scoped and ready.
- XML: contained `resource-id="pli.today.pet-boot-fallback"`.
- Screenshot: the warm stage still showed an illustrated species glyph, while the later R8 owner-review screenshots on the same build displayed the stylized 3D dog.
- Pet and LifeView initial screenshots likewise had `.pet-boot-fallback`, and Companion contained `pli.pet.pet-boot-fallback`.

Thus the previous CI's screenshot / runtime-manifest combination proved a working loading state, **not** a visible settled 3D owner stage. The honest fallback is useful at startup but must never be mistaken for 3D acceptance.

## Implemented capture contract

1. As before: navigate to the exact screen; require its exact UI root; validate its matching pet/stage-specific RUNTIME 3D manifest.
2. New: repeatedly dump the actual Android accessibility hierarchy after manifest readiness for Today / Pet / Life View / Companion, and require **two consecutive dumps** containing the expected page root and **no pet-boot-fallback** node.
3. Preserve `first-paint-pending.png` if the overlay was observed. On failed settling, preserve `first-paint-failed.png`, UI XML and a bounded observation trace, then **FAIL** with `BLOCKED_BY_FIRST_PAINT`. Never silently increase fixed capture sleeps or substitute the original glyph as a 3D success.
4. Success writes `first-paint-gate.json` with `RN_FALLBACK_CLEARED`, actual trace and `pixel_level_3d_acceptance=NOT_ASSERTED`. The final screenshot/Android layout extraction runs **after** the gate.
5. Review camera frames continue using their dedicated pixel-distinctness test. The new RN-overlay gate is NOT proof that arbitrary WebGL pixels are photorealistic; actual pet likeness remains an owner/asset requirement.

## Next product work after latest-HEAD evidence

- Compare new same-HEAD settled Today/Pet/Life View screenshots to the Living Editorial R6 reference. Do not call a stylized generic demo GLB a real personalized Twin.
- Keep the R8 owner-review's exact-case-and-review acknowledgement, including ambiguous POST retry, pet scope and non-diagnostic evidence.
- App-restart persistence of unresolved human review intent is still a distinct R8J gate; no automatic owner decision, diagnosis or synthesized observation is authorized.
- Same HEAD: CI, Android build, actual emulator screenshot evidence, five tabs, multi-pet switches and source-labelled R8 reviewer workflow. Human Visual Acceptance remains PENDING.
