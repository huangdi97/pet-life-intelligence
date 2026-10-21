# PLI R8BJ — Follow-up numeric real Android evidence fix

## Observed failure (2026-10-21, HEAD 5e818feb)

GitHub Actions run 39585588561 (Android runtime evidence) failed, although CI, APK build and OpenAPI passed. In the downloadable runtime diagnostics `followup-source-observation-ui.xml`, Android opened the correct Review and actual event ID, but the source row displayed:

> 后续观察 · 时长未记录或无有效值，不能按零分钟计算

This was correct UI for the event's missing `duration_minutes`, NOT a fabricated numeric failure. QuickLog intentionally allows a two-tap `daily.walk` without a timed duration. The old R8BJ capture fixture simply tapped Save and later required a measured source amount. That was a test-fixture mismatch.

## Fix, without changing the user product contract

- Add the stable native `pli.quicklog.minutes` identifier to the existing optional minute TextInput; no default duration or extra form requirement.
- The Android numeric-value evidence scenario **actually taps** that field and **types 17 minutes** in the real emulator before Save; the UIAutomator text must match.
- After saving, the original API `/events/{event_id}` must carry that exact `duration_minutes: 17` on the real Review-linked event for the same pet. The follow-up Review source XML must independently display `记录时长 17 分钟`, the full event ID, and occurred/recorded timestamps.
- Keep the evidence as distinct channels: a UI tap, saved API fact, and rendered native XML. Never use server injection to satisfy a native input check, infer missing duration as zero, borrow a Case's source role, or call a numeric sample valid if it was absent.
- Keep all prior R8 owner review, FHIR-like provenance, data privacy, correction history, and visual constraints. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## Acceptance

Run full CI and Android + Release Artifacts at the exact new branch HEAD. Android `capture_r8_owner_review` must now pass through this source row and continue to whole Case history, secondary pet selection and 3D manifest gates. Real phone visual signoff is still separate. Do not merge PR #2, push main, tag, release or promote a visual baseline.
