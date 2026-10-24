# PLI R5.6 Mini Native Visual Evidence Gate

> Scope: final Mini owner-surface visual evidence under the existing v3.4-R1 / R5.6 design authority.
> Status: **SOURCE IMPLEMENTED / NATIVE WECHAT DEVTOOLS EVIDENCE REQUIRES LOCAL DESKTOP RUNTIME**.
> Rule: this gate never sets `HUMAN_VISUAL_ACCEPTANCE=PASS`.

## Why this gate exists

The repository already type-checks and builds the WeChat / Alipay / Toutiao Mini targets in CI. That proves the source compiles; it does **not** prove the actual WeChat Mini runtime composition.

GitHub-hosted Ubuntu runners do not provide the owner's native WeChat DevTools session. Therefore:

- Taro H5/browser screenshots are not accepted as WeChat-native evidence;
- source/build success is not accepted as visual evidence;
- screenshots must come from WeChat DevTools automation on Windows/macOS;
- no OCR, CLIP, VLM or visual-scoring model is needed or permitted for this evidence gate.

The official Mini Program automation model is DevTools + `miniprogram-automator`: open/attach to the project, navigate the real Mini runtime, and save screenshots.

## Required native screenshots

Capture from the **same repository HEAD** into:

```text
artifacts/r5-6-final/mini/
  today.png
  timeline.png
  pet.png
  health.png
  assistant.png
  me.png
  capture-manifest.json
```

These six surfaces correspond to the final R5.6 owner acceptance set. Contextual secondary pages remain covered by source/blind contracts unless a later acceptance pass explicitly promotes them into the human gate.

## Required capture manifest

`capture-manifest.json` must include at least:

```json
{
  "source_head": "<40-char git sha>",
  "source_branch": "feat/r2p3d-r3-render-truth-ui-closure",
  "checkout_head": "<40-char git sha>",
  "platform": "weapp",
  "capture_method": "WECHAT_DEVTOOLS_AUTOMATOR",
  "native_runtime": true,
  "devtools_version": "<actual WeChat DevTools version>",
  "vision_model_used": false,
  "human_visual_acceptance": "PENDING"
}
```

Do not hand-edit this manifest to bless screenshots from another SHA or from an H5/browser build.

## Local capture boundary

Before capture:

1. build the current Mini source with `pnpm --dir apps/mini build:weapp`;
2. open the repository Mini project in WeChat DevTools;
3. enable DevTools CLI/HTTP and Automation;
4. use the DevTools Automator connection to navigate the six canonical surfaces;
5. save native screenshots using the names above;
6. record the exact source HEAD and DevTools version.

The capture mechanism may be a local agent or a small `miniprogram-automator` runner, but the evidence must still originate from the native WeChat DevTools runtime.

## Deterministic post-capture gate

After the six native screenshots exist, stamp the exact repository and DevTools provenance, then build the contact sheet:

```bash
node scripts/r5-6/stamp-mini-final.mjs --devtools-version "<actual WeChat DevTools version>"
python scripts/r5-6/contact_sheets_ci.py --platform mini
```

The complete all-platform package can then run `python scripts/r5-6/contact_sheets_final.py` followed by `python scripts/r5-6/validate-final-evidence.py`. The final validator repeats the native-WeChat provenance checks so the gate cannot be bypassed by supplying six arbitrary PNG files.

The script fails loudly when:

- any required screenshot is missing or invalid;
- `source_head` is missing;
- capture method is not `WECHAT_DEVTOOLS_AUTOMATOR`;
- `native_runtime` is not `true`;
- the actual DevTools version is absent;
- `vision_model_used` is not `false`.

On success it writes:

```text
artifacts/r5-6-final/contact-sheets-ci/PLI_R5_6_MINI_OWNER.png
artifacts/r5-6-final/contact-sheets-ci/mini-manifest.json
```

This is a human-review artifact only. It does not promote visual baselines, merge PR #2, create a stable release, or infer Human Visual Acceptance.

## Final governance

```text
MINI_SOURCE_BUILD = CI_GATED
MINI_NATIVE_RUNTIME_EVIDENCE = LOCAL_WECHAT_DEVTOOLS_GATE
MINI_H5_AS_NATIVE_EVIDENCE = FORBIDDEN
NO_VISION_MODEL_USED = TRUE
HUMAN_VISUAL_ACCEPTANCE = PENDING
PR_2 = OPEN
```
