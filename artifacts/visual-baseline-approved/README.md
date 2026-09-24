# Visual Baseline — APPROVED (frozen)

Stage R.1 Visual Regression V2 (Phase L). This directory is the **frozen,
human-approved pixel baseline**. It is compared against fresh captures every
Playwright run; an over-threshold diff **fails CI** (with actual/expected/diff
trios under `tests/e2e-browser/artifacts/visual-regression-failures/`).

## Origin / migration

- The 60 PNGs were migrated on 2026-09-24 (Stage R.1) from
  `tests/e2e-browser/artifacts/visual-baseline/` (the Stage V/R capture-only
  baseline) via `git mv` — byte-identical, no re-render.
- They were re-approved after the v0.1.1 UI changes (demo pets 豆豆/咪咪,
  brand assets, web env fixes) by an **explicit** baseline refresh
  (`PLI_UPDATE_VISUAL_BASELINE=1`, see below), then frozen again.

## Layout

```
<width>_<page>.png        e.g. 1440_today.png
```

- Widths: 360 / 390 / 768 / 1024 / 1440 (covers the required ≥360/390/768/1440).
- Pages: today, timeline, pet, 3d-life-view, health, assistant, companion, me,
  behavior, training, capture-wizard, 3d-verification (12 pages × 5 widths).

## Data-state precondition (Stage R.1 hardening)

Captures are **only reproducible against a clean seed**. Functional specs
(seven-paths etc.) create BW-* pets/health events in the dev DB, so a visual
chain started after functional specs would capture different list contents
every run (false diffs on health/timeline). CI therefore runs:

```text
1. functional specs          (grep-invert STAGE-V-VISUAL|VISUAL-V2)
2. python -m app.seed        (idempotent wipe + recreate demo household)
3. visual chain              (stage-v-visual -> visual-regression-v2)
```

Local equivalent:
`powershell -File scripts/run-visual-chain.ps1` (or manually: seed reset,
then run the two visual specs). Never compare visuals against a DB polluted
by functional test runs.

## Compare rules (scripts)

- Run full capture + compare (normal gate):
  `pnpm exec playwright test --config=tests/e2e-browser/playwright.config.ts`
- **Explicit baseline refresh** (never automatic; requires a human/agent
  decision that the new pixels are the new truth):
  ```powershell
  $env:PLI_UPDATE_VISUAL_BASELINE = "1"
  pnpm exec playwright test --config=tests/e2e-browser/playwright.config.ts \
    tests/e2e-browser/specs/stage-v-visual.spec.ts tests/e2e-browser/specs/visual-regression-v2.spec.ts
  ```
  With the flag set, the compare step copies `visual-current/*` over this
  directory and reports "baseline updated" instead of failing.
- Threshold: per-channel tolerance 5/255; max differing-pixel ratio 0.002
  (0.2%); config in `tests/e2e-browser/specs/visual-regression-v2.spec.ts`.

## Updating the baseline is a deliberate act

- Do **not** "approve" diffs by lowering the threshold or deleting baselines.
- Every refresh should be reflected in `reports/VISUAL_REGRESSION_V2_REPORT.md`
  (before/after evidence) and named in a commit message.

## Files

Recorded on freeze (v0.1.1):
| file | width | page | notes |
|---|---|---|---|
| 60 × `<w>_<page>.png` | 360/390/768/1024/1440 | 12 pages | approved 2026-09-24 after v0.1.1 UI |

(Individual entries listed by `git ls-files artifacts/visual-baseline-approved`.)