# BLIND UI Architecture

PLI Stage R.2-P3D-R2 ships a machine-readable visual system so a model with
**no vision capability** can implement and machine-accept UI: structure,
position, size, color, hierarchy and 3D runtime truth are extracted as data and
compared against explicit contracts. No vision model is used anywhere.

## Pipeline

```
CODE → BUILD → RUN → DUMP SEMANTICS → DUMP LAYOUT → DUMP STYLES → DUMP 3D MANIFEST
     → CAPTURE PNG → PIXEL ORACLE → ASCII LAYOUT → CONTRACT COMPARE → SCORECARD → PATCH
```

## Components

| Layer | Path | Role |
|---|---|---|
| Contracts | `packages/visual-contract/screens/*.json` | Per-screen machine assertions (8 weighted dimensions, 100 pts) |
| Schema | `packages/visual-contract/schema/*.json` | JSON Schema for contracts / element snapshots / twin manifest |
| Tokens | `packages/visual-contract/tokens/tokens.json` (+ TS mirrors) | Approved color/spacing/type/radius/motion + pixel thresholds |
| Evaluator | `packages/visual-contract/src/evaluate.ts` | Pure contract evaluator (Node; bridge `scripts/blind-ui/eval-contract.mjs`) |
| Web capture | `scripts/blind-ui/capture-web.mjs` | Playwright: screenshot/aria/layout/styles/visual per screen |
| Android capture | `scripts/blind-ui/capture-android.ps1` | uiautomator + screencap + logcat manifest per screen |
| Pixel oracle | `scripts/blind-ui/pixel_oracle.py` | Classical PIL/numpy statistics (warm/cool/card ratios, SSIM, pHash) |
| ASCII map | `scripts/blind-ui/ascii-layout.py` | layout.json → 48×24 character grid |
| Anti-patterns | `scripts/blind-ui/anti_patterns.py` | raw-term scan, hardcoded pet names, FAKE_3D, species-hero |
| Scorecard | `scripts/blind-ui/scorecard.py` | runs the evaluator over captures → `<screen>.score.json` |
| Calibration | `tests/blind_ui/` | known-bad FAIL + known-good PASS + detector unit tests |

## Runtime hooks

- Web: `window.__PLI_3D_MANIFEST__` published by `apps/web/components/three/pet3d-viewer.tsx` (test/debug only).
- Mobile: the WebView page exposes `__PLI_GET_MANIFEST` / `__PLI_REQUEST_MANIFEST` and posts `{type:"manifest"}`; `Pet3DViewer` logs it on the `[plimanifest]` logcat channel for the Android extractor. Production owner UI never shows manifest data.

## Honest limits

- Machine acceptance proves structure/layout/runtime facts — never aesthetics.
- `HUMAN_VISUAL_ACCEPTANCE` stays `PENDING` until the user reviews the contact sheets.
