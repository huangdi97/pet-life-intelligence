# 视觉构成 V2 — 无视觉模型机器验证报告

## 方法

不使用任何视觉模型（VLM/OCR/CLIP/SAM/aesthetic critic）。全部判断来自：

- DOM/a11y 几何（`layout.json` / uiautomator bounds）
- 计算样式（`styles.json`）
- RUNTIME 3D manifest（`projectedPetBounds` 投影宠物框 = 模型世界包围盒经真实相机投影，绝不等于舞台容器框）
- 像素统计（PIL+numpy：亮度/暖场占比，仅统计，非语义识别）

## §31 投影占比（全视口语义）

`projectedAreaRatio = projectedPetBounds.area / viewport.area` ——「像用户看到的整屏占比」。

### Web（390×844 视口）

| 屏 | 目标 | 实测 | 契约范围 |
| --- | --- | --- | --- |
| Today | 0.17 | 0.172 | 0.10–0.24 ✅ |
| Pet | 0.21 | 0.214 | 0.14–0.28 ✅ |
| Life | 0.27 | 0.275 | 0.18–0.36 ✅ |
| Review | 0.23 | 0.234 | 0.16–0.30 ✅ |

### Android（WebView 216–253 CSS px 宽）

| 屏 | 实测 | 契约范围 |
| --- | --- | --- |
| Today | 0.120 | 0.10–0.24 ✅ |
| Pet | 0.151 | 0.14–0.28 ✅ |
| Life | 0.197 | 0.18–0.36 ✅ |
| Review | 0.166 | 0.16–0.30 ✅ |

## 取景机制

`fitOrbitRadius`（`packages/pet-3d/src/manifest.ts`）：以「投影框占全视口比例」为控制量迭代半径（面积 ∝ 1/d²），把真实渲染尺寸钉在契约区间内，任意舞台宽高比（桌面/竖屏/手机）均成立；reset 恢复 fitted canonical（reset≈canonical 门禁精确）；缩放钳位相对 fitted 基线（避免竖屏下 4.6→7 跳变）。

## 水平居中 / 舞台占比

- twin 水平居中：4 屏 × 双端全部 ≤10% 偏差（✅）。
- 舞台高度/面积比：Web 与 Android 全部落在契约区间（lifeview stage 0.617/0.411、review 0.499 等，见各屏 score.json）。

## 结论

4 个 Hero 屏视觉构成维度双端满分（Web 100/100；Android 除 `stage.interactive` 非 critical 外全过）。
