# ACCESSIBILITY_GUIDELINES — R5.6 Owner Experience Contract

> Authority: canonical v3.4-R1 + R5.5/R5.6.
> Status: SOURCE DESIGN CLOSED / runtime accessibility evidence pending.

## 1. Core requirements

| Area | R5.6 requirement |
|---|---|
| Keyboard | All Web interactions reachable in logical order; menus/sheets close with Escape where applicable |
| Focus | Visible focus is never removed; focus does not disappear behind sticky/bottom navigation |
| Semantics | Use native links/buttons/tabs first; current destination exposes `aria-current` / selected state |
| Labels | Icon-only controls require explicit names; pet/Twin controls describe the owner action |
| Screen reader | Meaningful landmarks/headings/lists; state changes use status/alert only when appropriate |
| Touch | Primary mobile controls >=44dp; compact decorative elements are not fake controls |
| Contrast | Body text >=4.5:1 and large text >=3:1; semantic color always has text/icon support |
| Font scaling | Core tasks remain usable at enlarged system/browser text |
| Motion | Reduced-motion removes non-essential motion without removing state information |
| Error/state | Loading/empty/error/offline/permission are conveyed by text, not color/image alone |

## 2. Canonical navigation

### Web

Primary destinations remain Today / Timeline / Pet / Assistant / Me.

- links retain native link semantics;
- active destination exposes `aria-current=page`;
- More exposes popup state and supports Escape dismissal;
- mobile-width Web/PWA bottom navigation remains reachable above safe-area insets.

### Android / Mobile

Five tabs expose labels that describe the owner job, selected state and minimum touch targets. Bottom navigation hides when the keyboard would overlap focused input flows.

### Mini

Navigation semantics mirror the five owner destinations while respecting platform-native capabilities.

## 3. Pet Twin

- The Pet/Twin Hero has a meaningful accessible name.
- Camera controls have explicit labels: rotate context, zoom in/out, reset.
- Twin Review front/side/rear exposes selected state.
- “不像” disables activation in both behavior and accessibility state.
- Motion is not the only way to communicate pose/state.
- Generated/template identity is described honestly; screen-reader copy must not call it a scan.

## 4. Risk, health and monitoring

- urgency has icon + label + explanatory text;
- trend has direction words, not color alone;
- device state uses explicit connected/offline/no-device/cached/permission language;
- Assistant citations/provenance are reachable as text.

## 5. Forms and sheets

- every input has a programmatic label;
- validation explains the problem next to the field and in accessible text;
- modal/sheet opening moves focus appropriately on Web;
- closing restores focus where practical;
- destructive actions require an explicit label and confirmation appropriate to impact.

## 6. Acceptance evidence

Before visual baseline promotion, fresh evidence should include:

- keyboard navigation for Web primary IA and More;
- selected/disabled semantics for mobile tabs and Twin Review;
- 44dp primary controls on representative mobile screens;
- reduced-motion behavior;
- readable focus on warm Living/Review surfaces.

Accessibility machine checks can prove semantics and geometry; they do not replace human usability review.
