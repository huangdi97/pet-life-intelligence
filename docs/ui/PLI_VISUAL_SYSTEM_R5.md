# PLI Visual & Product System R5 — Living Pet Experience Closure

> Date: 2026-10-04  
> Authority: this document is an R5 implementation addendum under the canonical v3.4-R1 master; it does not replace the master or Feature Inventory L2.  
> Status: IMPLEMENTED CANDIDATE / HUMAN VISUAL ACCEPTANCE PENDING.

## 1. Product visual identity

PLI is **Warm Living Intelligence**: a pet life product first, an intelligence system second.

The owner-facing composition hierarchy is:

1. **Pet identity / Pet Twin**
2. **What is happening now**
3. **What changed**
4. **What deserves attention**
5. **What the owner can do next**
6. Supporting evidence, history and utilities

A page is not finished when it merely exposes all APIs. It is finished only when the owner can understand the pet's current life without reading an admin-style dashboard.

## 2. Canonical owner IA

Primary navigation remains:

- Today
- Timeline
- Pet
- Assistant
- Me

Contextual capabilities:

- Health / Medication
- Behavior
- Training
- Welfare
- Social
- Care
- Monitoring
- Companion
- Notifications
- Search
- Pet Twin Capture / Review / Versions
- Life View

Monitoring and Companion are capabilities, not primary tabs.

## 3. Surface model

Preferred surfaces:

- Living Stage / Pet Hero
- Open Section
- Story Row / Timeline Node
- Inline Metric
- Soft Panel
- One Attention
- Bottom Sheet / focused create flow
- Neutral Identity Review Studio

Avoid:

- repeated white admin cards,
- feature grids as the primary pet experience,
- raw status-code chips,
- black 3D viewer cards on owner hero surfaces,
- neon/cyberpunk HUD,
- fake live/device states.

## 4. Pet Twin product contract

On capable Web/Android surfaces the product candidate is a continuous skinned GLB twin with canonical runtime semantics:

- `representation = high-fidelity-glb-twin`
- runtime-origin manifest
- PBR material / UV texture
- real skeleton + motion clips
- real rotate / zoom / reset
- identity review views drive the camera

Procedural primitives remain engineering/fallback only.

The R5 demo dog asset is a native Corgi-like product candidate. Demo geometry and coat traits must not be represented as real-pet identity observations.

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED` until real pet media and owner validation exist.

## 5. Warm Reality Field

Owner living surfaces use a warm, open spatial field rather than a dark viewer:

- warm cream / beige canvas,
- soft ambient depth,
- grounded pet shadow,
- restrained environment cues,
- pet-dominant scale,
- low-noise state anchors.

Twin Review uses a neutral light studio so face, ears, coat, body ratio and markings are readable.

Dark stages are allowed only for explicit engineering/debug contexts.

## 6. Cross-client capability policy

### Web

Reference implementation for the complete Owner information architecture and dense secondary utilities.

### Android / Mobile

Product-first native owner experience with the interactive high-fidelity twin on core Living surfaces.

### Mini Program

Lower-density owner experience with the same IA semantics:

- six Pet life domains: Life / Health / Behavior / Training / Welfare / Social,
- Monitoring + Companion as contextual capabilities,
- read-first Health,
- scoped Care handoff,
- relationship-first Social,
- evidence-first Welfare.

Mini Life View remains an honest lightweight visual experience. It may show real pet media/species fallback + life state/history while directing high-fidelity interactive 3D to capable Web/Android clients. It must never fake a local 3D runtime.

## 7. Domain semantics

### Health
Read first. Show current/recent evidence and deterministic triage. Record form comes after the readable state. Never diagnose.

### Behavior
Owner language first; ABC structure may exist underneath but should not make the default page feel clinical or form-first.

### Training
Goals / sessions / progress / outcome, grounded in recorded activity.

### Welfare
Evidence / trend / uncertainty. Never invent happiness, mood or quality scores.

### Social
Relationships and interaction history, not a social feed and not fake compatibility scores.

### Monitoring
Honest device state: connected/offline/no-device/error/cached/permission. No fake online.

### Companion
Observe / Presence / Enrichment / Learned Interaction. No prototype tags in Owner UI, no fake hardware execution, no anthropomorphic claims.

### Care
Human-readable scoped grants, handoffs, expiry and minimal Care Card sharing. Raw permission/status identifiers must not be the primary owner copy.

## 8. State language

Every owner page must have truthful Loading / Empty / Error / Permission / Offline semantics.

Rules:

- missing data is not "normal",
- unavailable hardware is not "offline" unless known,
- GENERATED_3D is not LIVE,
- cached information must be marked as such,
- internal enum/status identifiers should be localized before presentation.

## 9. Machine vs human acceptance

Machine acceptance may prove:

- page/routes exist,
- required semantics/ARIA/testIDs exist,
- runtime asset really loaded,
- camera/interactions really changed,
- no forbidden owner copy,
- deterministic pixel/layout constraints,
- builds/tests are healthy.

Machine acceptance may **not** declare:

- "this dog looks like a Corgi",
- "this looks premium",
- "this pet feels alive",
- "this visual is approved".

Those remain Human Visual Acceptance gates based on final contact sheets/screenshots.

## 10. Release governance

Until explicit human approval:

- do not promote approved visual baselines,
- do not merge PR #2,
- do not update main,
- do not publish a stable release,
- do not mark Human Visual Acceptance PASS.

Current target state:

`R5_PRODUCT_DESIGN_IMPLEMENTATION = CANDIDATE`  
`HUMAN_VISUAL_ACCEPTANCE = PENDING`


## 11. R5.4 closure authority

The final cross-client design closure is `docs/product/R5_4_FINAL_DESIGN_CLOSURE.md`.

R5.4 adds three mandatory design rules:

1. **Every page has a completion contract**: JTBD, entry/exit, primary action, truthful states, owner-safe copy, responsive behavior and accessibility.
2. **Every visual approval uses fresh runtime evidence**: final screenshots must come after the last implementation commit; missing required evidence must fail loudly rather than render a silent placeholder.
3. **Engineering truth and visual truth stay separate**: GLB/manifest/CI can prove a real implementation, but only the user may approve pet likeness, living quality or final visual fidelity.

The canonical target remains:

`R5_PRODUCT_DESIGN_IMPLEMENTATION = CANDIDATE`  
`HUMAN_VISUAL_ACCEPTANCE = PENDING`


## 12. R5.5 final implementation master

All owner surfaces, page completion contracts, cross-client parity, Twin review rules, evidence requirements and human-acceptance boundaries are consolidated in `docs/product/R5_5_FINAL_PRODUCT_UI_IMPLEMENTATION_MASTER.md`.

R5 remains the visual language; R5.5 is the implementation-facing closure. Any implementation claiming final design completion must satisfy both documents and the canonical v3.4-R1 master.

## 13. R5.6 source-design closure

The current source-design closure is `docs/product/R5_6_SOURCE_DESIGN_CLOSURE.md`.

R5.6 does not introduce a new visual language. It closes the remaining source-level drift across Web, Android/Mobile and Mini while preserving this R5 system. The visual system remains **Warm Living Intelligence**; remaining work before merge is fresh runtime evidence and explicit user visual approval, not another round of design invention.
