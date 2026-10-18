# PLI R8AM · Mini 补录闭环与 Web 浏览器回归

2026-10-18。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AL 关闭了 Web 的真实观察补录闭环，但 Mini 仍只能读 Case、追加非观察类决定；
同时 R8AL 的浏览器闭环只是本地临时脚本，没有沉淀为仓库内 Playwright 回归。

## 已实现

### 1. Mini 补录真实观察（同宠、同指标、同一 Case）

- `apps/mini/src/utils/caseFollowUp.ts`：
  - 指标 → 真实事件类型映射（三个 R8 指标），未知指标返回 `null`；
  - 临时意图通过平台存储传递（Tab 页无法用 `switchTab` 携带 URL 参数），
    读取即删除；被篡改/未知的存储结构直接丢弃；
  - 关联前重新读取 Case，校验 `pet_id`/`case_id`/`source_valid`，以最新 Review 作 CAS token；
  - 每个真实事件一个幂等键 `r8-mini-observation-{eventId}`；
  - 事件已保存但关联失败时返回诚实文案，不回滚记录。
- Case 详情新增“记录一条真实观察”：写入意图 → `switchTab` 到 Today。
- Today：`useDidShow` 消费一次意图；宠物不一致时**不静默切换**，显示切换按钮；
  切换后自动打开该指标唯一对应的真实 Quick Log；保存成功后关联并跳回
  `/pages/observations/detail/index?...&linkedEvent=…`，详情显示关联提示。

### 2. Web 闭环固化为 Playwright 回归

新增 `tests/e2e-browser/specs/r8-followup.spec.ts`：

1. 通过 API 以真实 owner 创建独立宠物、3 天历史散步 + 当日散步、重算基线、创建 Case；
2. 浏览器带 `followUpCase/followUpPet/followUpMetric` 进入 Today；
3. 断言补录提示与“散步”记录类型；保存 25 分钟；
4. 断言跳转到同一 Case 详情且显示关联提示；
5. 通过 API 复核该 Case 恰好 1 条 `RECORD_OBSERVATION`、`related_event_ids` 等于 URL 中事件、
   `follow_up_source_valid=true`。

本地运行：`1 passed (18.5s)`。

### 3. 静态契约

新增 `tests/blind_ui/test_r8am_followup_parity.py`（4 项）：Mini 意图校验、同宠同指标关联、
Web/Mini 共用 append-only/CAS/来源有效性语义、五 Tab IA 未变。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 最终代码提交 | `7f4751e3871ed8a08c803959aaef52ff9a326cfb` |
| CI | run `39122509924` **success**（新增 Playwright `r8-followup.spec.ts` 在 CI 真实执行） |
| Android | run `39122509935` **success**（APK + 真实运行取证） |
| OpenAPI | run `39122509928` **success** |
| 本地后端 | **775 passed / 0 failed / 0 error**（含新增 seed 回归） |

## 诚实边界

- Mini 真机/开发者工具运行未在本机执行：`MINI_RUNTIME = NOT_YET_OBSERVED`；
  已通过 `tsc`、Taro `build:weapp` 与静态契约。
- Mini 仍不提供离线补录队列；关联失败不回滚已保存事件。
- Web 端新增的 Playwright 用例会在 CI 的 Browser E2E job 中真实执行。
- 未新增数据库迁移；未改变服务端权限、来源有效性或幂等语义。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。

## CI 失败、定位与真实修复（不是放宽测试）

1. **真实缺陷（seed 重置）** —— `bd00c5a2`：新的 Playwright 用例会创建真实 Case；
   E2E job 随后执行 `python -m app.seed` 重置演示数据时，`DELETE FROM pets` 被
   `life_change_cases.pet_id` 外键拒绝。任何真实主人的 Case 都会让重置失败。
   - 修复 `8cdcd1eb`：先删除 `life_change_reviews`、`life_change_cases`（Review 还引用
     `care_tasks`，故也在 CareTask 之前），并新增
     `tests/integration/test_seed_reset_with_owner_case.py` 真实 Case/Review 回归。
2. **Android 取证门禁（三轮真实定位）** —— 失败点均在 owner 来源面板折叠：
   - `bd00c5a2`：单次盲点 + 面板重渲染，可能把“收起”点成“展开”；
     修复 `bbe8bae2`（幂等重试）后该次通过。
   - `ac5c0f3f`：diagnostics 显示按钮 bounds 退化为 `[88,136][304,116]`（高度为负），
     点击坐标落到状态栏；修复 `f95fc5ee` 要求真实可见矩形。
   - `f95fc5ee` 后仍失败：最终层级显示应用停在 Today 的 Timeline 区域，面板在视口上方；
     `find_control` 的 `scroll_direction="up"` 实际继续向页面底部滚动，越找越远。
     修复 `955c7214`（安全垂直区间）与 `7f4751e3`（向页面顶部滚动定位）。
   - 最终 `7f4751e3`：CI / Android / OpenAPI 三套 workflow 全部 success。
3. 未删除或弱化任何产品断言；每轮都保留原生 XML/截图作为证据。
