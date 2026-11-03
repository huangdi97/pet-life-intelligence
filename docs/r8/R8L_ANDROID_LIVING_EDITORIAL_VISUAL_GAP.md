# PLI R8L · Android Living Editorial first-fold fidelity

## Source of truth

A real screenshot from successful Android Actions run `38325190862` (source SHA `36e0fb57`, `r5-6-android-runtime-evidence`, artifact ID `11781505006`) was inspected alongside `pet.png` and `r8-owner-review/source-backed-case.png`. The rigged RUNTIME manifests and RN first-paint gates were successful, but **the product quality is not accepted**:

- Pet page: a large stylized generic 3D dog intersects the stage-rendered `最近记录了用药` and age/breed/sex lines; critical individual identity copy overlaps the animal's visible face.
- Today R8 case: a change summary's percentage/sample explanation is repeated immediately underneath as `evidenceHint`, visually duplicating one calculation.
- The 3D is explicitly generic `示例数据`, not an owner-confirmed individual pet. Neither compositor readiness nor UI test acceptance upgrades its identity evidence or likeness.

## Implemented R8L candidate

1. Leave Pet Living Stage name and genuine selected pet identity inside the hero, but pass **no mid-stage headline or profile-caption text**. Render age/breed/sex in a short calm subline *under* the pet media and *before* the Life View entry. Keep the last real event in existing `豆豆最近` instead of printing it over the animal and again below.
2. In compact Today `ChangeNarrative`, suppress the secondary evidence line **only when its literal text already appears inside the primary summary**. Continue showing `为什么`; the expanded fact/comparison/uncertainty/next action is unchanged and never discarded. A different meaningful evidence line still appears.
3. Add Blind Visual Contract checking separation and preservation of evidence drill-down; do not waive previous screenshot or pet identity checks.

## Still blocked / not falsely promised

- Actual individual 3D appearance quality remains `BLOCKED_BY_SOURCE_ASSET`; no owner-supplied confirmed pet reconstruction provided. Demo low-poly surface is NOT a personalized Twin and must stay labeled demo.
- Exact new SHA must pass mobile typecheck, Backend/Frontend/Playwright, full Android build and same-HEAD screenshots, including Today/Pet/R8 review.
- Human visual approval, source-media quality and real Android phone install remain PENDING.
- No tag, merge, Release or screenshot baseline promotion. `NO_VISION_MODEL_USED = TRUE`.
