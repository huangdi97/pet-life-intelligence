# PLI R5.6 Final Design Implementation Audit

> Date: 2026-10-05  
> Branch: `feat/r2p3d-r3-render-truth-ui-closure`  
> Authority: v3.4-R1 master + L2 Feature Inventory + `R5_5_FINAL_PRODUCT_UI_IMPLEMENTATION_MASTER.md` + `PLI_VISUAL_SYSTEM_R5.md`.  
> Purpose: freeze the complete source-level product/UI design before fresh runtime evidence and Human Visual Acceptance.

## 1. Final product model

PLI is one living-pet product, not a collection of feature dashboards.

Canonical owner mental model:

`PET → NOW → CHANGE → ATTENTION → ACTION → SUPPORT → MEMORY`

Canonical first-level IA is frozen across capable owner clients:

1. Today
2. Timeline
3. Pet
4. Assistant
5. Me

All other capabilities remain contextual.

## 2. Final visual authority

Owner-facing product surfaces use:

**Warm Lifestyle + Individual Pet Twin + Subtle Holographic Presence**

Required visual rules:

- pet identity is the dominant subject;
- warm cream/beige living surfaces;
- transparent/integrated 3D canvas on capable clients;
- grounded shadow/floor haze instead of a dark viewer;
- restrained environment cues;
- no black Hero viewer;
- no giant decorative circle behind the pet;
- no neon/cyberpunk HUD;
- low-noise data anchors;
- neutral light Twin Review studio;
- state/provenance text is legible but secondary.

Engineering/debug surfaces may still use a dark stage, but owner Hero surfaces may not.

## 3. Cross-client source implementation

### Web

- full reference Owner implementation;
- canonical five-destination IA;
- mobile-width bottom dock + desktop warm navigation;
- Today uses the Living Pet composition;
- Timeline is a compact life stream, not a dashboard;
- Pet World is identity-first and now uses a current-life headline rather than repeating the pet name;
- Life View is Twin-first with 此刻 / 趋势 / 外观 only;
- Twin Review is a neutral identity studio;
- Health/Behavior/Training/Welfare/Social/Care/Monitoring/Companion are contextual product surfaces;
- Assistant keeps Ask / Brief / Find / Plan / Explain;
- dedicated not-found/error/permission/offline states remain distinct.

### Android / Mobile

- native five-tab IA;
- warm native Living Stage wraps a transparent high-fidelity WebGL Twin;
- Today/Pet/Life use a warm reality field;
- Review uses a neutral identity studio;
- the final Review light treatment is a broad soft light well rather than a decorative circle;
- Pet World owner copy is factual and relationship-first;
- real rotate/zoom/reset and front/side/rear camera controls remain;
- all high-value contextual flows stay in the navigation stack rather than becoming extra tabs.

### Mini

- semantic parity at lower visual density;
- photo/species-first pet identity rather than fake local 3D;
- Today / Timeline / Pet / Assistant / Me remain the owner IA;
- Twin status/version is truthful and interactive 3D is delegated to capable clients;
- Health remains read-first;
- Care remains scoped/time-bounded;
- Welfare remains evidence-first;
- Social remains relationship-first;
- Monitoring never fabricates LIVE.

## 4. Final Pet Twin contract

Capable Web/Android owner surfaces:

- `representation=high-fidelity-glb-twin`;
- runtime-origin manifest;
- continuous skinned mesh;
- UV/baseColor/PBR;
- skeleton + motion;
- camera interaction is real;
- Review view presets are real;
- procedural primitives are engineering/fallback only.

Identity boundary:

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`

Demo morphology/coat traits must never be presented as direct observation of a real pet.

## 5. Final primary-surface contract

| Surface | Primary job | Dominant visual | Primary action |
| --- | --- | --- | --- |
| Today | understand the day now | pet/Twin | 快速记录 |
| Timeline | understand what happened over time | life stream | search/filter |
| Pet | answer “this is my pet” | identity/Twin | enter life/domain context |
| Assistant | ask/explain/plan from evidence | conversation | ask/send |
| Me | manage household/account/privacy | settings hierarchy | context-dependent |
| Life View | inspect current state around Twin | Twin | rotate/inspect |
| Twin Review | decide likeness | neutral Twin studio | 确认并启用 / 提交不像 |
| Health | read evidence and meaningful change | evidence summary | add/update record |
| Care | understand and control access | people + scope + expiry | create/revoke/handoff |

## 6. State completeness

Required owner-safe states remain:

- Loading / Skeleton
- Empty
- Partial
- Populated
- Error
- Offline
- Permission denied
- Not found
- Feature unavailable
- External unavailable
- Safety blocked

Hard rules:

- no-device != offline;
- cached != live;
- generated Twin != scan;
- missing data != normal;
- unavailable hardware != successful command;
- generic error boundary must not swallow dedicated not-found;
- no raw provider/internal IDs in primary owner copy.

## 7. Accessibility and responsive closure

- primary mobile controls >=44dp;
- selected/disabled state exposed;
- primary navigation has meaningful labels;
- no meaning encoded by color alone;
- reduced-motion remains supported;
- phone-width Web uses the bottom owner dock;
- native bottom navigation respects safe-area/keyboard behavior;
- dense mode/filter rails become one-dimensional scroll rails on narrow widths.

## 8. Final source-level corrections in this pass

The final direct GitHub craft pass additionally closed:

1. Mobile Twin Review: replaced the circular review halo with a broad soft neutral light well so identity inspection does not regress into a decorative “pet-in-a-circle” composition.
2. Mobile Pet World: removed time-window wording not guaranteed by the underlying health endpoint; changed Social/Pet-friend copy to relationship-first owner language.
3. Web Pet World: removed duplicate pet-name headline inside the Living Stage; the Hero now uses a current-life statement while keeping identity in the name/caption hierarchy.
4. Unknown/unsupported sex values no longer leak raw enum-like values into the Web identity line.

## 9. What is still intentionally not declared complete

Source design and source UI implementation can be closed without pretending that runtime visual quality has been human-approved.

Still required after the final source commit:

- fresh Web runtime screenshots;
- fresh Android runtime screenshots;
- fresh Mini screenshots;
- Doudou turntable;
- Mimi turntable;
- representative state evidence;
- previous-vs-final comparisons;
- user Human Visual Acceptance.

Visual baselines stay OLD until explicit approval.

## 10. Final source status

```text
R5_6_PRODUCT_DESIGN = CLOSED
R5_6_SOURCE_UI_IMPLEMENTATION = CLOSED
R5_6_OWNER_IA = CLOSED
R5_6_CROSS_CLIENT_SEMANTICS = CLOSED
R5_6_ACCESSIBILITY_SOURCE_CONTRACT = CLOSED
R5_6_RUNTIME_FUNCTIONAL_ACCEPTANCE = CURRENT_CI_SOURCE_OF_TRUTH
R5_6_FRESH_VISUAL_EVIDENCE = PENDING
HUMAN_VISUAL_ACCEPTANCE = PENDING
REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED

APPROVED_VISUAL_BASELINE = OLD
PR_2 = OPEN
MERGE = BLOCKED_UNTIL_HUMAN_APPROVAL
STABLE_RELEASE = BLOCKED_UNTIL_HUMAN_APPROVAL
```

## 11. Pet-presence finalization pass

A final Pet-first source pass was applied after this audit:

1. Mobile Today / Pet / Life View / Twin Review framing targets were increased and the Living Stage tightened so the Twin carries more visual mass without reintroducing a viewer-card composition.
2. Web Today / Pet / Life View / Twin Review framing targets were increased modestly for parity with the final mobile hierarchy.
3. Twin Review now has an explicit inspection sequence on both clients: **观察角度 → 像不像 → confirm/feedback**. This prevents the verification action from visually competing with the inspection task.
4. The neutral Review Studio, real camera controls, not-like activation block, high-fidelity runtime contract and all release-governance boundaries remain unchanged.

These are final source-craft corrections under R5.6. They invalidate any older “final” screenshots; fresh runtime evidence must be captured from the new branch HEAD before Human Visual Acceptance.



## 2026-10-05 post-bake runtime gate

The native-Corgi demo asset was re-baked after direct inspection of fresh Web runtime evidence. The pass deliberately changed only presentation/template identity details (coat readability and Living Field composition) and does **not** change the product truth boundary:

- `REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`;
- `NO_VISION_MODEL_USED = TRUE`;
- `HUMAN_VISUAL_ACCEPTANCE = PENDING`;
- approved visual baselines remain frozen until explicit owner review.

Fresh CI/Web/Android runtime evidence after the baked-asset commit is required before any visual PASS claim.

## 12. 2026-10-07 evidence-driven final implementation corrections

Fresh runtime inspection exposed issues that source-only structural checks could not honestly close. They were fixed under the existing R5.6 authority:

1. **Assistant:** Web/Mobile/Mini now consistently use Ask-first hierarchy while preserving Brief / Find / Plan / Explain as contextual capabilities.
2. **Doudou:** the deterministic bake repairs exact duplicated conversion seams first, then raises product triangle density with authored-position-preserving linear refinement. Fresh runtime evidence showed that Loop position smoothing rounded the native Corgi silhouette into an unacceptable blob even when open boundaries were protected. Final asset contract therefore requires native Corgi provenance, exact seam welding, silhouette-preserving refinement, 20k–80k product triangle density, UV/PBR texture, skin, and the canonical motion set.
3. **Mimi:** final bake carries the evidence-corrected -90° forward-axis normalization plus a neutral-grey coat with front-gated eyes/nose/ear detail. The sign is fixed from fresh Review runtime evidence so front/side/rear camera meaning is owned by the shared product camera contract, not a runtime root hack.
4. **Twin Review:** Web and Android use stable Stand for identity inspection. Runtime evidence requires `pose=Stand`, `canonicalPose=Stand`, `poseSource=AMBIENT`, and real camera yaw for each Review preset.
5. **Runtime evidence:** persisted Android manifests are invalidated before surface/camera transitions so evidence from a previous WebView/surface cannot certify the next screenshot.
6. **Asset generation:** generated package/Web twin files are synchronized through one deterministic bake workflow and independently checked by product Twin QA.

This is not permission to declare visual likeness PASS. Breed/readability/premium quality still requires fresh user review of the post-fix contact sheets.

