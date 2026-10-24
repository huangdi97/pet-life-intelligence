# PLI R5.6 — WEB / MINI RUNTIME EVIDENCE

> Deliberately separate statements: **Web = real runtime execution**, **Mini = build and
> source validation** (native Mini runtime evidence stays external). Nothing from one
> platform is presented as evidence for the other.
> Head: `3aacdf6cfabd105f18b9197ce65d8981a15a48f4`. `NO_VISION_MODEL_USED = TRUE`.

## 1. Web — real runtime

| Item | Value |
| --- | --- |
| Workflow run | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190 |
| Job | `Web standalone artifact` — **success** |
| Artifact | `pli-web-standalone`, id 11683935667, 48 401 072 B, `expired=false` |
| Artifact URL | https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190/artifacts/11683935667 |
| Build | `pnpm --dir apps/web build` (Next standalone) assembled into `pli-web-standalone.tgz` |
| Same SHA? | yes — the run's `headSha` equals the source SHA and its merge-ref tree equals the head tree (`CURRENT_HEAD_TRUTH.md` §4) |

Browser execution gates in the same head:

| Gate | Job | Result |
| --- | --- | --- |
| Playwright functional specs (`r2p-core`, `r2p3d`, `seven-paths`, `stage-h-ux`, `stage-h2-3d`, `behavior-patterns`, `r5-care-medication`, `pwa-share`, `real-auth`, `blind-ui`, `stage-v-*`) | `Browser E2E (Playwright)` in run 38088783213 | **PASS** |
| Blind Visual Contract (deterministic pixel/geometry oracle, candidate and known-bad calibration, anti-pattern scan, owner content purity, twin structural QA) | `Blind Visual Contract (no vision models)` in run 38088783213 | **PASS** |
| Web typecheck + Vitest + production build | `Frontend (web + admin + mini + mobile checks)` | **PASS** |
| Local re-run on this workstation | `pnpm --dir apps/web test`, `apps/web build`, cold `tsc --noEmit` | **PASS** (54 tests / 9 files) |

Web-side runtime evidences produced by the Playwright job are uploaded by that job (screenshots +
`results.json`); no historical screenshot is reused as current evidence here.

Owner-facing Web review still needs the owner: `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

## 2. Mini — build and source validation only

| Item | Value |
| --- | --- |
| Mini typecheck (`pnpm --dir apps/mini typecheck`) | **PASS** (CI + local) |
| Mini builds (`build:weapp`, `build:alipay`, `build:tt`) | **PASS** in CI (`Frontend` job) |
| Local typecheck | **PASS** (exit 0) |

What that does **not** prove (stated by the repository's own gate,
`docs/product/R5_6_MINI_NATIVE_VISUAL_EVIDENCE_GATE.md`): a successful Taro/H5 build is not
WeChat-native runtime evidence. Required Mini native screenshots (`today`, `timeline`, `pet`,
`health`, `assistant`, `me` under `artifacts/r5-6-final/mini/` with a `capture-manifest.json`)
must come from WeChat DevTools automation on the owner's Windows/macOS desktop.

Status: **`EXTERNAL_BLOCKED`** — missing input is the owner's WeChat DevTools session
(and an AppID/authorised login for a real Mini runtime). No H5 screenshot was relabelled as
WeChat evidence, and no Mini claim rests on `build` success.

## 3. Cross-client semantics audited this round (source + tests, not screenshots)

| Semantics | Web | Mini | Android | Evidence |
| --- | --- | --- | --- | --- |
| Five owner tabs / navigation model | `apps/web/components/TopNav.tsx` + routes | Taro tab pages | `navigation.tsx` five `Tab.Screen` | `tests/blind_ui/test_r5_owner_hierarchy.py`, `docs/ui/MULTI_CLIENT_EXPERIENCE_MATRIX.md` |
| Pet-first Today | `apps/web/app/page.tsx`, `_components/today/*` | `pages/index/*` | `TodayScreen.tsx` | blind contract + Vitest `today-page.test.tsx` |
| Life View fallback and honest labelling | `components/pet-living-stage.tsx`, `pets/[id]/life-view` | `pages/pets/life-view` | `LifeViewScreen.tsx` | blind contract; runtime manifests identical semantics |
| Twin Review three views + rejection | `pets/[id]/twin/review` | `pages/pets/*` | `PetTwinReviewScreen.tsx` | viewer ids + `not_like` contract test |
| Assistant default "问" | `app/agent/page.tsx` | `pages/agent/index.tsx` | `AssistantScreen.tsx` (`useState("ask")`) | source contract |
| Unknown ≠ normal | `health/page.tsx` | `pages/health/index.tsx` | `HealthScreen.tsx` | source contract + tests |
| Pet switching isolation | `tests/cross-pet-async.test.tsx` | request-version guards | `context.tsx`/`usePetTwin.ts` | Vitest + blind contract |

## 4. Gaps

1. Mini native runtime screenshots — `EXTERNAL_BLOCKED`.
2. Owner visual acceptance for Web and Mini — `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
3. Browser E2E was **not** re-run locally this round (CI PASS is the evidence); recorded in
   `TEST_GATE_MATRIX.md` §3.
