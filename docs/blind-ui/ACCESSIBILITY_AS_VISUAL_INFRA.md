# Accessibility as Visual Infrastructure

In the blind system, accessibility IS the visual instrumentation. Every
user-visible core element must be reachable, labeled and machine-queryable:

- **Web**: `data-testid` + `data-pli-role` + ARIA roles/labels; Playwright dumps
  the ARIA snapshot per screen (`aria.yml`).
- **Mobile**: RN `testID` (→ uiautomator `resource-id`) +
  `accessibilityLabel`/`accessibilityRole`; the Android extractor parses the
  uiautomator tree (`ui.xml`) into `layout.json`/`visual.json`.
- Text for the content-purity gate comes ONLY from the DOM/accessibility tree —
  never OCR. If text is missing from the tree, the fix is to make the UI
  accessible, not to bypass it.

This single investment raises real accessibility AND testability together:

- touch targets stay ≥44 logical px on interactive elements;
- 3D information always has a meaningful textual equivalent;
- safety information is never conveyed by color alone;
- interactive elements expose `disabled` state (`accessibilityState`/`disabled`)
  so interaction contracts (e.g. Twin Review 不像 → activate disabled) are
  machine-verifiable.
