# Blind Contract V2 — 机器门禁报告

- Commit：`e5023bc`（V2 契约层）+ `da89cf7`（identity/framing 适配）
- 相关文件：`packages/visual-contract/src/types.ts`、`evaluate.ts`、`schema/screen-contract.schema.json`、`schema/twin-contract.schema.json`、`scripts/blind-ui/evaluate-contract.mjs`（消费 dist）

## V2 契约层（8 维）

| 维度 | 分值 | 内容 |
| --- | --- | --- |
| individualPetTruth | 25 | identity.gate（generic=false + petId 匹配 + sourceMediaCount≥2）、manifest-origin=RUNTIME、no-fallback、wireframe=false |
| visualComposition | 20 | twin 水平居中 ≤10%、projectedPetBounds 区间、pixel-style 暖场 |
| informationHierarchy | 15 | 摘要/模式/面板等真实元素 |
| surfaceGovernance | 10 | CARD/SOFT_PANEL 数量上限（above-fold） |
| contentPurity | 10 | 原始内部 token 零出现（`演示 3D`、`未来连接真实服务`、`BW-`、`OWNER_REPORTED` 等） |
| interactionTruth | 10 | disabledWhen selected（twin review 不像→激活禁用）、真实 disabled/selected |
| accessibility | 5 | 可访问按钮/tab/文本计数 |
| pixelStyleTruth | 5 | style-truth（computed bg 非暗 debug viewer）+ 像素暖场 |

V2 新增 check kinds：`manifest-origin`、`identity`、`camera`（rotate yaw Δ≥0.03 / zoom distance Δ≥0.05 / reset 偏差≤0.05）、`pixel-style`、`style-truth`、`interaction(disabledWhen)`。移除 `unlessPlatform`（不再按平台豁免）。

## 校准测试

`tests/blind_ui`：32/32 通过（`known_bad_synthetic` / `generic_demo` / `android_glyph_*` fixtures 校验 V2 门禁拒绝合成/generic/演示清单；camera/zoom/pixel/near-identical 门禁有回归测试）。

## 捕获/提取器真值路径

- Web：`capture-web.mjs` 读取真实 DOM（disabled/aria/selected）与 `window.__PLI_3D_MANIFEST__`；twinreview 的 verify POST 被路由拦截（点击真实、DB 不被污染）。
- Android：`capture-android.ps1`（demo-link 驱动）读取 `adb root cat /data/data/com.pli.mobile/files/pli_manifest.json`（release 无 logcat 通道）；`android_extract.py` 从 uiautomator 属性（enabled/selected）读交互真值；tab 语义适配（RN 在 Android 无 tab role，按语义 id + clickable/selected 重推导）；去重优先 interactive/selected 节点。
