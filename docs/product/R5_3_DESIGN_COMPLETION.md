# PLI R5.3 Design Completion & Cross-client Closure

> Date: 2026-10-04  
> Branch: `feat/r2p3d-r3-render-truth-ui-closure`  
> Scope: complete the designed owner experience across Web / Mobile / Mini without weakening release governance.

## 1. Why R5.3 exists

R5/R5.2 already advanced Web and Mobile from engineering surfaces to the Living Pet Experience. The remaining product-design drift was cross-client:

- Mini lacked dedicated Welfare / Social / Monitoring pages.
- Mini Companion still exposed feature-flag/prototype language.
- Mini Care exposed raw grants/statuses rather than a real handoff/share flow.
- Mini Health remained create-first instead of read-first.
- Mini Pet World did not expose the canonical six life domains.
- Mini Life View still implied that no 3D product existed anywhere, while the capable Web/Android runtime already had a high-fidelity product candidate.
- Browser E2E retained assertions for older Care/Companion UI copy.

R5.3 closes those inconsistencies instead of inventing new product areas.

## 2. Implemented closure

### Browser contracts

E2E now follows the redesigned product semantics:

- Care Card flow reads the generated share path from the real share result surface.
- Companion tests preserve the same safety/non-live contract using the current owner wording.
- The IDOR test remains unchanged as a security gate; fixing the preceding handoff flow allows the grant to be ended before IDOR verification.

### Mini Pet World

Pet World now has the canonical six life domains:

- Life
- Health
- Behavior
- Training
- Welfare
- Social

Monitoring and Companion are presented as contextual "陪伴与在家" capabilities. Medication remains a health-care utility instead of an equal life-domain tile.

### Mini Welfare

Added an evidence-first Welfare surface with:

- real observation counts,
- provenance/source language,
- relevant recorded daily events,
- domain overview,
- record-observation action last,
- no mood/happiness score.

### Mini Social

Added relationship-first Social with:

- relationship profile,
- pet friends,
- recent real interactions,
- record-interaction action,
- no fake compatibility score.

### Mini Monitoring

Added honest Monitoring with true device states and a calm no-device state. It never fabricates live/online status.

### Mini Companion

Removed Owner-facing feature flags and PROTOTYPE gates. It now mirrors Web/Mobile semantics:

- four capabilities,
- honest device status,
- recent recorded activity,
- contextual Monitoring / Timeline actions,
- explicit non-medical/non-live copy.

### Mini Care

Expanded from raw grant cards to:

- active handoffs,
- localized permission scope wording,
- time-bounded handoff creation,
- early termination,
- 72-hour minimal Care Card generation,
- share-path copy,
- localized grant state history.

### Mini Health

Reordered to:

1. current/recent state,
2. recent changes,
3. health records,
4. prevention/medication,
5. record-health-event action last.

This matches the read-before-write product contract.

### Mini Life View

Keeps a truthful lightweight presentation. It no longer says the 3D product is globally "not created"; instead it explains that interactive high-fidelity 3D is presented on supported Web/Android clients while Mini retains a lightweight visual mode.

## 3. Explicit limitations

- Mini does not claim local high-fidelity 3D rendering.
- Demo Twin identity is not real-pet validation.
- Hardware-dependent Companion/Monitoring actions remain truthful about unavailable devices.
- No visual baseline was promoted.
- No merge or release is authorized by this document.

## 4. Acceptance split

Engineering/Product semantic completion can become PASS after CI verifies typecheck/build/E2E.

Visual quality remains:

`HUMAN_VISUAL_ACCEPTANCE = PENDING`

The next visual evidence package must use fresh final screenshots after the last implementation commit; reports alone are not sufficient.
