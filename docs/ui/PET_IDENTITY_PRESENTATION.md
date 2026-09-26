# PET_IDENTITY_PRESENTATION — 宠物身份呈现规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §1.4 / §14 / §15 / §20 / §66；实现：apps/mobile/src/components/pet/PetHero.tsx、apps/mobile/src/components/media/PetMedia.tsx、PetSpeciesGlyph.tsx、demoPetVisual.ts

## 1. 原则

PLI 的中心是一只具体宠物（Pet-first / Presence / Identity），宠物身份必须有真实视觉承载，而不是「豆」「咪」文字圆形 Avatar（GOAL §1.4）。

## 2. 呈现优先级（代码顺序）

```text
1. Pet real/demo photo（uri，来自 avatar_artifact_id / explicit uri）
2. species visual（矢量物种图形：dog / cat / paw，暖品牌底色）
3. letter fallback（仅 opt-in badge，永不作默认主视觉）
```

实现：`resolvePetMediaUri()`（demoPetVisual.ts）返回 photo uri，无则 null → 组件自动降级 species visual。

## 3. Hero / Avatar 规则

- **PetHero**（Today/Pet 首屏第一视觉焦点）：全宽、底部 scrim、宠物名 + 标题 + 身份行（物种/品种/年龄）+ 时间 chip；占首屏高 30%–45%。
- **PetMedia** variants：portrait / hero / square / timeline / full-bleed；图片自带圆角边界，不再包白卡。
- **PetAvatar**：列表/上下文头（Quick Log「为豆豆记录」、Assistant「豆豆的助手」、Companion）使用小型真实宠物视觉。
- 有照片时禁止继续显示文字圆形头像作为主视觉。

## 4. Demo Media（本轮）

- 豆豆（柯基）/ 咪咪（猫）本轮**没有生成照片**：本机无可用 image model（ACCEPTED_LIMITATION，用户批准 2026-09-26）。
- PetHero / PetMedia 使用 warm species-visual（矢量 glyph），非占位符、非字母头像。
- 分辨率顺序（photo > species visual）与 photo 管道保留，供未来 media 直接接入。
- Demo 媒体 provenance 在数据层保持 **DEMO / SYNTHETIC**（`DEMO_MEDIA_PROVENANCE = "DEMO/SYNTHETIC"`），不进 real Pilot metrics。
- Demo 环境全局标记「示例数据」（PetHero demoChip / Life View demoChip），不逐张水印（§15）。

## 5. Provenance

- Generated media 必须与 RECORDED / LIVE 明确区分（§66）；本轮不存在生成照片，因此也不存在误标 LIVE 的风险。
- UI 可显示自然语言来源（主人记录/设备记录/专业人员/AI 整理）。

## 6. 验收

- §80 Gate：LETTER_AVATAR_PRIMARY = 0（PASS，主视觉为 species visual）；FEATURE_GRID_AS_PRIMARY = 0；PET_WORLD_PASS。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-02-pet-life-view/after/pet-390.png；final/_s_04_Pet.png。
- 像素：warm canvas 主导（warm 0.30–0.88），white 0–25%，与 v0.1.2 白卡 UI 明显区分。
