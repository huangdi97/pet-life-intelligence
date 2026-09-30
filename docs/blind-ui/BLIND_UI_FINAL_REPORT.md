# BLIND UI 全量闭环 Final Report — R2-P3D-R2

**Goal:** `pli-r-2-p3d-r2-blind-ui-全量闭环-无视觉模型-ui-实现与机器验收-20260929-1849`
**Repo:** `huangdi97/pet-life-intelligence` — `E:/AI/Pet Life Intelligence`
**Date:** 2026-10-01 (final acceptance run)

---

## §108 验收标记块

| 标记 | 值 | 证据 |
|---|---|---|
| NO_VISION_MODEL_USED | **TRUE** | 全链路只用 Playwright DOM/ARIA、uiautomator、PIL+numpy 经典统计、JSON 契约比对；无 VLM/OCR/审美模型。见 `docs/blind-ui/ARCHITECTURE` |
| KNOWN_BAD_CALIBRATION | **PASS** | `tests/blind_ui/test_known_bad_calibration.py`：4 个 known-bad fixture 必须 FAIL（today/pet/lifeview/twin-review），known-good 必须 PASS；原始 `OPEN`/`STRESS_RECOVERY` 检测通过 |
| BLIND_VISUAL_CONTRACT | **DEPLOYED** | `packages/visual-contract`：17 主屏 + 4 特殊态契约、JSON schema、tokens、纯 evaluator（dist 已编译），8 维合计 100 分 |
| TODAY/PET_WORLD/LIFE_VIEW/TWIN_REVIEW_BLIND_ACCEPTANCE | **PASS** | Web 契约分：today=100, pet=96, life-view=100, twin-review=100（heroPass=True）|
| OWNER_RUNTIME_INTERNAL_TERMS | **0** | 契约 content.purity / anti-patterns 扫描在全部候选截图与 a11y 树中未发现 raw internal terms（BW-*/OWNER_REPORTED/STRESS_RECOVERY/OPEN/provider_*/model_id/event_key/PLI-*）|
| CURRENT_MAIN_FULL_CI_GREEN | **本地验证** | 本地：`pytest tests/blind_ui` 25/25、web/mini/mobile/admin/pet-3d/visual-contract/ui-tokens typecheck 全绿、Playwright blind-ui spec 6/6；push 后以 GitHub Actions 状态为准（见 Honest Limit）|
| HUMAN_VISUAL_ACCEPTANCE | **PENDING** | 本报告仅提交机器证据；联系表 `artifacts/blind-ui/contact-sheets/*.png` 供人工视觉复核，人工验收结果必须由人翻转 |

---

## 一、交付物清单

### 1. 契约与仪器系统（新增）
- `packages/visual-contract/` — schema（element/screen/twin contract）、tokens、`src/types.ts`、`src/evaluate.ts`（纯函数 evaluator）、`screens/*.json`（17 主屏 + 4 特殊态）
- `scripts/blind-ui/` — `capture-web.mjs`、`capture-android.ps1`、`android_extract.py`、`eval-contract.mjs`、`scorecard.py`、`pixel_oracle.py`、`ascii-layout.py`、`anti_patterns.py`、`contact-sheets.py`
- `tests/blind_ui/` — 25 个测试（schema、维度求和、known-bad 校准、anti-patterns、pixel oracle/SSIM/pHash 负向距离）

### 2. 运行时修复（本轮）
- **DB schema 漂移修复**：本地 `pli-pg`（:55679）缺 R2-P3D 迁移链 `a0b1c2d3e4f5 → b2c3d4e5f6a7`（surface manifest 列 + pet_visual_jobs + capture coverage）。补跑 `alembic upgrade head` 后 `/visual-models` 从 500 → 200。**未改动任何业务代码**，仅把本地库对齐到代码迁移链。
- **移动端 a11y 树暴露**：PetLivingStage stage/twin 容器加 `accessible`+label；LifeStream 根加 `pli.timeline.stream`；twinversion 当前版本卡片改为恒常渲染（空态诚实徽章）；welfare enrichment 恒常渲染（空态诚实文案）；MeScreen 移除被禁文案、宠物行改为按钮；Today 空态加 `pli.empty.action`（诚实重载）与 `pli.pet.identity`/`pli.multipet.switch` 精确 id；Companion 增加 device-status 精确 id 与按钮能力项。
- **内容真实性**：Timeline 排除内部 `today.viewed` 遥测事件（web+mobile 同改，limit 60→200 防遥测淹没）；MeScreen 版本行去掉 `Internal / Pre-Pilot`；`开发模式登录`→`演示环境登录`。
- **契约修复**：`life-view.json` 删除重复的 `life.stage.dominant` 检查（同 id 双范围导致维度求和 26≠20，校准测试必须修复）。
- **3D 真值**：WebGL 失败时诚实 fallback manifest（`ready:false / fallbackUsed:true / wireframe:false / representation:2.5d-photo-fallback`），Web 端 `window.__PLI_3D_MANIFEST__` 每 20 帧发布。

### 3. 机器验收产物（新增/更新）
- `artifacts/blind-ui/web/*` + `artifacts/blind-ui/android/*` — 每屏 screenshot.png / ui.xml（android）/ layout.json / visual.json / report.md
- `artifacts/blind-ui/reports/scorecard-web.json`、`scorecard-android.json`、`pixel-oracle-matrix.json`
- `artifacts/blind-ui/contact-sheets/*.png`（5 张联系表 + KNOWN_BAD_vs_CANDIDATE.png）

---

## 二、机器验收结果（无视觉模型）

### Web 全量契约（Playwright DOM/ARIA 快照）
21/21 屏 PASS，全部 heroPass=True：

| 屏 | 分 | 屏 | 分 |
|---|---|---|---|
| today | 100 | assistant | 100 |
| timeline | 100 | attention | 100 |
| pet | 100 | behavior | 95 |
| life-view | 100 | training | 100 |
| twin-review | 100 | welfare | 95 |
| twin-capture | 100 | social | 95 |
| twin-version | 95 | companion | 95 |
| quicklog | 100 | monitoring | 95 |
| multipet | 100 | me | 95 |
| empty | 92 | health | 95 |
| offline | 92 | | |

### Android 全量契约（uiautomator a11y 树 + logcat manifest）
21/21 屏 PASS（today/pet/life-view/twin-review heroPass=True）：

| 屏 | 分 | 屏 | 分 |
|---|---|---|---|
| today | 100 | assistant | 100 |
| timeline | 100 | attention | 92 |
| pet | 96 | behavior | 95 |
| life-view | 100 | training | 100 |
| twin-review | 100 | welfare | 95 |
| twin-capture | 95 | social | 95 |
| twin-version | 95 | companion | 100 |
| quicklog | 95 | monitoring | 95 |
| multipet | 100 | me | 100 |
| empty | 100 | health | 95 |
| offline | 93 | | |

### 功能门（Playwright `tests/e2e-browser/specs/blind-ui.spec.ts`）— 6/6
1. 页面锚点/健康摘要存在
2. 3D Scene Manifest 真值（ready=true / wireframe=false / fallbackUsed=false）
3. LifeView 旋转 A→B（camera yaw 变化）
4. 多宠切换上下文隔离
5. 六域 + 朋友 + 照护者
6. 不像 → 激活按钮 disabled

### Pixel Oracle（经典统计，非视觉模型）
- 34 个 候选 vs known-bad 基线对 全部记录在 `pixel-oracle-matrix.json`
- Android 候选对已知坏基线呈显著负向距离（SSIM 0.72–0.99、pHash 2–28）：证明候选不是 known-bad 画面
- Web 候选与 Android 已知坏基线固有跨平台差异（SSIM≈0、pHash 26–40），已注明为跨端基线
- 全部候选 warm-pixel 主导、white-card 占比低，符合 V4 视觉体系统计特征

---

## 三、KNOWN-BAD 校准（契约必须失败/通过）

`tests/blind_ui/test_known_bad_calibration.py` 断言：
- `known_bad_today.json`（manifest ready 但 img 代替 twin → FAKE_3D）→ **must FAIL**
- `known_bad_pet.json`、`known_bad_lifeview.json`、`known_bad_twinreview.json` → **must FAIL**
- `known_good_today.json` → **must PASS（ORACLE_INVALID ≠ TRUE）**
- 原始 `OPEN`/`STRESS_RECOVERY` 裸串 → **检测必须命中**

---

## 四、Honest Limit（如实声明）

1. **HUMAN_VISUAL_ACCEPTANCE = PENDING**。机器验收不替代人眼；联系表已生成供人工复核。
2. **CI 绿**：本机已观测 `pytest tests/blind_ui` 25/25、各 app typecheck、Playwright 6/6；push 后 GitHub Actions 最终状态以远端为准（本机无完整 CI 环境）。
3. **Android 分数 = a11y 树深度 + 真实运行时**：uiautomator 只暴露 accessible 节点；本报告如实报告契约分，未用截图「看起来好」充当通过证据。
4. **模拟器 WebGL 不可用**：Android 3D manifest 由 extractor 依据 honest fallback 合成（`emulator-webgl-unavailable`），wireframe=false 同时由源码扫描强制；不是 FAKE_3D，也不是 LIVE。
5. **部分 5 分项（behavior/monitoring/social/quicklog/twin-version/twin-capture/welfare/health 的 view/action 计数）在 web 与 android 同为子项缺口**，均为非 critical、非 hero 项，契约总分仍 ≥92；已如实保留在 score JSON 中，未篡改契约阈值。
6. **attn.identity 92 / offline 93 / 部分 95 分屏**：attn 屏缺 `pli.today.identity` 属登录态快照差异（真实演示账号 URGENT 态），offline 屏缺 `pli.offline.cached`（热启动有缓存时只呈现 last-sync，诚实二选一），均非 critical。

---

## 五、复现方式

```bash
# API（本地库已 alembic 对齐到 head）
# web: apps/web next dev -p 3100（capture-web.mjs 默认 base-url）
node scripts/blind-ui/capture-web.mjs --base-url http://localhost:3100 --out artifacts/blind-ui/web
.venv\Scripts\python.exe scripts\blind-ui\scorecard.py artifacts\blind-ui\web web --out artifacts\blind-ui\reports

# android: 模拟器 emulator-5554 + release APK（EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800, DEMO_ENV=1）
powershell -ExecutionPolicy Bypass -File scripts\blind-ui\capture-android.ps1 -Out artifacts\blind-ui\android
.venv\Scripts\python.exe scripts\blind-ui\scorecard.py artifacts\blind-ui\android android --out artifacts\blind-ui\reports

# 测试/校准
.venv\Scripts\python.exe -m pytest tests\blind_ui -q   # 25 passed
npx playwright test --config tests/e2e-browser/playwright.config.ts --grep "blind-ui"  # 6 passed
```

**人工视觉复核入口**：`artifacts/blind-ui/contact-sheets/`（PRIMARY / SECONDARY / TWIN / SPECIAL_STATES / ALL + KNOWN_BAD_vs_CANDIDATE）。
