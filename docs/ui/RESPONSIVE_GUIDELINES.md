# RESPONSIVE_GUIDELINES — R5.6 Cross-client Composition

> Authority: canonical v3.4-R1 + R5 visual system + R5.5 implementation master.
> Status: SOURCE DESIGN CLOSED / fresh runtime evidence pending.

## 1. Validation widths

Web/PWA core surfaces must be checked at:

- 360
- 390
- 768
- 1024
- 1440

Mobile native uses actual device/simulator viewport + safe areas rather than pretending to share Web breakpoints. Mini uses platform viewport and safe-area rules.

## 2. Composition rules

### <768 Web/PWA

- one-column owner composition;
- five primary destinations become the bottom navigation;
- top shell stays quiet;
- no compressed desktop toolbar;
- sheets/actions favor bottom placement;
- Living/Twin surfaces use almost the full content width;
- page bottom padding clears the fixed nav + safe-area inset.

### 768–1023

- content may use two-column support layouts where it improves reading;
- one dominant subject remains visually clear;
- domain forms must not become dense admin grids.

### >=1024

- content remains bounded and centered;
- secondary evidence/utilities may sit beside the primary narrative;
- pet/Twin scale may grow, but the canvas must not become an empty oversized stage.

### >=1440

- do not stretch text or cards across the viewport;
- preserve readable line length and a calm centered owner experience.

## 3. Living surfaces

Today / Pet World / Life View:

- pet remains the dominant mass at every width;
- anchors must not cover the head/face;
- identity/caption shelf must not cover paws/camera controls;
- no giant decorative circle/arch may become more salient than the pet;
- the stage must remain warm/open rather than turning into a bordered Viewer.

Twin Review:

- studio remains neutral;
- front/side/rear and zoom/reset remain reachable without scrolling the Twin off screen where practical.

## 4. Navigation

Web desktop uses a compact toolbar. Web mobile uses bottom navigation. Android/Mobile uses native bottom tabs. Mini follows platform conventions while preserving the same five primary owner jobs.

No sixth capability becomes a first-level tab at any width.

## 5. Forms and utilities

- primary CTA remains obvious;
- <=2 peer secondary actions at the same hierarchy;
- tables become readable stacked rows/cards on narrow layouts;
- Care/Medication/Monitoring operational details remain contextual rather than dominating the page.

## 6. Safe area and keyboard

- all mobile bottom controls account for gesture/home indicators;
- bottom navigation must not overlap focused inputs;
- keyboard presentation may hide bottom navigation where needed;
- sheets/forms must keep the active field and primary action reachable.

## 7. Acceptance

Fresh runtime capture after the final source commit is required. Source CSS/layout compliance alone is not visual acceptance.
