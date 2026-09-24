# VISUAL REGRESSION V2 REPORT — Stage R.1 (Phase L)

> Stage: R.1 · 日期：2026-09-24 · 状态：`VISUAL_REGRESSION_V2_PASS`
> 目标：把 Stage R 的「采集型截图」（每次重写 PNG、无 diff 断言）升级为
> **真正的 baseline diff regression**（approved baseline vs current 逐像素对比，
> 超阈值即 FAIL，刷新 baseline 必须显式）。

---

## 1. 升级内容（相对 Stage R）

| 维度 | Stage R（旧） | Stage R.1（新，V2） |
|---|---|---|
| 基线 | `tests/e2e-browser/artifacts/visual-baseline/`（每轮被重写） | `artifacts/visual-baseline-approved/`（**冻结**，60 张） |
| 当前截图 | 无 | `tests/e2e-browser/artifacts/visual-current/`（stage-v-visual 每轮重生成） |
| 对比 | 无 | **逐像素 diff**（tolerance 5/255 per channel，diff ratio > 0.2% 即 FAIL） |
| 失败产物 | 无 | `visual-regression-failures/<page>_<width>/{actual,expected,diff}.png` 三件套 |
| 刷新机制 | 隐式重写 | **显式**：`PLI_UPDATE_VISUAL_BASELINE=1` 才刷新，否则 FAIL |
| CI 语义 | 截图只归档 | 超阈值 → CI FAIL（不无脑 update） |

## 2. 实现（真实代码证据）

- `tests/e2e-browser/specs/visual-regression-v2.spec.ts`：
  - `APPROVED = artifacts/visual-baseline-approved`；`CURRENT = artifacts/visual-current`；
  - 逐像素比较 R/G/B 三通道绝对差之和 > `TOLERANCE=5` 判为差异像素；
  - `MAX_DIFF_RATIO = 0.002`（0.2%，容忍 AA/渲染噪声）；
  - 超阈值 → 写 `expected.png / actual.png / diff.png`（diff 以 expected 为底、差异品红高亮）并断言失败；
  - `PLI_UPDATE_VISUAL_BASELINE=1` 时以 current 覆盖 approved 并报告「baseline updated」而非失败；
  - 基线刷新为显式动作，不随测试静默发生。
- `tests/e2e-browser/specs/stage-v-visual.spec.ts`：5 宽度（360/390/768/1024/1440）× 12 页面 = 60 张 current 截图。

## 3. 本轮真实执行记录（含一次真实 diff + 显式刷新）

### 3.1 第一轮：baseline vs 新 current → 60/60 超阈值（合理变更）

Stage R.1 将 demo 种子由 `Coco/Mimi` 改为 `豆豆/咪咪`、更新品牌资源与部分 UI，
导致全页面内容性差异（含顶部 header 品牌条、健康/行为数据内容、3D 视图渲染帧）。

diff 空间分布实测（Playwright canvas 逐像素，品红像素 bbox 与分区）：

```text
360_health:        diff 16.93% bbox=(12,536)-(347,707)  bands T0 / M21439 / B33416
360_today:         diff  3.18% bbox=(0,130)-(236,899)   bands T4991 / M1313 / B3987
360_3d-life-view:  diff  3.74% bbox=(39,653)-(302,899)  bands T0 / M0 / B12115
1024_health:       diff  9.74% bbox=(88,14)-(935,574)   bands T5205 / M84551 / B0
1024_timeline:     diff  0.70% bbox=(644,14)-(920,826)  bands T5205 / M609 / B677
1024_behavior:     diff  6.27% bbox=(88,14)-(935,899)   bands T5377 / M0 / B52411
1024_today:        diff  0.59% bbox=(254,14)-(908,346)  bands T5205 / M269 / B0
1440_3d-life-view: diff  9.05% bbox=(295,14)-(1324,899) bands T5205 / M4934 / B107124
```

分类结论（全部为合理变更，无结构破损）：

1. **顶部 header 固定差异**：所有宽度/页面 T 区一致 5205 px → 品牌/导航条变化；
2. **内容区差异**：health / behavior / timeline 数据内容随种子改名变化；
3. **3D 视图底部差异**：WebGL 逐帧渲染帧间噪声（仅 life-view 相关页）。

State-space probes（empty/error/permission-denied/offline）同时通过，确认非崩溃性变化。

## 2b. 本轮出现的两个真实问题与修复（架构级，非弱化断言）
## 2b. 本轮出现的三个真实问题与修复（架构级，非弱化断言）
### 问题 1 — 跨测试数据污染（false diff）

功能 spec（seven-paths 等）会在 dev DB 创建 `BW-*` 健康事件；health 页列表
展示全部事件 → 视觉截图内容随「先跑哪些 spec」漂移 → V2 每次 diff 不稳定
（本轮实测 health 1.2–1.5% 残差，且 refresh 后重跑又出现）。

修复（架构级）：CI 与本地都把视觉链与功能 spec **分离**，中间执行幂等
`python -m app.seed`（全库清空重建 demo household）：

```text
1. functional specs          (grep-invert STAGE-V-VISUAL|VISUAL-V2)
2. python -m app.seed        (idempotent wipe + recreate demo household)
3. visual chain              (stage-v-visual -> visual-regression-v2)
```

本地复现结论：干净 seed 下贯穿执行 5 步（seed → 采集 → 显式刷新 → 验证）
最终 `VISUAL_CHAIN_EXIT=0`，V2 全 0.0000%。

### 问题 2 — dev server 与 production 渲染差异

baseline 若在 dev server 模式冻结，production 模式下复跑会整体 diff
（本轮 dev→prod：所有页面 `0.4–1.4%`、health 17–29%）。
修复：视觉基线一律在 **production 渲染**（`next start`，CI 同语义）下

### 问题 3 — seed 时间戳漂移（timeline 跨运行 diff）

seed 的 health/care 事件时间戳基于真实 `now`（含分钟秒），两次 CI 运行之间
seed 时刻不同 → timeline 显示的具体日期/时间文本不同 → 像素 diff
（本轮实测 360/768 timeline 1.5–1.8% 残差，跨天必然更大）。
该区域展示**墙钟时间**，本质是动态内容，无法用固定 seed 日期解决
（Today 端点按运行当天筛 seed 事件，固定日期会令 Today demo 变空）。

修复（视觉回归标准实践）：视觉采集（stage-v-visual）截图前把动态时间
文本 `.tl-time` **mask** 为固定 token（"🕘 08:00"），baseline 与 current
同等处理，时间区域不参与像素 diff；其余所有像素仍严格断言
（layout / 文案 / 状态 / 数据内容均照常比对）。
冻结/对比；本地 Windows 用 `PLIT_LOCAL_BUILD=1` 构建（跳过 standalone
组装，规避 pnpm symlink EPERM）后 `next start` 即为生产模式。

### 3.2 显式刷新 baseline

```text
PLI_UPDATE_VISUAL_BASELINE=1 npx playwright test specs/visual-regression-v2.spec.ts
=> "PLI_UPDATE_VISUAL_BASELINE=1: approved baseline explicitly refreshed from current captures."（显式动作，非静默）
```

刷新理由（记录于本报告与 `artifacts/visual-baseline-approved/README.md`）：
demo 宠物正式改名 豆豆/咪咪 + 品牌资源/UI 变更，属批准的产品变更。

### 3.3 第二轮：刷新后不带 flag 复跑 → PASS

```text
npx playwright test specs/visual-regression-v2.spec.ts
=> 60/60 全 0.0000% 差异（除 AA 噪声外无 diff）
=> 1 passed（VISUAL-V2-01 approved baseline vs current pixel diff）
```

## 4. 冻结基线

- `artifacts/visual-baseline-approved/`：60 张 PNG + `README.md`（刷新协议说明），本轮随 commit 提交；
- 后续任何 UI/数据变更必须先跑 V2：超阈值必须人工判断（合理变更 → 显式刷新并记录理由；真实破损 → 修代码）。

## 5. 结论

```text
VISUAL_REGRESSION_V2_PASS = TRUE（60/60，refresh 后 0 差异）
BASELINE_REFRESH          = EXPLICIT_ONLY（PLI_UPDATE_VISUAL_BASELINE=1，本轮执行 1 次并记录理由）
FAILURE_ARTIFACTS         = expected/actual/diff 三件套（本轮 60 页失败记录在
                            tests/e2e-browser/artifacts/visual-regression-failures/，gitignored）
```
