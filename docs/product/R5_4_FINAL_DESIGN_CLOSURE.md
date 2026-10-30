# PLI R5.4 Final Design Closure — Living Pet Experience Product Master Addendum

> Date: 2026-10-04  
> Branch: `feat/r2p3d-r3-render-truth-ui-closure`  
> Authority: implementation addendum under `Pet_Life_Intelligence_v3.4-R1_产品技术UIUX多端体验Release产品化LivingPetExperience与Pilot前收口_统一全量母版_2026-09-27.md`; it does not replace the v3.4-R1 canonical master or the L2 Feature Inventory.  
> Status: DESIGN COMPLETE / IMPLEMENTATION CANDIDATE / HUMAN VISUAL ACCEPTANCE PENDING.

## 1. Closure objective

R5.4 closes the remaining design ambiguity across Web, Android/Mobile and Mini by fixing one canonical owner experience and one canonical hierarchy:

`PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY`

PLI is a pet-life product first and an intelligence system second. The 3D Twin is an identity/living surface, not a separate technical product. Health, Behavior, Training, Welfare, Social, Care, Monitoring and Companion are contextual capabilities around one pet identity and one life timeline.

This document defines the final intended product behavior, visual hierarchy and cross-client parity target. It does **not** authorize merge, visual-baseline promotion or release.

## 2. Canonical first-level information architecture

All owner clients use the same five first-level destinations:

1. **Today**
2. **Timeline**
3. **Pet**
4. **Assistant**
5. **Me**

No domain page may become a sixth primary tab.

Contextual destinations under Pet / Today / Assistant:

- Life View
- Health
- Health Detail / Vet Brief
- Medication
- Behavior
- Training
- Welfare
- Social
- Care
- Monitoring
- Companion
- Notifications
- Search
- Twin Capture
- Twin Review
- Twin Versions

## 3. Product hierarchy by surface

### 3.1 Today

Purpose: answer in one glance:

- Who is this?
- What is happening now?
- What changed?
- What deserves attention?
- What can I do next?
- What recently became part of the pet's memory?

Above the fold:

1. pet identity / Twin
2. current-life anchors
3. one concise current statement
4. at most one Attention or Calm state
5. one primary action: Quick Log

Secondary actions are lightweight. Today must never become a dashboard grid.

### 3.2 Timeline

Timeline is the canonical longitudinal memory.

Each row/node should privilege:

- What happened
- When
- Source
- Who recorded it
- Evidence/media
- Outcome/context

Timeline is not a raw event log. Internal enums are always localized before owner display.

### 3.3 Pet World

Pet World is the canonical identity hub.

The six life domains are:

1. Life
2. Health
3. Behavior
4. Training
5. Welfare
6. Social

Medication remains a Health/Care utility. Monitoring and Companion remain contextual capabilities, not peer life-domain tiles.

The first screen should read as “this is my pet”, not “this is a menu”.

### 3.4 Assistant

Assistant actions remain:

- Ask
- Brief
- Find
- Plan
- Explain

Every answer must preserve:
Facts / Inference / Sources / Uncertainty / Action.

Assistant may explain or retrieve. It must not silently diagnose, prescribe, invent live hardware actions, or overwrite owner-confirmed facts.

### 3.5 Me

Me contains household, notifications, privacy/data, settings, device/account management and pilot feedback. It must not compete with pet-life content.

## 4. Pet Twin final product contract

### 4.1 Capable Web/Android

Hero surfaces may render a continuous skinned GLB Twin when available.

Canonical runtime semantics:

- `representation = high-fidelity-glb-twin`
- runtime-origin manifest
- PBR material
- UV texture
- skeleton + motion clips
- real rotate / zoom / reset
- real front / side / rear camera review
- graceful fallback when runtime fails

Procedural primitives are engineering/fallback only and must not present as the product Hero.

### 4.2 Mini

Mini remains a lightweight visual client and must not fake local high-fidelity 3D.

Mini may show:

- pet photo/species visual
- current state
- life history
- Twin status/version
- copy directing users to capable Web/Android for interactive 3D

### 4.3 Identity honesty

Until real pet media and owner validation exist:

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`

Demo geometry, coat markings, eye/nose styling, morphology and generated textures must never be described as direct observations of a real pet.

## 5. Living Stage visual specification

Owner Hero stages use one of two product themes:

### Warm Living Field
Used by Today, Pet World and Life View.

- warm cream / beige foundation
- transparent or visually integrated WebGL canvas
- no black rectangle around 3D
- subtle daylight depth
- grounded shadow
- weak room/environment cues
- pet-dominant projected scale
- low-contrast state anchors
- no neon/cyberpunk HUD
- no giant decorative circle behind the pet

### Neutral Identity Studio
Used by Twin Review.

- off-white / neutral warm grey
- high readability of face, ears, coat, body ratio and tail
- low-distraction ground plane
- front / side / rear controls
- zoom / reset
- identity questions only

Dark stage is allowed only for explicit engineering/debug contexts.

## 6. Cross-client parity matrix

| Capability | Web | Android/Mobile | Mini |
| --- | --- | --- | --- |
| Today Living Canvas | full | full | simplified semantic parity |
| Timeline | full | full | compact |
| Pet six life domains | full | full | full |
| Life View | interactive 3D | interactive 3D | lightweight |
| Twin Review | full | full | status only / no fake 3D |
| Health read-first | full | full | full |
| Health Detail | full | full | compact/deep-link where supported |
| Vet Brief | full + share | full owner flow | entry/share status |
| Medication | full | full | compact |
| Behavior | full | full | compact |
| Training | full | full | compact |
| Welfare | full | full | compact |
| Social | full | full | compact |
| Care handoff | full | full | full semantic parity |
| Monitoring | full | full | honest device state |
| Companion | full semantics | full semantics | compact semantics |
| Assistant | full | full | compact |
| Notifications | full | full | full |
| Settings/Data/Privacy | full | full | essential subset |

## 7. Domain-specific design rules

### Health
Read-before-write. Surface current/recent evidence first. Deterministic triage may prioritize urgency; the UI must never fabricate a diagnosis.

### Health Detail / Vet Brief
Health records open into full event detail. Vet Brief summarizes facts, chronology, treatments/medications and provenance for professional review. It must remain revocable and time-bound when shared.

### Medication
Separate Plan / Scheduled / Given / Skipped / Missed / Duplicate. Agent-generated medication changes are never auto-applied.

### Behavior
Owner wording first. ABC may structure the data model and professional views but must not dominate the owner surface.

### Training
Goals → sessions → progress → outcome, grounded in recorded sessions.

### Welfare
Evidence / Trend / Uncertainty. Never invent “happiness”, “mood” or composite life-quality scores without an explicit validated model and source.

### Social
Relationships and real interaction history, not a social feed and not fake compatibility percentages.

### Care
Human-readable scopes, time-bounded handoff, expiry/revoke, minimum Care Card. Raw grants/status codes are not owner copy.

### Monitoring
Explicitly distinguish connected / offline / no-device / permission / cached / error. Never fabricate LIVE.

### Companion
Observe / Presence / Enrichment / Learned Interaction. No prototype flags, no fake robot execution, no anthropomorphic claims of emotion or intent.

## 8. State system

Every owner-facing page must support truthful states as applicable:

- Loading
- Skeleton
- Empty
- Partial
- Populated
- Error
- Offline
- Permission denied
- Not found
- Feature unavailable
- External dependency unavailable
- Safety blocked

State rules:

- missing data ≠ normal
- no-device ≠ offline
- cached ≠ live
- generated 3D ≠ real pet scan
- unavailable hardware ≠ successful command
- generic error boundary must not swallow a dedicated not-found state

## 9. Interaction hierarchy

A normal owner screen should have:

- 1 dominant subject
- 1 primary CTA
- at most 2 lightweight secondary actions
- at most 1 prominent attention state

Avoid:

- 4–8 equal CTAs
- repeated card grids
- admin/status dashboards
- raw enum badges
- feature-flag language

## 10. Typography and color hierarchy

Canonical emotional tone:

- warm
- calm
- evidence-first
- domestic rather than clinical
- intelligent without looking technical

Visual emphasis order:

1. pet / identity
2. critical fact
3. section title
4. owner action
5. supporting metadata

Red is reserved for real urgency/error. Green is not a generic decoration for all “good” states.

## 11. Motion model

Supported semantic pose family:

- Idle
- Stand
- Sit
- Lie
- Sleep
- Walk
- Run
- Eat
- Drink
- Play
- Sniff
- Stretch

Pose source must remain honest:

- AMBIENT
- REPRESENTATIVE
- OBSERVED

A health result must never directly animate a pet into a dramatic emotional pose.

Reduced-motion preferences disable or minimize non-essential continuous movement.

## 12. Page completion contract

A page is design-complete only when all of the following are true:

1. JTBD is explicit.
2. Entry and exit paths are explicit.
3. Primary action is explicit.
4. Loading/empty/error/offline/permission semantics are defined.
5. Owner copy contains no internal implementation terminology.
6. Sensitive claims expose provenance/uncertainty.
7. No fake live/device/identity state exists.
8. Responsive/mobile composition is defined.
9. Accessibility labels and touch targets are defined.
10. The page fits the canonical IA and does not invent a competing navigation model.

## 13. Visual acceptance contract

Machine acceptance may prove:

- route existence
- semantics/testIDs
- runtime asset loaded
- camera state changed
- source provenance exists
- layout/pixel constraints
- no forbidden copy
- CI/build correctness

Machine acceptance may **not** prove:

- the dog visually reads as a Corgi
- the cat visually reads correctly
- the Twin resembles a real individual pet
- the page feels warm/premium/living
- the final visual is approved

Those remain Human Visual Acceptance decisions from fresh final screenshots/contact sheets.

## 14. Final evidence package required before approval

Fresh screenshots, after the last implementation commit:

- Web: Today / Pet / Life View / Twin Review
- Android: Today / Pet / Life View / Twin Review
- Doudou turntable: front / front-left / side / rear / front-right
- Mimi turntable: at least front / front-left / side / rear
- R5 previous-vs-final Hero comparison
- required state screenshots: Empty / Attention / Offline / Not Found / Permission where practical

Contact-sheet generation must fail loudly on missing required images; silent grey placeholders are prohibited.

## 15. Release governance

Until the user explicitly approves final visual evidence:

- PR #2 stays OPEN
- no merge
- no push to main
- approved visual baselines remain unchanged
- no stable release
- no release tag
- `HUMAN_VISUAL_ACCEPTANCE = PENDING`

## 16. Final stage target

The design is considered specified when this document, the canonical v3.4-R1 master, the R5 Visual System and Master Page Inventory agree on IA, state semantics and visual hierarchy.

Implementation may reach:

`R5_PRODUCT_DESIGN_IMPLEMENTATION = CANDIDATE`

Only user review of fresh runtime screenshots may change:

`HUMAN_VISUAL_ACCEPTANCE = PASS`


## 17. R5.5 implementation authority

The exhaustive screen-by-screen product/UI closure is now maintained in `docs/product/R5_5_FINAL_PRODUCT_UI_IMPLEMENTATION_MASTER.md`. R5.4 remains the design-closure addendum; R5.5 is the implementation-facing expansion and does not override the canonical v3.4-R1 master or L2 Feature Inventory.
