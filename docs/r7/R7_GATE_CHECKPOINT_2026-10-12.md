# PLI R7 gate checkpoint · 2026-10-12

**Branch:** `feat/r2p3d-r3-render-truth-ui-closure`; PR #2 OPEN, no merge. No tag, Release, force push or visual baseline promotion.

## Commit and provenance boundary
- Product-code implementation: `30b1a8c8c895ca94c5c6ed4cd61b8bb5efb4980a`.
- Automatic OpenAPI artifact regeneration: `0878d84382aab4972c802025bc62b029ed9b3278` (only `docs/api/openapi.json` changed).
- The code-head CI run 38206829863 has Ruff / migration replay / pytest / Twin QA / Blind Visual Contract **PASS**, but its Backend job failed **OpenAPI artifact freshness** before the bot-generated artifact existed at that checkout. It is not a fully green run.
- A bot commit may show `action_required` without running product tests. This documentation checkpoint intentionally triggers new CI on an exact SHA that contains the regenerated OpenAPI file. Only its results may close the gate.

## Implemented R7 contract
1. `services/api/app/services/life_replay.py`: source-labelled bitemporal event projection, pet-scoped, excludes withdrawn and superseded current facts, keeps as-known historical knowledge.
2. `services/api/app/api/routes/events.py`: read-only `/life-replay`; Today shares the same current-truth projection. Explicit `day_start_at/day_end_at` respect 23/24/25-hour owner-local days; UTC+08 is only the legacy fallback.
3. `apps/mobile/src/screens/LifeViewScreen.tsx`: switch between 现有记录 and 当时所知; request isolated by pet/date/perspective. Historical Twin is not shown as past knowledge without record-time evidence. No fictional historical pose.
4. Unit, integration, and blind-source contract regression tests are present. A historical-replay UIAutomator screenshot at the new selector is **not yet collected** by the existing R5.6 runtime sweep.

## Exact-head follow-up
```powershell
git fetch origin --prune
git status -sb
git rev-parse HEAD
gh pr view 2 --repo huangdi97/pet-life-intelligence --json state,headRefOid,mergedAt
gh run list --repo huangdi97/pet-life-intelligence --branch feat/r2p3d-r3-render-truth-ui-closure --limit 12 --json workflowName,headSha,status,conclusion,url
```
Require: all CI jobs green, OpenAPI artifact fresh, Android APK artifact from **same latest HEAD**, Web runtime and real Android screenshot evidence, and Twin Review three distinct views. Old APKs, older SHA screenshots or action_required must not be relabelled PASS.

## Unclosed product gates
- Owner-confirmed individual 3D assets; `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET` remains.
- Historical corrections authoring UX and full immutable provenance, medical-record privacy review.
- Real Android phone install and owner visual judgement, especially Today hero and historical replay controls.
- Cross-client R7 Web/Mini UX, WeChat native screenshots, long-term feedback and explainability experiments.
- No visual-model-based acceptance: `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`; `REAL_DEVICE_HUMAN_REVIEW = PENDING`.
