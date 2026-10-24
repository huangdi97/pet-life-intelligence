# R7 · Android real-interaction dual-time Life Replay evidence

**Status:** automated runtime gate added to existing R5.6 hosted Android emulator capture. Do not call this a PASS until the exact latest HEAD's Android runtime evidence job succeeds.

## Why

The R5.6 capture collected a Life View screenshot but never selected a specific historical date or switched between **现有记录** and **当时所知**. Source-only tests proved wiring but not real Android reachability and response rendering.

## Mechanism

1. Authenticated demo-only CI test seeds one actual `daily.walk` LifeEvent *today* whose `occurred_at` is noon three local calendar days ago. The post is performed via the ordinary live API, not a fake screenshot or injected front-end fixture.
2. `/life-replay` with owner-local explicit day bounds is queried twice: the backfilled event MUST exist in `verified_now`, and MUST NOT exist in `as_known_then`. The event and comparison IDs are written to `r7-life-replay/api-truth.json`.
3. DEMO-only navigation `pli-demo://nav?screen=lifeview&pet=...&date=...` uses the real React Navigation LifeView route date. Production builds do not enter the demo session.
4. The native scroll surface is actually swiped via ADB and UIAutomator XML must expose the R7 perspective chips. The test waits until real server-returned truth notes are rendered, freezes screenshot `verified-now.png`, taps the **当时所知** control, verifies the distinct server note and captures `as-known-then.png`.
5. Associated XML and summaries are emitted under the existing same-HEAD Android evidence artifact. A wrong pet, missing controls, an API replay disagreement, stale response or unreachable UI MUST fail the artifact job.
6. No vision or OCR model is used and the generated screenshot does NOT authorize `HUMAN_VISUAL_ACCEPTANCE = ACCEPTED`.

## Known remaining gates

- Capture must pass on the exact latest HEAD's Android evidence job. A script's successful static test is insufficient.
- The selected demo day is three days old; DST-transition-specific Android evidence, same-pet photo/twin version changes, back button UX, and physical handset review remain separate.
- The Android debug APK is an installable debug-signed package, not a Play Store signing/release claim.
- Do not merge PR #2, update visual baselines, publish a Release, or treat demo subject imagery as individually reconstructed 3D.
