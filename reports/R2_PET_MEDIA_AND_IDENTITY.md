# R2_PET_MEDIA_AND_IDENTITY — 宠物媒体与身份报告

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §14-§15 / §66（Media System / Demo Pet Media / Image Provenance）与 §80 Gate

## 1. Media System 落地

统一 PetMedia Presentation Layer（`apps/mobile/src/components/media/PetMedia.tsx`）：

- Variants：portrait / hero / square / timeline / full-bleed（各定义高度/圆角/glyph 尺寸）。
- 优先级（代码顺序）：photo uri > species visual > letter（letter 为 opt-in badge，永不作主视觉）。
- 图片本身提供视觉边界，无白 Card wrapper。

配套：

- `PetSpeciesGlyph.tsx`：矢量 dog/cat/paw 图形（暖品牌底色）；
- `PetAvatar.tsx`：列表/上下文小型视觉（Quick Log / Assistant / Companion）；
- `demoPetVisual.ts`：`resolvePetMediaUri()`（photo > null）+ `DEMO_MEDIA_PROVENANCE = "DEMO/SYNTHETIC"`。

## 2. Demo Pet Media（本轮事实）

- 目标 §15 的完整 Demo Media Set（hero portrait / full body / indoor / outdoor / resting / activity / close-up）**本轮未生成**：本机无可用 image model。
- 用户批准（2026-09-26）为 **ACCEPTED_LIMITATION**：PetHero / PetMedia 使用 warm species-visual 代替照片。
- 呈现优先级与 photo 管道（photo > species visual）完整保留，未来 media 直接接入即可。
- Demo 环境全局标记「示例数据」（PetHero/LifeView demoChip），不逐张水印；数据层 provenance 保持 DEMO/SYNTHETIC，不进 real Pilot metrics。

## 3. Provenance（§66）

- Generated media 与 RECORDED / LIVE 明确区分；本轮无生成媒体，无 LIVE 误标风险。
- UI 只显示用户语言来源（主人记录 / 设备记录 / 专业人员 / AI 整理）。

## 4. Pet Identity 呈现

- PetHero：名字 + 标题 + 身份行（物种/品种/年龄）+ 时间 chip，占首屏高 30–45%（Today 290 / Pet 300）。
- PetMedia/PetAvatar：photo-first，无文字圆形头像作为主视觉（§1.4 根因修复）。

## 5. Checklist（§80 相关项）

| 检查 | 结果 |
|---|---|
| LETTER_AVATAR_PRIMARY = 0 | PASS（主视觉为 species visual；letter 仅 opt-in badge） |
| 有照片时主视觉非字母头像 | PASS（photo 管道顺序保持；本轮无照片属 ACCEPTED_LIMITATION） |
| Media provenance = DEMO/SYNTHETIC | PASS（demoPetVisual.ts DEMO_MEDIA_PROVENANCE） |
| Demo 标记不破坏 UI（全局「示例数据」，非逐张水印） | PASS |
| Pet Media Audit（§120） | PASS（19 张截图验证 species visual 呈现稳定） |

## 6. 证据

- 代码：PetMedia.tsx / PetHero.tsx / PetSpeciesGlyph.tsx / PetAvatar.tsx / demoPetVisual.ts。
- 截图：wave-02-pet-life-view/after/pet-390.png、lifeview-390.png；final/_s_04_Pet.png、_s_05_LifeView.png。
- 像素：warm 0.30–0.88 主导、white 0–25%（V4 方向客观证据）。

## 7. Remaining

- P2/ACCEPTED_DEFER：真实/生成宠物照片未接入（image model 本机不可用；photo 管道就绪）。
- P2/ACCEPTED_DEFER：Demo Media Set（§15 六姿态）待 image provider 可用后补齐。
