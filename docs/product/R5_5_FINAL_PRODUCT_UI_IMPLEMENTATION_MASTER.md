# PLI R5.5 Final Product + UI Implementation Master

> Date: 2026-10-04
> Branch: `feat/r2p3d-r3-render-truth-ui-closure`
> Authority: implementation master under the canonical v3.4-R1 product master and L2 Feature Inventory. This document does not replace either source of truth.
> Status: DESIGN CLOSED / IMPLEMENTATION CONTINUES / HUMAN VISUAL ACCEPTANCE PENDING.

## 1. Product thesis

PLI is one living pet experience, not a collection of feature pages.

Canonical owner mental model:

`PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY`

Every surface must answer one of those jobs without introducing a competing navigation or visual language.

The product center is the pet identity. Data, AI, devices, health, care and social capabilities orbit that identity.

## 2. Canonical owner IA

First level is frozen across capable clients:

1. Today
2. Timeline
3. Pet
4. Assistant
5. Me

No additional owner capability may become a sixth first-level tab.

Contextual capabilities:

- Life View
- Health
- Health Detail
- Vet Brief
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

## 3. Shared page completion contract

Every owner page is complete only when it has all of the following:

1. one explicit JTBD;
2. a known entry path;
3. a known exit/next path;
4. one primary action;
5. at most two peer secondary actions;
6. truthful Loading/Empty/Error/Offline/Permission/NotFound/Unavailable states as applicable;
7. no raw internal enums/IDs/provider labels in primary owner copy;
8. responsive/mobile composition;
9. accessibility labels and >=44dp touch targets for primary controls;
10. provenance/uncertainty on sensitive or generated content;
11. no fake LIVE, fake device state, fake pet identity, fake medical conclusion or fake success;
12. fresh runtime evidence after the final implementation commit.

## 4. Living visual system

### 4.1 Warm Living Field

Used by Today, Pet World and Life View.

Required:

- warm cream/beige base;
- visually integrated transparent 3D canvas;
- soft daylight depth;
- grounded shadow/floor haze;
- restrained environment cues;
- pet-dominant visual mass;
- low-noise state anchors;
- no black rectangle;
- no giant decorative circle;
- no cyberpunk/neon HUD.

### 4.2 Neutral Identity Studio

Used by Twin Review.

Required:

- off-white / warm neutral background;
- readable face, ears, coat, body ratio, paws and tail;
- front / side / rear camera presets;
- zoom / reset;
- identity-only language;
- no health/social/task clutter.

### 4.3 Engineering stage

Dark stage is allowed only for explicit engineering/debug contexts and must never be the owner Hero surface.

## 5. Pet Twin product contract

Capable Web/Android product Twin:

- `representation=high-fidelity-glb-twin`;
- runtime-origin manifest;
- continuous skinned mesh;
- UV/baseColor/PBR;
- skeleton + motion library;
- real camera interaction;
- real front/side/rear review;
- graceful fallback on runtime failure.

Procedural primitives remain engineering/fallback only.

Identity honesty:

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`

until actual pet media plus owner validation exist.

Demo morphology/coat traits are product templates and must never be described as direct observation of a real pet.

## 6. Today — final UI contract

JTBD: understand the pet's day in one glance and record the next meaningful fact.

Semantic order:

`PET → NOW → CHANGE → ATTENTION → ACTION → SUPPORT → MEMORY`

Above fold:

- pet/Twin is the first visual focus;
- one concise present-state statement;
- up to four ambient life anchors (food/water/activity/sleep);
- at most one Attention/Calm state;
- one primary CTA: 快速记录.

Secondary actions:

- 看看它;
- 问助手.

Monitoring/tasks are supporting utilities and must not displace the primary action.

Do not render a dashboard grid.

## 7. Timeline — final UI contract

JTBD: understand what happened over time with evidence and provenance.

Each node privileges:

- what happened;
- when;
- source;
- recorder;
- evidence/media;
- outcome/context.

Use day grouping and compact life-stream density. Internal event types are localized before display.

Primary action: search/filter timeline, not create another dashboard.

## 8. Pet World — final UI contract

JTBD: answer “this is my pet” before presenting utilities.

Top visual order:

1. identity / pet;
2. current-life summary;
3. six life domains;
4. contextual capabilities.

Six life domains are fixed:

1. Life
2. Health
3. Behavior
4. Training
5. Welfare
6. Social

Medication remains a health/care utility.
Monitoring and Companion remain contextual.

The screen must not read as a feature menu.

## 9. Life View — final UI contract

JTBD: inspect the pet's current living state around the Twin.

Primary visual: Twin.

Modes:

- 此刻;
- 趋势;
- 外观.

State anchors remain secondary to the pet.

Required real interactions:

- rotate;
- zoom in/out;
- reset.

No dark viewer on owner surfaces.

## 10. Twin Capture — final UI contract

JTBD: collect sufficient pet media for a candidate identity model.

Required guidance:

- what angle is needed;
- why it is needed;
- upload/camera state;
- completion/progress;
- failure/retry;
- no implication that captured media guarantees exact reconstruction.

## 11. Twin Review — final UI contract

JTBD: allow the owner to decide whether the candidate resembles the pet.

Required:

- neutral review studio;
- large readable Twin;
- front / side / rear;
- zoom / reset;
- options: 很像 / 基本像 / 不像;
- “不像” issue categories;
- negative feedback persisted;
- “不像” must never activate;
- prior active Twin remains active when negative feedback is submitted.

Primary CTA for positive states: 确认并启用.
Negative state CTA: 提交不像反馈.

## 12. Twin Versions — final UI contract

JTBD: understand active/current/history of Twin versions.

Show:

- version;
- status;
- created time;
- provenance summary;
- owner verification;
- active state.

Avoid provider/model internals as primary copy.

## 13. Health — final UI contract

JTBD: read the pet's current/recent health evidence before creating more data.

Order:

1. recent state/evidence;
2. meaningful changes;
3. risk/triage when present;
4. records;
5. add/update action.

Never fabricate diagnosis.

Urgency color is reserved for deterministic urgent/emergency rules.

## 14. Health Detail + Vet Brief

Health Detail shows:

- complaint/symptom;
- time;
- evidence;
- deterministic triage;
- actions/treatment records;
- source;
- outcome.

Vet Brief is a professional-facing derivative with:

- chronology;
- facts;
- medications/treatments;
- evidence;
- provenance;
- share/revoke/expiry.

It must not convert uncertainty into certainty.

## 15. Medication

Separate:

- Plan
- Scheduled
- Given
- Skipped
- Missed
- Duplicate

Medication changes suggested by AI are never auto-applied.

## 16. Behavior

Owner language first.

Capture:

- what happened before;
- observed behavior;
- what happened after.

ABC structure may exist in data/professional views but must not dominate owner UI.

## 17. Training

Flow:

`Goal → Session → Progress → Outcome`

Progress must be grounded in recorded sessions.

## 18. Welfare

Show:

- evidence;
- trend;
- uncertainty;
- comfort/stress/recovery/environment/enrichment observations.

Do not generate synthetic happiness/mood/quality scores.

## 19. Social

Relationship-first, not feed-first.

Show:

- known relationships;
- interaction history;
- safety/context;
- owner feedback.

No fake compatibility percentage.

## 20. Care

Show human-readable:

- who has access;
- what they can do;
- expiry;
- revoke;
- handoff summary;
- Care Card.

Raw permission/grant identifiers are implementation details.

## 21. Monitoring

Explicitly distinguish:

- connected;
- offline;
- no device;
- cached;
- permission denied;
- error.

Never fabricate LIVE.

## 22. Companion

Four semantic areas:

- Observe
- Presence
- Enrichment
- Learned Interaction

No prototype flags in owner UI.
No fake hardware execution.
No claims that the system knows pet emotion/intent.

## 23. Assistant

Modes remain:

- Ask
- Brief
- Find
- Plan
- Explain

Every substantive answer preserves:

- Facts;
- Inference;
- Sources;
- Uncertainty;
- Action.

The Assistant may retrieve/explain/plan but must not silently diagnose, prescribe, or overwrite confirmed owner facts.

## 24. Me

Contains:

- household;
- pet/account management;
- notifications;
- privacy;
- data;
- devices;
- settings;
- pilot feedback.

It must not compete visually with pet-life content.

## 25. Cross-client policy

### Web

Reference implementation for the full Owner IA and dense secondary utilities.

### Android/Mobile

Product-first native composition, interactive Twin on capable Living surfaces, full owner flows.

### Mini

Semantic parity with lower visual density.

Mini must not fake local high-fidelity 3D. It may show media/species visual, life state, Twin status/version and route users to capable clients for interactive 3D.

## 26. State matrix

Required state vocabulary:

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
- External unavailable
- Safety blocked

Rules:

- missing data != normal;
- no-device != offline;
- cached != live;
- generated 3D != scan;
- unavailable hardware != successful command;
- generic error boundary must not swallow dedicated not-found.

## 27. Visual density rules

Normal owner screen:

- one dominant subject;
- one primary CTA;
- <=2 peer secondary actions;
- <=1 prominent attention state;
- low card count;
- whitespace used as hierarchy.

Avoid:

- 4–8 same-weight CTAs;
- repeated bordered cards;
- admin dashboards;
- raw enum chips;
- dense feature grids.

## 28. Typography and color

Emotional tone:

- warm;
- calm;
- domestic;
- evidence-first;
- intelligent without looking technical.

Emphasis:

1. pet/identity;
2. critical fact;
3. section heading;
4. owner action;
5. supporting metadata.

Red only for real urgency/error.
Green is not a generic “everything good” decoration.

## 29. Motion

Supported pose family:

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

Pose provenance:

- AMBIENT
- REPRESENTATIVE
- OBSERVED

Health results must never directly force emotional/dramatic animation.

Respect reduced-motion.

## 30. Accessibility

Required:

- meaningful accessibilityLabel/testID for important owner actions;
- >=44dp mobile targets for primary interactions;
- selected/disabled state exposed to accessibility APIs;
- no meaning encoded by color alone;
- readable contrast on Living Field and Review Studio;
- motion not required to understand content.

## 31. Evidence and acceptance

Machine acceptance may prove:

- route/page existence;
- semantics/test IDs;
- runtime asset load;
- camera change;
- source/provenance;
- deterministic layout/pixel constraints;
- build/test health.

Machine acceptance may not prove:

- dog visually reads as a Corgi;
- cat visually reads correctly;
- individual likeness;
- “premium” / “warm” / “alive” quality;
- final approval.

Those remain Human Visual Acceptance decisions.

## 32. Mandatory final evidence package

After the final implementation commit:

- Web: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me;
- Android: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me;
- Mini: Today / Timeline / Pet / Health / Assistant / Me;
- Doudou turntable: front / front-left / side / rear / front-right;
- Mimi turntable: front / front-left / side / rear;
- Empty / Attention / Offline / Not Found / Permission evidence where practical;
- previous-vs-final Hero comparisons.

Contact-sheet generation must fail loudly if required sources are missing. Silent grey placeholders are forbidden.

## 33. Release governance

Until the user explicitly approves fresh final runtime screenshots:

- PR #2 stays OPEN;
- no merge;
- no main update;
- no approved visual baseline promotion;
- no stable release/tag;
- `HUMAN_VISUAL_ACCEPTANCE=PENDING`.

## 34. Final closure state

Design specification target:

`R5_5_PRODUCT_DESIGN = CLOSED`

Implementation target:

`R5_5_UI_IMPLEMENTATION = CANDIDATE`

Human gate:

`HUMAN_VISUAL_ACCEPTANCE = PENDING`

Only fresh user-reviewed evidence may change the last line to PASS.
