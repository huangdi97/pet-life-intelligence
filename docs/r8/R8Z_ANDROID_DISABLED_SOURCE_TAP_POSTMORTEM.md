# R8Z Android native evidence failure · 2026-10-14

## Exact-HEAD diagnosis
- Repo: `huangdi97/pet-life-intelligence`. Failing HEAD `243f11ef917e4acda7a3c21a60d43a4724f42a51`; [Android run 38507571874](https://github.com/huangdi97/pet-life-intelligence/actions/runs/38507571874).
- The debug APK and Web artifact built successfully; `Capture real Android runtime evidence` failed in `capture_r8_owner_review`, expecting `pli.r8.owner-review.evidence`.
- The saved diagnostics artifact `11868647884` contains `case-ui.xml` with `pli.r8.owner-review.sources` **resource-id present / clickable=true / enabled=false**, coordinates [88,645][376,766]. The harness used string presence alone then fired `adb input tap`, which **cannot activate a disabled React Native control**.
- The later `source-ui.xml` has owner Review scrolled ABOVE the viewport; the old retry loop always swiped upward, further obscuring the source rows. This is not evidence of missing Case, missing real event IDs, successful native expansion or 3D failure.
- The Case persisted and cited actual seeded LifeEvent IDs. The observed failure was an **actionable-control precondition + scroll direction** regression. UI should also communicate its loading/disabled state.

## Implemented remediation
1. Extract a testable `ui_has_actionable_control` based on actual UIAutomator `enabled=true` **AND** `clickable=true`; wait boundedly while an exposed target is disabled, without scrolling it offscreen.
2. Scroll **back toward** the owner Review while searching for the expanded source rows, rather than running away in one direction.
3. Keep the mandatory `len(all planted immutable event ids)` native accessibility scan; no API-only success, artificial screenshots, longer blind sleeps or acceptance lowering.
4. Owner-facing control now shows an explicit “正在读取原始记录…” message and visibly dims while disabled, with a dedicated evidence error testID.
5. Regression covers the exact disabled-node semantics plus full-source proof rules.

## Release gate
At the **new exact HEAD**, require CI (Ruff/pytest/Frontend/Blind UI), Android APK, real hosted-emulator R8 review capture, **all actual full source IDs from visible native XML**, real FOLLOW_UP_LATER acknowledgement, QuickLog-linked RECORD_OBSERVATION, independent later-pet sanity and no stale cross-pet state. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Do not merge PR #2, tag, release or bless the visual baseline.
