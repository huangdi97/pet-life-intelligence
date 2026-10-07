# PLI R5.6 Source Design Closure — Living Pet Experience

> Date: 2026-10-05  
> Branch: `feat/r2p3d-r3-render-truth-ui-closure`  
> Authority: implementation closure under the canonical v3.4-R1 master, L2 Feature Inventory, `PLI_VISUAL_SYSTEM_R5.md`, R5.4 and R5.5.  
> Status: **SOURCE DESIGN CLOSED / RUNTIME VISUAL EVIDENCE PENDING / HUMAN VISUAL ACCEPTANCE PENDING**.

## 1. Closure meaning

R5.6 does not add a new product layer. It closes the remaining source-level drift after R5.5 so Web, Android/Mobile and Mini share one owner product model:

`PET → NOW → CHANGE → ATTENTION → ACTION → SUPPORT → MEMORY`

The source design is considered closed when the owner information architecture, Living Pet visual language, truthful state semantics, cross-client capability policy and accessibility/navigation contracts are represented in product code rather than only in design documents.

This document does **not** authorize merge, visual-baseline promotion or release.

## 2. Canonical owner IA

All owner clients preserve five first-level destinations:

1. Today
2. Timeline
3. Pet
4. Assistant
5. Me

Monitoring, Companion, Care, Health, Medication, Behavior, Training, Welfare, Social and Twin flows remain contextual capabilities.

## 3. Source-level closure completed

### Web

- R5 Living Pet composition remains the reference implementation.
- Life View uses only 此刻 / 趋势 / 外观; Timeline stays a first-level owner destination instead of being duplicated inside the Twin inspection space.
- Primary navigation keeps native link semantics and explicit `aria-current`.
- The Pet destination receives an explicit current-pet accessible label.
- The More menu exposes `aria-haspopup`, `aria-expanded`, `aria-controls`, menu labeling, route-close behavior and Escape-key dismissal.
- Owner pages retain warm Living Field / neutral Review Studio semantics; dark stages remain engineering-only.

### Android / Mobile

- Five-tab canonical IA remains unchanged.
- Today preserves PET → NOW → CHANGE → ATTENTION → ACTION → SUPPORT → MEMORY; health summary/tasks remain supporting content after the primary action.
- Life View uses only 此刻 / 趋势 / 外观, matching the final R5.5 contract.
- All primary tabs now expose explicit accessibility labels describing their owner job-to-be-done.
- The tab bar hides on keyboard presentation to avoid overlapping focused input flows.
- High-fidelity Twin runtime, Life View camera interaction and Twin Review views remain product-source behavior.
- Medication, Care, Health Detail and other contextual screens remain in the stack rather than competing first-level tabs.

### Mini

- Pet World keeps the six life domains: Life / Health / Behavior / Training / Welfare / Social.
- Monitoring and Companion remain contextual.
- Mini now exposes the real Twin status/version relationship without pretending to render the high-fidelity local 3D runtime.
- The Twin status surface explicitly directs interactive 3D review to capable Web/Android clients.
- Mini source annotations are restored to clean UTF-8 so the source itself remains maintainable and auditable.
- Health remains read-first; Care remains scoped/time-bounded; Welfare is evidence-first; Social is relationship-first; Monitoring never fabricates LIVE.

## 4. React multi-client type isolation

Web is a React 19 / Next 15 client. Mobile and Mini remain React 18 clients.

The repository root is intentionally React-type-neutral. Each client owns its React typings locally. This prevents root-level React 18 declarations from leaking into the Web React 19 JSX namespace while preserving the Expo/Taro React 18 graphs.

This is an engineering closure required to keep the designed multi-client architecture buildable without forcing one client generation onto another.

## 5. Pet Twin final product contract

Capable Web/Android owner surfaces:

- `representation = high-fidelity-glb-twin`;
- runtime-origin manifest;
- continuous skinned mesh;
- PBR / UV texture;
- real skeleton and motion;
- real rotate / zoom / reset;
- real front / side / rear Review cameras;
- graceful fallback only when runtime fails.

Mini:

- shows pet media/species fallback, life state and Twin status;
- does not fake local high-fidelity 3D;
- routes the owner toward capable clients for interactive review.

Identity honesty remains:

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`

until real pet media and explicit owner validation exist.

## 6. Visual system closure

The owner-facing visual language remains:

**Warm Lifestyle + Individual Pet Twin + Subtle Holographic Presence**

Rules:

- warm cream / beige living field;
- pet-dominant hierarchy;
- restrained room/environment cues;
- low-noise state anchors;
- no black 3D viewer on owner Hero surfaces;
- no neon/cyberpunk HUD;
- neutral light Twin Review studio;
- evidence and uncertainty remain readable without turning the product into an admin dashboard.

## 7. Page-completion contract

A page is source-design-complete only when it has:

- explicit JTBD;
- explicit entry/exit paths;
- one primary action;
- truthful loading/empty/error/offline/permission semantics where applicable;
- owner-safe copy rather than raw enums/provider terminology;
- provenance/uncertainty for sensitive claims;
- no fake LIVE/device/identity state;
- responsive composition;
- accessibility semantics for primary actions/navigation;
- consistency with the canonical five-tab IA.

R5.5 remains the exhaustive screen-by-screen contract.

## 8. Remaining work is evidence, not product-design invention

After R5.6, no new product-design layer should be invented to “finish” the current PLI scope.

Remaining acceptance work is:

1. keep CI/build/runtime green;
2. generate fresh final runtime screenshots after the last implementation commit;
3. produce Web / Android / Mini contact sheets and Twin turntables;
4. let the user perform Human Visual Acceptance;
5. only after explicit approval, promote visual baselines and consider merge/release.

If fresh runtime screenshots reveal a visual defect, fix the defect under the existing R5 design authority rather than creating R5.7 merely to rename the same design.

## 9. Required final evidence

Fresh evidence after the final source commit:

- Web: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me;
- Android: Today / Timeline / Pet / Life View / Twin Review / Health / Assistant / Me;
- Mini: Today / Timeline / Pet / Health / Assistant / Me;
- Doudou turntable: front / front-left / side / rear / front-right;
- Mimi turntable: front / front-left / side / rear;
- representative Empty / Attention / Offline / Not Found / Permission states;
- previous-vs-final Hero comparisons.

Missing required source images must fail contact-sheet generation loudly. Silent placeholders remain forbidden.

## 10. Governance

Until explicit user approval of fresh runtime evidence:

- PR #2 stays OPEN;
- no merge to `main`;
- no approved visual baseline promotion;
- no stable release/tag;
- `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

Final source state:

```text
R5_6_PRODUCT_DESIGN = CLOSED
R5_6_SOURCE_UI_IMPLEMENTATION = CLOSED
R5_6_RUNTIME_ACCEPTANCE = PENDING_CURRENT_CI_AND_FRESH_EVIDENCE
REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED
HUMAN_VISUAL_ACCEPTANCE = PENDING
MERGE = BLOCKED_UNTIL_HUMAN_APPROVAL
RELEASE = BLOCKED_UNTIL_HUMAN_APPROVAL
```

## 11. Final cross-client craft pass — 2026-10-05

A final source-level craft pass tightened the canonical five-tab experience without changing product scope:

- **Web mobile**: Today / Timeline / Pet / Assistant / Me is now a real fixed bottom dock with safe-area spacing, warm glass treatment and reliable touch targets; primary IA no longer wraps into a second row under the top header.
- **Android / Mobile**: the native bottom tab surface now includes the device bottom safe-area in its height and padding so gesture/home-indicator space does not compress owner controls.
- **Android / Mobile Assistant**: Ask / Brief / Find / Plan / Explain is now a horizontally scrollable semantic tab rail instead of squeezing five equal controls on narrow devices.
- **Mini**: native navigation and tab chrome now use the light warm surface instead of the older dark-green bar, matching the R5 Living visual authority.

These are implementation/craft corrections under R5.6, not a new product-design version. Fresh runtime screenshots remain mandatory after the final commit. Human Visual Acceptance remains pending.



## 12. Direct GitHub final craft pass — 2026-10-05

A final implementation pass was applied directly on the working branch after re-auditing the current GitHub truth:

- Mobile Twin Review now uses a broad neutral light well instead of a circular halo, preserving the identity-studio contract and avoiding the old “pet in a decorative circle” visual pattern.
- Mobile Pet World no longer claims a month-bounded health count unless the API guarantees that range; Social and friend language remains relationship-first.
- Web Pet World no longer repeats the pet name as both identity and Hero headline; the Hero headline now describes the pet's current day.
- Unknown sex values no longer leak raw enum-like values into owner-facing identity copy.
- `R5_6_FINAL_DESIGN_IMPLEMENTATION_AUDIT.md` is the final source-level acceptance checklist for this scope.

These are product-craft corrections under R5.6, not a new design version.

The remaining gate is evidence: fresh runtime screenshots/contact sheets and explicit user Human Visual Acceptance. Approved visual baselines remain frozen until then.

## 13. Pet-presence finalization pass — 2026-10-05

After the direct GitHub source audit, the final R5.6 craft pass tightened the Pet-first visual hierarchy without changing product scope:

- Mobile Today / Pet / Life View / Twin Review now use stronger runtime framing targets so the Pet Twin occupies more of the hero field rather than reading as a small object inside a large stage.
- Mobile Living Stage dimensions were tightened while Twin render slots were enlarged, reducing unused hero space and strengthening `PET → NOW` ordering.
- Web Today / Pet / Life View / Twin Review framing was aligned upward for the same Pet-first hierarchy and cross-client parity.
- Twin Review on both Web and Mobile now explicitly separates **观察角度** from **它像吗？**, so owners inspect face/ears/body/tail before making an identity decision.
- These changes remain inside the existing Warm Living / Neutral Identity Studio authority; no new design version is introduced.

Fresh runtime evidence is required after these commits. Human Visual Acceptance remains pending; baselines remain frozen.

## 14. 2026-10-07 final truth-alignment pass

The current branch was re-audited against fresh Web/Android runtime evidence and the exhaustive R5.5 contract. This pass closes defects discovered by evidence without creating a new product-design version.

- **Assistant hierarchy:** Ask remains one of the five Assistant capabilities, but is the dominant owner job on Web/Mobile/Mini. Brief / Find / Plan / Explain remain contextual tools. This preserves the canonical five-mode capability model without presenting five equal-weight primary controls.
- **Doudou topology:** the native Gobkit Corgi source conversion contains many exact duplicate seam vertices. The canonical bake welds only exact-position conversion duplicates, then uses repeated linear boundary-preserving refinement at V3 product density. Fresh runtime contact sheets overruled the earlier Loop choice: even with boundary vertices pinned, Loop repositioned interior vertices enough to round away the authored Corgi silhouette. Linear refinement keeps every authored vertex in place while smooth normals/texture carry the presentation finish.
- **Mimi orientation:** canonical model-forward normalization remains baked at +90°. Fresh Android Review evidence shows the rear view by the visible tail; the front looked ambiguous because the old procedural eye/nose masks were annular/near-invisible, not because camera yaw was reversed. Product camera semantics remain stable across Web/Android: front=0, side=π/2, rear=π, with no hidden runtime root compensation.
- **Twin Review pose:** capable clients render Review in a stable **Stand** pose. Review is an identity-inspection task, so camera/view changes must not be confounded by ambient tail/head animation. Runtime evidence now requires pose and canonicalPose to agree.
- **Pose provenance:** runtime manifests report the pose actually rendered and its canonical truth class (AMBIENT / REPRESENTATIVE / OBSERVED) rather than inferring provenance merely from the presence of a Twin descriptor.
- **Generated asset truth:** deterministic asset QA must pass before generated twins are committed. Canonical package assets and Web public assets remain byte-identical.

These corrections preserve all existing truth boundaries:

```text
NO_VISION_MODEL_USED = TRUE
REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED
APPROVED_VISUAL_BASELINE = OLD
HUMAN_VISUAL_ACCEPTANCE = PENDING
PR_2 = OPEN
MERGE = BLOCKED_UNTIL_HUMAN_APPROVAL
STABLE_RELEASE = BLOCKED_UNTIL_HUMAN_APPROVAL
```

Fresh runtime evidence after the last implementation commit supersedes every older R5.6 screenshot.

