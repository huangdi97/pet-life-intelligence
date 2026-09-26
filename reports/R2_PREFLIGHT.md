# R2_PREFLIGHT — Stage R.2 Preflight

> 阶段：Stage R.2（v0.2.0 Product Experience Reconstruction）· 日期：2026-09-26 · 状态：COMPLETE

## 1. Git 基线

```text
Branch   : feat/pli-v0.2-product-experience-reconstruction
HEAD     : 1b448560379ea544e513ed7a5400139ba86d1d0a
Base     : main @ 6a95593 (docs: align README + CHANGELOG with v0.1.2 release state)
v0.1.2   : tag + artifacts 保留（v0.1.2 tag 存在；artifacts/emulator/v0.1.2/ 完整）
```

分支上自 main 之后的提交（5 个）：

```text
ad35654 feat(mobile): rebuild owner presentation (v0.2 visual system, living canvas, pet world, life stream, pet-aware assistant)
7a1c227 feat(demo): R2 synthetic seed (rich 豆豆/咪咪 + attention/empty scenarios); v0.2.0 app manifest + pli-demo scheme
7c2e1cd feat(mobile): demo deep-link navigation (pli-demo://nav) for deterministic presentation runs
bb4ece7 feat(web+mini): V4 owner experience migration (today living canvas, life stream timeline, pet-aware assistant, V4 tokens)
1b44856 fix(web): owner copy zero gate (no PLI-xxx/raw enums in visible copy), companion graceful empty; remove mobile ProtoTag dead code
```

尚未 merge 到 main；尚无 v0.2.0 tag / release（诚实记录，§120 Git/Push/Release 段）。

## 2. Worktree（Preflight 时刻）

- 已修改未暂存：`tests/e2e-browser/artifacts/test-results/.last-run.json`（Playwright 修复中的运行产物）。
- 未跟踪：`.pi/goal/*`（本轮 GOAL 副本）、`artifacts/emulator/v0.1.2/preview/`、`artifacts/r2-api.{out,err}.log`、`artifacts/visual-reconstruction/`（截图资产，R.2 产出）。
- 未发现已提交用户工作被丢弃；本阶段只新增 docs/ui 与 reports 文档，不改代码。

## 3. 环境

```text
Mobile  : Expo/RN（apps/mobile）· tsc 0 · gradle assembleRelease OK（2026-09-26）
Web     : Next.js（apps/web）· typecheck 0 · next build OK（2026-09-26）
Mini    : Taro（apps/mini）· tsc 0 · taro build --type weapp OK（2026-09-26）
Backend : uvicorn :8800（本地 dev sandbox）· pytest 427 passed · ruff 0
APK     : v0.2.0 · versionCode 4 · scheme pli-demo · cleartext（仅 http:// 内部构建）
Demo    : EXPO_PUBLIC_PLI_DEMO_ENV=1 自动登录 owner@pli.demo + pli-demo://login / pli-demo://nav
```

## 4. Demo 数据

`scripts/r2_demo_seed.py`（idempotent，DEMO/SYNTHETIC，dev-auth sandbox）：

- owner@pli.demo：豆豆（柯基）+ 咪咪（猫）2 天日常生活、行为、训练目标+课时、福利观察；
- demo-attn@pli.dev：宠物「关注」，一条 deterministic URGENT triage 健康事件（attention/danger Today 态）；
- demo-empty@pli.dev：宠物「空空」，无事件（empty Today 态）。

全部排除在 real Pilot metrics 之外（PILOT_MODE=false，PILOT-INTEGRITY INVARIANT）。

## 5. Infra 备注

- 本机唯一稳定 AVD 物理屏 320x480，`wm size` 钳制到 1024x1440 px ≈ 390×549dp；截图按 390dp 宽输出。这是**捕获容量约束**（P2/ACCEPTED_DEFER），不是 UI 问题（用户批准 2026-09-26）。
- 本机无可用 image model：本轮不生成 Demo 宠物照片（ACCEPTED_LIMITATION，用户批准 2026-09-26）；PetHero 使用 warm species-visual。

## 6. Real-world 状态（保持不变）

```text
REAL_PARTICIPANTS = 0
REAL_PETS = 0
PRODUCT_VALIDATION = NOT_YET_OBSERVED
REAL_3D_PROVIDER = EXTERNAL_BLOCKED
PLAY_STORE_SIGNING = EXTERNAL_BLOCKED
```
