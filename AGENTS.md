# AGENTS.md — Pet Life Intelligence (PLI)

> Scope: applies to the whole PLI repository unless a deeper directory contains a stricter `AGENTS.md`.
>
> This file supplements the user's global engineering rules. Global rules such as ≤300-line production files, high cohesion/low coupling, strong typing, comment quality, error handling, testing, dead-code cleanup, and maintainability remain mandatory.

## 1. Project definition

PLI is a long-term pet life intelligence platform centered on **one specific pet** and its continuous life process.

Core chain:

Pet Identity → Daily Life → Care → Health → Behavior → Training → Welfare → Social → Devices/Home Intelligence → Services → Nutrition/Insurance → Timeline → Personal Baseline → Outcome → Provenance → Pet Agent → Companion → Pet Living Model.

Long-term canonical assets:

- Pet Timeline
- Personal Baseline
- Outcome
- Provenance

PLI is NOT:
- an autonomous AI veterinarian;
- a pet-friendly-place/admission/map project;
- a generic chatbot;
- a collection of unrelated pet utilities.

## 2. Authority order

Resolve conflicts in this order:

L0 runtime / DB / API / logs / staging / current test results  
> L1 Git / migrations / schema / API contracts / tests  
> L2 `Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`  
> L3 `Pet_Life_Intelligence_v3.3-R1_产品技术UIUX多端体验Pilot前收口Companion与个体3D生命界面_统一全量母版_2026-09-20.md`  
> L4 older design/research docs.

Rules:
- Never let docs silently overwrite code/runtime facts.
- Feature ID / Stage conflicts are resolved by L2.
- Runtime/test numbers in docs are historical until re-run.
- Any behavior/scope drift must be recorded explicitly.

## 3. Mandatory pre-work

Before meaningful changes:
1. Read this file.
2. Read relevant canonical sections.
3. Inspect current Git status/HEAD.
4. Read relevant implementation and tests.
5. Check Feature IDs / matrices if applicable.
6. Make the smallest safe change consistent with existing architecture.

Do not redesign from memory.

## 4. Current governance

Unless explicitly changed by the user:

- PRODUCT_DESIGN_FREEZE = ON
- FEATURE_FREEZE = ON
- NEW_DOMAIN_FEATURE = FORBIDDEN
- STAGE_I = FORBIDDEN
- v1.3 = FORBIDDEN
- FUTURE_42_DEVELOPMENT = FORBIDDEN

Allowed:
- bug fixes;
- code-quality/refactor work;
- safety/permission hardening;
- tests;
- accessibility/responsive fixes;
- doc alignment;
- dead-code removal;
- performance work;
- provider adapters;
- Pilot readiness;
- 3D runtime/provider preparation.

Do not invent a new roadmap stage because local implementation is complete.

## 5. Feature governance

The 228 Feature Inventory is canonical.

Do not casually create `PLI-229+`.

Valid experience terminal states include:
- FULL_UI
- BACKGROUND_ONLY
- ADMIN_ONLY
- PRO_ONLY
- EXTERNAL_BLOCKED
- NOT_APPLICABLE
- ACCEPTED_UI_LIMITATION
- FUTURE

Do not use unexplained `PARTIAL_UI`.

Every implemented feature should be traceable:
Feature/requirement → code → tests → client responsibility → runtime evidence or explicit blocked state.

## 6. Core product principles

Preserve:

- Pet-first
- Event-first
- Outcome-first
- Provenance-first
- Permission-by-design
- Observation before inference
- Personal baseline before population guess
- Agent prepares, human authorizes
- Evidence over engagement

Important actions should create standard events. Pages are views, not truth.

## 7. Canonical domain model

Core truth entities include:

- Pet
- Actor
- LifeEvent
- Observation
- Task
- Relationship
- Artifact
- Outcome
- Grant
- Inference

Any important new capability must explicitly define:
Event, Actor, Pet, Source, Artifact, State Change, Outcome, Permission.

## 8. Schema-first rule

All Event types and payload schemas belong in the canonical domain schema layer.

Frontend clients MUST NOT invent independent business fields/models that drift from backend/domain definitions.

Schema changes require:
- versioning;
- migration/compatibility review;
- contract tests;
- multi-client impact review.

## 9. Historical integrity

Prefer:
- append;
- supersede;
- retract;

over silently overwriting history.

Conflicting source events should remain reconstructable when audit/provenance requires it.

## 10. Provenance

Internally distinguish at least:

- OWNER_REPORTED
- DEVICE
- PROFESSIONAL
- LAB
- AI_STRUCTURED
- AI_INFERENCE
- GENERATED_3D
- RECORDED
- LIVE

Never flatten these into one generic source.

## 11. Facts vs inference

AI-supported outputs must preserve:

Facts  
Inference  
Uncertainty  
Evidence  
Action

Rules:
- Inference never overwrites fact.
- AI summaries must remain traceable to evidence.
- Do not remove uncertainty merely for cleaner UX.
- Professional confirmation remains distinct from AI inference.

## 12. Medical / health safety

AI may assist with:
- structuring;
- search;
- summary;
- explanation;
- change detection;
- orchestration.

AI must NOT autonomously:
- diagnose;
- change medication;
- change dose;
- downgrade deterministic red flags;
- convert inference into clinical fact;
- invent missing evidence.

### SAFETY INVARIANT

An LLM/model must never downgrade a deterministic red flag.

Any change involving triage, medication, dose, urgent/emergency state, or professional authorization requires explicit safety tests.

## 13. High-risk rules

Every deterministic high-risk rule must have:
- Rule ID;
- version;
- test cases;
- change history.

Do not bury safety thresholds as anonymous constants.

## 14. Medication safety

Always consider:
- duplicate administration;
- wrong-pet protection;
- unit/dose validation;
- concurrent caregivers;
- idempotency;
- permissions;
- confirmation;
- audit history.

Never weaken these checks for shorter UX.

## 15. Permissions

Permission is a domain capability, not a frontend detail.

Consider:
- owner;
- household/co-owner;
- temporary caregiver/sitter;
- professional;
- organization;
- device;
- admin;
- time-bounded access;
- revocation.

Rules:
- deny by default;
- enforce server-side;
- revoked/expired grants stop access;
- cross-household access requires explicit authorization;
- access remains auditable.

## 16. Pilot data integrity

Keep distinct:
- DEMO
- INTERNAL
- TEST
- SYNTHETIC_DOMAIN
- PILOT_REAL

### PILOT-INTEGRITY INVARIANT

Non-real data must NEVER enter real Pilot metrics.

Exclude demo/internal/test/synthetic data from:
- Activation;
- Retention;
- Active Pets;
- Outcome Closure;
- Vet Usefulness;
- Companion Discovery;
- Commercial Metrics.

If the real value is 0, show 0.
If real evidence is absent, use `NOT_YET_OBSERVED`.

## 17. Evidence language

Never claim real:
- user validation;
- retention;
- outcome success;
- professional usefulness;
- Companion demand;
- commercial conversion;
- 3D identity fidelity;

without real evidence.

Use:
- NOT_YET_OBSERVED
- EXTERNAL_BLOCKED
- DESIGN_ONLY
- SANDBOX_ONLY
- LOCALLY_VERIFIED
- ACCEPTED_LIMITATION

as appropriate.

## 18. Owner IA is frozen

Top-level Owner IA:

Today  
Timeline  
Pet  
Assistant  
Me

Do not expose 16 business domains as 16 first-level tabs.

Responsibilities:

Today:
- Current State
- Quick Log
- Tasks
- Monitoring
- Companion Entry
- Alerts

Timeline:
- All
- Health
- Behavior
- Training
- Care
- Media

Pet:
- Profile
- 3D Life View
- Health
- Behavior
- Training
- Welfare
- Social
- Devices
- Services

Assistant:
- Ask
- Brief
- Find
- Plan
- Explain

Me:
- Household
- Notifications
- Privacy
- Data
- Settings

## 19. Living Canvas

Mobile mental model:

Pet → Now → Change → Attention → Action

Do not revert Today into a generic banner + icon-grid + unrelated-card dashboard.

Today should quickly answer:
- Which pet?
- How is it now?
- What changed?
- What matters now?
- What can the owner do next?

## 20. Timeline

Timeline is a life stream, not a plain log table.

Preserve:
- time;
- source;
- actor;
- media;
- provenance;
- event type;
- outcome.

“Back to that day” must not fabricate historical state using present-day/generated data.

## 21. Assistant

Assistant remains:
- Ask
- Brief
- Find
- Plan
- Explain

Contextual explanation should also exist through:
- Why?
- View evidence
- Source
- Compared with itself

Do not force all explanation through chat.

## 22. Companion principles

Companion follows:

Zero-cognition First  
Observation First  
Welfare First  
Privacy First  
Human-in-Control

Avoid anthropomorphism.

Forbidden:
- “豆豆想你了”
- “豆豆在给你打电话”
- unsupported emotion claims

Prefer observable language:
- “豆豆来到互动设备附近”
- “豆豆触发了互动按钮”
- “豆豆在设备附近停留约 28 秒”

## 23. Companion hardware truthfulness

Unless truly integrated and verified:

- Camera = EXTERNAL_BLOCKED / DESIGN_ONLY
- Two-way Audio = EXTERNAL_BLOCKED / DESIGN_ONLY
- Treat Device = EXTERNAL_BLOCKED / DESIGN_ONLY
- Toy = EXTERNAL_BLOCKED / DESIGN_ONLY
- Robot = EXTERNAL_BLOCKED / DESIGN_ONLY

Never mark fake/fixture video as LIVE.

## 24. Companion welfare

Remote interaction must consider:
- frequency;
- duration;
- treat quantity;
- repeated non-response;
- avoidance;
- rest disturbance;
- stop/termination.

Welfare overrides engagement.

## 25. Pet Living Model (PLM)

PLM is a horizontal experience/representation layer, not a new fact source.

It may consume:
Pet Identity + Artifact/Media + LifeEvent/Observation + Personal Baseline + Outcome + Provenance + Permission + Device/Companion State.

It may present:
3D Identity + State Overlay + Timeline Memory + Companion Presence.

It does not automatically create new Feature IDs.

## 26. User-facing 3D wording

Do NOT use “数字孪生” as normal user-facing copy.

Prefer:
- 3D 形象
- 生命视图
- 此刻
- 状态视图
- 看看它
- 和它在一起

Internally:
- Pet Living Model
- PLM
- Living Pet Representation

A medically validated predictive twin is a future research concept, not a current claim.

## 27. 3D truthfulness

Maintain three layers:

Fact Layer:
Event / Observation / Outcome / Provenance

Inference Layer:
Inference / AI Summary / Change Signal

Presentation Layer:
3D Pet / Animation / Lighting / Data Overlay

### PROVENANCE INVARIANT

Presentation must never overwrite facts.

Forbidden without separately validated scientific capability:
- organ health score;
- disease lesion visualization;
- pain map;
- emotion score;
- lifespan prediction;
- disease probability;
- treatment-response prediction.

Generated visual details must never become `ClinicalFact`.

## 28. 3D provenance

Preserve:
- pet_id;
- visual model version;
- source artifact IDs;
- provider;
- provider model version;
- geometry version;
- texture version;
- rig version;
- owner verification;
- identity QC;
- created/activated/retired state;
- provenance.

## 29. LIVE vs RECORDED vs GENERATED

Never blur:

- GENERATED_3D
- RECORDED
- LIVE

“LIVE/实时” only describes a real current stream.

A generated animation is not a live pet.

## 30. 3D graceful fallback

3D must never be a single point of failure.

If 3D fails, keep usable:

real pet image + current state + baseline + actions.

Core flows must not depend on 3D:
- Quick Log;
- Health;
- Medication;
- Timeline;
- Permissions;
- Safety.

## 31. Provider abstraction

Use adapters for:
- AI;
- 3D generation;
- camera/device;
- email;
- storage;
- external services.

Do not bind core domain logic directly to a concrete provider SDK.

## 32. Multi-client semantics

Clients:
- Web
- Mini
- Mobile
- Admin
- Pro

They need not be pixel-identical.

They MUST preserve the same semantics for:
- Pet;
- Event;
- Permission;
- Safety;
- Provenance;
- Source;
- State.

Professional clients are not Owner pages with a new label.

## 33. Shared UI system

Prefer existing:
- `packages/ui-tokens`
- `packages/ui-kit`

Do not recreate common buttons, badges, spacing, colors, typography, dialogs, toasts, and status styles per page without a real reason.

## 34. Accessibility

Accessibility is part of Done.

Verify where applicable:
- keyboard;
- focus;
- semantic/ARIA labeling;
- contrast;
- large text;
- touch targets;
- screen-reader equivalents;
- reduced motion.

3D information must always have meaningful textual equivalents.
Safety information must never exist only visually.

## 35. PLI engineering style additions

The global engineering rules remain mandatory.

PLI-specific emphasis:
- production source file ≤300 lines;
- high cohesion / low coupling;
- no dependency cycles;
- domain contracts are canonical;
- critical interfaces are strongly typed;
- avoid primitive obsession for dose/unit/time/weight/volume/IDs;
- no silent catch in safety/permission/storage/AI/3D paths;
- no God Service / God Hook / God Component;
- comments explain WHY / INVARIANT / SAFETY / SECURITY.

Prefer automatic CI enforcement over memory.

## 36. PLI comment tags

Use when useful:

- `# SAFETY:`
- `# SECURITY:`
- `# INVARIANT:`
- `# PRIVACY:`
- `# PROVIDER:`
- `# COMPATIBILITY:`
- `# PILOT-INTEGRITY:`
- `# PROVENANCE:`

Examples:

```python
# SAFETY:
# LLM output must never downgrade a deterministic red flag.
```

```python
# PILOT-INTEGRITY:
# Synthetic records are excluded here as a second defensive boundary so
# test data cannot contaminate real Pilot metrics.
```

```python
# PROVENANCE:
# Generated 3D geometry is presentation data and must never become a
# clinical observation.
```

Do not write comments that merely narrate obvious syntax.

## 37. AI configuration

Prompts, JSON schemas, model configs, and relevant policies must be versioned and centrally managed.

Do not scatter production prompts through UI/components/services.

Mock/sandbox AI is not real AI validation.

## 38. Time / units

Business time must be timezone-aware.

Use explicit units for:
- dose;
- weight;
- volume;
- duration;
- money;
- percentage;
- temperature;
- distance.

Avoid ambiguous naked floats.

## 39. Database migrations

Every DB schema change requires a versioned migration.

Require:
- rollback path; or
- explicit forward-fix strategy.

Do not treat manual production table edits as canonical migration.

## 40. Sensitive logging

Do not log full:
- medical records;
- private media;
- passwords;
- tokens;
- secrets;
- unnecessary personal data.

Prefer structured identifiers and safe metadata.

## 41. Error-state completeness

Important user flows should consider:
- Loading
- Empty
- Normal
- Dense
- Error
- Offline
- Permission Denied
- Feature Disabled
- External Blocked
- Safety Blocked
- Stale Data
- Partial Data

Happy-path rendering is not completion.

## 42. Offline / retry / idempotency

Mobile/weak-network behavior matters.

Important write flows must consider:
- retry;
- double-tap;
- request replay;
- device resend;
- offline draft;
- conflict;
- idempotency.

Especially:
- Quick Log;
- Medication;
- device events;
- AI jobs;
- 3D jobs;
- notifications.

## 43. Multi-caregiver concurrency

Always consider:
- duplicate feeding;
- duplicate medication;
- task races;
- grant updates;
- device + owner duplicates.

Use appropriate:
- transaction;
- unique constraints;
- idempotency;
- conflict detection;
- audit.

## 44. Testing layers

PLI uses layered verification:
- Unit
- Integration
- Contract
- E2E
- Safety
- AI Eval
- Load
- Security
- Visual Regression
- Synthetic Scenario Replay

No single layer substitutes for all others.

## 45. Release-blocking regressions

Never ship regressions in:
- deterministic red flags;
- medication safety;
- cross-user/household isolation;
- permission enforcement;
- synthetic-data exclusion;
- fact/inference separation;
- critical provenance.

Never weaken tests simply to make CI green.

## 46. Synthetic validation

Synthetic data may be used for:
- replay;
- property tests;
- adversarial tests;
- time travel;
- visual regression;
- AI gold sets;
- load tests.

It must stay synthetic and never become product-validation evidence.

## 47. Product validation

Engineering tests do NOT prove:
- user value;
- retention;
- real outcomes;
- professional usefulness;
- real Companion demand;
- real 3D identity fidelity.

Those remain `NOT_YET_OBSERVED` until real-world evidence exists.

## 48. Git discipline

Before changes:
- check branch;
- check HEAD;
- check `git status`.

Do not discard uncommitted user work.

Avoid unless explicitly authorized:
- force push;
- destructive reset;
- unrelated rebase;
- mass unrelated formatting.

Keep behavior changes and refactors separable when practical.

## 49. Minimal Safe Refactor

PLI is a pre-Pilot verified system.

Prefer `Minimum Safe Refactor`.

Refactor when evidence shows:
- unsafe coupling;
- duplication;
- file-size violation;
- type-safety problems;
- testability issues;
- performance defects;
- security/safety risk.

Do not rewrite architecture merely because another pattern is fashionable.

## 50. Temporary / dead code

Do not leave unexplained production:
- TODO
- FIXME
- HACK
- XXX
- TEMP
- PLACEHOLDER
- NOT_IMPLEMENTED

Temporary markers must be traceable and have a removal condition.

Keep fixtures/mocks clearly separate from production truth.

## 51. External blockers

If a task requires:
- real 3D provider;
- real AI key;
- real device;
- deployment credentials;
- SMTP credentials;
- platform account;
- real participant;
- human reviewer;

finish all safe local work first, then mark the specific remainder `EXTERNAL_BLOCKED` or `NOT_YET_OBSERVED`.

Never fake success.

## 52. Agent execution pattern

Default workflow:

inspect → reproduce → understand → change → targeted tests → wider regression → update evidence/docs.

Do not stop after only writing a plan when safe execution can continue.

Do not repeatedly ask for information already present in the repo/canonical docs.

## 53. Ask the user only for genuine blockers

Stop and ask only for:
- irreversible/destructive data actions;
- missing required external credentials;
- real device access;
- real participant/human decision;
- unresolved product decision not covered by canonical;
- equal-authority canonical conflicts.

Ordinary implementation details should be resolved from code/tests/specs.

## 54. Reporting vocabulary

Use explicit terminal states:
- PASS
- FAIL
- EXTERNAL_BLOCKED
- NOT_YET_OBSERVED
- ACCEPTED_LIMITATION
- NOT_APPLICABLE

Avoid:
- 基本完成
- 应该没问题
- 差不多
- 大概可以

Important PASS claims need evidence.

## 55. Completion claims

Test counts alone do not prove:
- DESIGN_COMPLETE
- PRODUCT_VALIDATED
- PRODUCTION_READY
- REAL_AI_VALIDATED
- REAL_3D_VALIDATED

Use evidence appropriate to each claim.

## 56. Definition of Done — PLI

A PLI change is Done only when applicable items are satisfied:

- Feature/requirement traceability
- domain/schema correctness
- strong types
- permissions
- safety
- error states
- offline/retry/idempotency
- provenance
- tests
- observability
- multi-client impact
- accessibility
- documentation when contract/behavior changes

High-risk behavior requires all relevant safety tests to pass.

## 57. Forbidden actions

Unless explicitly authorized, do not:
- change the five-tab Owner IA;
- create PLI-229+;
- develop Future 42;
- enter Stage I;
- start v1.3;
- merge pet-map/admission concepts into PLI;
- weaken deterministic health safety;
- store AI inference as fact;
- invent real Pilot metrics;
- mark mock AI as real;
- mark generated 3D as live;
- call PLM a validated medical digital twin;
- mark Companion hardware live without integration;
- silently change domain schemas;
- silently change permission semantics;
- remove tests to pass CI;
- disable lint/type/safety gates to pass CI.

## 58. Final engineering philosophy

PLI code should let a future engineer or Agent answer quickly:

- What happened to this pet?
- Who/what recorded it?
- What is fact vs inference?
- What evidence supports it?
- Who may see/change it?
- What safety invariant applies?
- Which client owns the experience?
- What happens if AI/device/provider is unavailable?
- Can test/demo data contaminate real Pilot evidence?

If these answers are hard to recover, improve structure before adding complexity.

PLI must remain:

**traceable · explainable · safe · modular · provider-replaceable · honest about evidence**
