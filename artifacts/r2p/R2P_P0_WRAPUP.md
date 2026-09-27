# R2P_P0_WRAPUP — 视觉回归 / CI 修复记录（P0 收尾）

> 日期：2026-09-27 · 阶段：Stage R.2-P P0 收尾（用户已确认不进 P1）
> 目的：把 §41/D7 的 CI 红灯修复、视觉回归的诚实状态、以及复跑方法正式记录在案，
> 供人工验收通过后的 baseline freeze（§59）直接复用。

## 1. D7 — Browser E2E 红灯根因与修复

### 根因（L1 实测）

`.github/workflows/ci.yml` 的 Browser E2E job 存在 **functional/visual 阶段错配**：

```text
functional 阶段（ci.yml:169）  --grep-invert "STAGE-V-VISUAL|VISUAL-V2"
   → 只排除了 V2 链；VISUAL-V3（stage-v3-visual.spec.ts 的 "VISUAL-V3-CAPTURE"、
     visual-regression-v3.spec.ts 的 "VISUAL-V3-01"）不受影响，仍在 functional 阶段
     对“被 functional 用例污染的 dev DB”执行 → V3 截图/对比失败（CI #51 Browser E2E = FAILURE）。
visual 链（ci.yml:186）        --grep "STAGE-V-VISUAL|VISUAL-V2"
   → V3 永远不进入 clean-seed visual 链；ci.yml:170-176 的 reset-demo 也就从未服务于 V3。
```

### 修复（§41 要求，非视觉验收替代品）

```text
ci.yml:169  → --grep-invert "STAGE-V-VISUAL|VISUAL-V2|VISUAL-V3"
ci.yml:186  → --grep       "STAGE-V-VISUAL|VISUAL-V2|VISUAL-V3"
```

含义：functional specs 不再误跑 V3；V3 capture/diff 执行于 functional → reset 确定性 demo DB
（`python -m app.seed`）→ visual 链的正确排序之后。

### 本地验证证据

```text
Playwright functional（CI 同款 grep-invert，prod web :3100 + API :8800）：29/29 PASS
  （含 pwa-share 离线/SW、stage-h2-3d 诚实态、stage-v-3d-runtime、R2P-CORE-01/02）
VISUAL-V3-CAPTURE（clean seed 后执行）：PASS
VISUAL-V3-01 diff vs artifacts/visual-v3-approved：FAIL（预期且受控）
```

## 2. Visual Regression 当前诚实状态（L0 事实）

```text
artifacts/visual-v3-approved/  ：未改动（git status = 干净）—— §40 冻结锁成立
artifacts/visual-v3-current/   ：由 V3-CAPTURE 依新设计再生成（test 运行产物，非 frozen baseline）
visual-v3-failures/            ：V3 差异取证（预期产物）
CURRENT_MAIN_FULL_CI_GREEN     ：FALSE（如实。functional 已修复；V3 diff 待人工验收 → baseline 刷新协议 §59）
R2_RELEASE_ACCEPTANCE_EVIDENCE ：EXISTS
```

为什么 V3 diff 现在必须 FAIL：P0 对 Today / Pet / Life View 三屏做了**有意的呈现层重构**，
approved baseline 是 v0.2.0 旧观感；按 §40/§59 冻结协议，任何 baseline 刷新必须先经过
「意图变更 → 人眼截图复核 → 批准 → clean seed → PLI_UPDATE_VISUAL_BASELINE=1 → freeze →
无 flag 复跑」。本轮距人工验收还差最后一步，故 diff 保持红色 → 这是受控状态，不是缺陷。

## 3. 复跑 runbook（人工验收通过后使用）

```powershell
# 1) baseline 刷新（仅在人工批准后、更新 visual-v3-approved 时）
$env:PLI_UPDATE_VISUAL_BASELINE='1'
cd tests/e2e-browser; pnpm exec playwright test --config=playwright.config.ts -g "VISUAL-V3"

# 2) 无 flag 复跑（日常回归；必须 PASS）
pnpm exec playwright test --config=playwright.config.ts --grep "STAGE-V-VISUAL|VISUAL-V2|VISUAL-V3"

# 前置：API(8800) + prod web(3100) 已启动；functional 阶段后执行 python -m app.seed
# 本地端口：DATABASE_URL=...56532/pli · REDIS_URL=...56632/0（本机 .env 实际值）
```

## 4. P0 阶段最终状态

```text
P0 三屏（Today/Pet/LifeView）实现与取证完成：
  Android pdig5（390×844dp 全高）×3 + Playwright 390/1440 ×6 + contact sheet + before/after + gallery
门禁：mobile tsc OK · web tsc OK · vitest 22/22 · pytest 427 passed · next build OK ·
      expo export OK · gradle assembleRelease OK（x86_64 2m53s）· Playwright functional 29/29 ·
      Android 安装/启动/深链/截图像素核验 OK
术语门：三屏 Owner 可见输出 grep 0 泄漏（BW-/*raw enum/内部 event key）；Playwright Q9 断言 PASS
已知：REAL_3D_PROVIDER=EXTERNAL_BLOCKED · REAL_PETS=0 · imagegen provider 本轮 IMAGE_HTTP_404
      → 采用用户批准的 2.5D 代码层（DEMO/SYNTHETIC）作为 identity 视觉

R2P_PHASE_P0 = WAITING_FOR_HUMAN_VISUAL_ACCEPTANCE（保持不变，未进 P1）
```

## 5. 人工验收后的下一步（不在本轮执行）

1. 用户对 Q1–Q9 给出裁决；
2. 批准后执行 §59 baseline freeze（使用 §3 runbook）；
3. 再决定 P1（其余 10+ 屏继承 P0 design grammar）或版本号（v0.2.1 / v0.3.0）。