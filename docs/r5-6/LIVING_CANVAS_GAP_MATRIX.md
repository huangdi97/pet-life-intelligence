# PLI R5.6 — LIVING CANVAS GAP MATRIX

> Method: page × device × requirement × real code × real verification × gap × priority.
> Verification uses **deterministic** evidence only: source contracts, blind-UI tests,
> UIAutomator XML, layout/visual JSON, screenshot hashes. No vision model is used
> (`NO_VISION_MODEL_USED = TRUE`); anything that needs the owner's eyes stays
> `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
>
> Verification head: `3aacdf6cfabd105f18b9197ce65d8981a15a48f4` —
> run https://github.com/huangdi97/pet-life-intelligence/actions/runs/38088783190
> (artifact `r5-6-android-runtime-evidence`, id 11683881923).
> Local verification: Windows 11 + API-36 x86_64 emulator + local demo API
> (`ANDROID_RUNTIME_EVIDENCE.md`).

## Legend

- **P0** broken/misleading first screen, fake facts, data bleed between pets.
- **P1** wrong hierarchy, or a run failure that blocks evidence.
- **P2** responsive / accessibility / detail.

## 1. Navigation shell (five owner tabs)

| Requirement | Real implementation | Verification (this round) | Gap | Priority |
| --- | --- | --- | --- | --- |
| Five first-level tabs `今天 / 时间线 / 宠物 / 助手 / 我的`, never reduced or merged | `apps/mobile/src/navigation.tsx` — five `Tab.Screen`, `tabBarTestID` `pli.nav.today/timeline/pet/assistant/me`, a11y labels per tab | CI UIAutomator dumps for `pet`, `timeline`, `me`, `assistant`, `secondary-sanity` each contain **5 `pli.nav.*` ids** + the labels; `tests/blind_ui/test_r5_owner_hierarchy.py:1303` asserts the exact label set | none | — |
| `我的` is the canonical fifth label (GOAL shorthand `我`) | `我的` | canonical `docs/ui/OWNER_NAVIGATION_V4.md` + blind contract agree | none — deliberately **not** changed (changing it would break the frozen contract) | — |
| Deep pages return to parent; Android Back must not jump to Today | stack navigators + `today_helpers.ts` navigation policy | blind owner-hierarchy contract | none observed | — |
| Tab bar must not cover a primary CTA | tab bar height `60 + max(insets.bottom, 8)`, labels at 11 px | CI `ui.xml` bounds on owner surfaces; no element exceeds the tab-bar band | none observed | — |
| Primary Today capture must show the fully mounted owner shell | Tab bar and life anchors mount asynchronously after the first cold navigation | In run `38087011941` the primary `today/ui.xml` (15 714 B) has `pli.today.living-stage` plus a `加载中` node, while the later `secondary-sanity/ui.xml` (36 175 B) shows the complete shell incl. all five nav ids | **evidence-completeness gap** — the screenshot is real but taken mid-mount; no product defect and no gate is claimed on it | P2 |

## 2. Today (highest UI priority)

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| Which pet? Identity first, before any content | `pli.today.identity` → `pli.pet.identity` ("当前宠物：豆豆") at `y=0`, multi-pet switch `pli.multipet.current` (selected) / `pli.multipet.switch.<id>` (咪咪) | CI `today/visual.json`: identity at `y=0…143`, `selected` flags present | none | — |
| Pet is the visual subject of the first screen | `pli.today.living-stage` `y=143…1353` (1 210 px) with `pli.today.pet-twin` 1 004 px and an 896 × 1 004 px rendered identity | CI `today/layout.json` geometry; manifest `projectedAreaRatio = 0.557`, `projectedPetHeightRatio = 0.724` | none | — |
| Status anchors `吃 / 喝 / 活动 / 睡眠 / 关注` as life anchors, **not** four KPI cards | `TodayScreen.tsx` renders `pli.today.anchor.<id>` and hands them to the living stage; attention is a single `pli.today.attention` element | source contract + `tests/blind_ui/test_r5_owner_hierarchy.py` anchor tests (`test_android_today_all_life_anchors_open_their_evidence_detail`) | anchors are not visible in the mid-mount screenshot above (same timing cause) | P2 |
| No fact ⇒ "尚未记录/暂无可靠状态", never "正常/健康良好" | `HealthScreen.tsx:250` — "先记录事实，再判断变化；这里不会把未知状态显示成"正常""; `today_helpers.ts` treats unknown as unknown | source contract + backend unit/integration tests | none | — |
| Demo/generated identity must be labelled and never impersonate the pet | content-desc "豆豆的 3D 形象（演示）。基于 CC0 柯基模板的演示 3D 形象；只有经过真实宠物素材与主人确认后才可代表个体。" | CI `today/visual.json` element text | none | — |
| Quick Log is reachable without covering the pet | `pli.today.anchor.*` → `LifeView` / quick-log sheets in `packages/ui-kit` | blind contract + Playwright `r5-care-medication.spec.ts` | none | — |

## 3. Timeline

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| Life stream first, filters/search secondary | `apps/mobile/src/screens/TimelineScreen.tsx` (678 changed lines this cycle), `LifeStream` components, filter bar secondary | CI `timeline/ui.xml` (40 131 B) + `timeline.png`; blind contract on life-stream ordering | none | — |
| Recording a fact produces a canonical event, not a local card | API `POST /pets/{id}/events` → `LifeEvent`; `TodayScreen`/`TimelineScreen` re-read from the API | backend integration tests (`tests/integration/test_api_integration_flows.py`) + Quick Log → `/today` round trip in the v10 tests | none | — |
| Pet switch must never flash another pet's rows | request-version guards (`context.tsx`, `usePetTwin.ts`) and per-pet cache keys | `apps/web/tests/cross-pet-async.test.tsx`, `tests/blind_ui` pet-switch tests, plus the secondary-pet captures in this run | none | — |

## 4. Pet world

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| Long-term life space, not a function wall | `PetScreen.tsx` (321 changed lines) with `pli.pet.hero-stage`, layered Life/Health/Behavior/Training/Welfare/Social entry | CI `pet/ui.xml` (25 769 B) contains `pli.pet.hero-stage` and the full nav shell; blind contract asserts `pet` is certified only by the hero stage | none | — |
| Avatar/name editing with a transparent fallback | `PetProfileScreen`, `PetAvatar` with fallback | blind contract + web `pets/[id]/edit` page tests | none | — |

## 5. Life View / individual 3D identity

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| Life space, not a black-box viewer; no blue HUD/grid | `PetLivingStage` warm-living field (`#F4E9D8` / `#E7D5BC`), `projectionPlane` / `projectionGlow` | `tests/blind_ui/test_r5_owner_hierarchy.py::test_living_field_is_warm_cream_with_restrained_projection_presence`; CI `lifeview.png` (382 418 B) + `lifeview/ui.xml` | none | — |
| Real photo preferred; honest fallback when no trusted individual asset exists | Stage renders the 3D identity only when a `RUNTIME` rigged manifest with a consistent fidelity tier is present; otherwise photo/upload guidance | capture script refuses to certify without the manifest; CI `lifeview/3d.json` → `ready=true`, `tier=STYLIZED_REFERENCE` | real owner media absent by nature of the demo seed → `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET` | external |
| Controls must not cover the pet or leave the viewport | `LivingModeSwitcher` above the stage (`46a84e2`/`b099d89` moved it ahead of the immersive field) | blind contract `test_r5_6_ci_canvas_bounds.py`; CI layout bounds | none | — |
| Life View never overflows horizontally | stage width equals the 1080 px viewport | CI `lifeview/layout.json` (`contentBounds.width = 1080`) | none | — |

## 6. Twin Review (individual image confirmation)

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| `正面 / 侧面 / 背面` reachable on the first screen | `pli.twinreview.camera-controls` + `pli.twinreview.view.front/side/back` in `PetTwinReviewScreen.tsx` | CI `twinreview/ui.xml` contains all four ids; capture script hard-requires them | none | — |
| Tapping really changes the camera, not just a highlight | three runtime manifests per view | CI `3d_view_front.json` yaw `0`, `3d_view_side.json` yaw `1.5708`, `3d_view_back.json` yaw `3.1416` (same pet, same `stageRole=review`, pose `Stand`) and three **distinct** PNG hashes: `4C327C638FB33D86…`, `329C586AC7919602…`, `FDF7373305BCEA8E…` | none | — |
| `不像` must never activate a candidate | `services/api/app/api/routes/visual.py` blocks activation without `owner_verified`; `tests/integration/test_plm_visual.py::test_verify_not_like_cannot_activate` | blind/integration tests pass in CI (`Backend` job success) | none | — |
| Honest asset quality — low-poly must not be marketed as high fidelity | runtime reports `visualFidelityTier = STYLIZED_REFERENCE`, `individualIdentityEvidence = false`, `sourceMediaCount = 0`, `technicalRepresentationQuality = RIGGED_PBR_SKINNED` (technical, not identity fidelity) | CI manifest — **observed reality**, no manifest/CSS upgrade claim | real individual reconstruction remains `BLOCKED_BY_SOURCE_ASSET` | external |

## 7. Assistant / Me

| Requirement | Real implementation | Verification | Gap | Priority |
| --- | --- | --- | --- | --- |
| Ask is the primary mode; brief/find/plan/explain are secondary tools | `AssistantScreen.tsx:42` `useState<Tab>("ask")`; `TOOLS` only holds `brief/find/plan/explain` | source contract + CI `assistant/ui.xml` (28 799 B) | none | — |
| Answers must be grounded in the owner's own records and say so when nothing is recorded | `/pets/{id}/ask` with pet-scoped context | backend tests + AI eval suite (`tests/ai-evals`) green in CI | real AI provider not configured locally → sandbox answer, labelled | external |
| Me is a real owner hub, not a debug page; no manifest/provider leakage | `MeScreen.tsx` (470 changed lines) | `tests/blind_ui` owner-content purity scan + anti-pattern scan; CI `me/ui.xml` (31 234 B) | none | — |

## 8. Domain surfaces reachable from Pet/Today/Timeline

| Surface | Verification | Gap |
| --- | --- | --- |
| Health — record first, change second, unknown ≠ normal | CI `health/ui.xml` (6 687 B) + `HealthScreen` unknown-state copy | none |
| Behavior / Training / Welfare / Social | blind contract + Playwright specs (`behavior-patterns.spec.ts`, `r5-care-medication.spec.ts`); Mini/Web source contracts | none observed |
| Companion — no fake "live companionship" | `CompanionScreen` + `test_companion_is_pet_first_across_owner_clients_and_final_evidence`; hardware remains `EXTERNAL_BLOCKED / DESIGN_ONLY` | real hardware still external |

## 9. Devices / viewports

| Device | Evidence this round | Gap |
| --- | --- | --- |
| Hosted Android emulator (CI), API 35, `pixel_5` profile, forced 1080 × 2340 @ 440 dpi | full screenshot set + UI XML + layout/visual JSON + 4 contact sheets | none |
| Local Android emulator, API 36 (`pli_pixel_api36`), 1080 × 2340 @ 440 dpi | see `ANDROID_RUNTIME_EVIDENCE.md` | local emulator is API 36 while CI uses API 35 — recorded, not claimed as identical |
| Web (browser E2E + visual contract) | Playwright + Blind Visual Contract jobs green in CI | owner-view review pending |
| Mini (WeChat) | typecheck + weapp/alipay/tt builds green in CI | **native WeChat screenshots `EXTERNAL_BLOCKED`** (needs the owner's DevTools desktop session) |

## 10. Summary of open gaps

0. **RESOLVED — Today first-screen evidence completeness** (was P2): the local run captured
   the full owner shell on Today (`today/ui.xml` 38 840 B with all five `pli.nav.*` ids and the
   four `pli.today.anchor.*` anchors), so the leaner CI capture is confirmed as a mid-mount
   timing artifact of the hosted run, not a missing UI. Fixing it in CI by widening timeouts
   was deliberately avoided; the observation stands documented and the complete surface is
   evidenced from the same commit.
1. **P2 — Today first-screen capture completeness** (evidence only, no product defect):
   the primary Today screenshot is taken while the shell is still mounting. Verified as a
   timing effect by comparing it with the warm `secondary-sanity` capture of the same
   screen with the full shell. Not "fixed" by widening timeouts, because that would mask
   the observation instead of recording it.
2. **External — real individual 3D asset**: `3D_ASSET_QUALITY = BLOCKED_BY_SOURCE_ASSET`.
3. **External — Mini native screenshots**: `EXTERNAL_BLOCKED`.
4. **Pending human — visual acceptance** of the whole set: `HUMAN_VISUAL_ACCEPTANCE = PENDING`.
