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

## 诚实边界

- Mini 真机/开发者工具运行未在本机执行：`MINI_RUNTIME = NOT_YET_OBSERVED`；
  已通过 `tsc`、Taro `build:weapp` 与静态契约。
- Mini 仍不提供离线补录队列；关联失败不回滚已保存事件。
- Web 端新增的 Playwright 用例会在 CI 的 Browser E2E job 中真实执行。
- 未新增数据库迁移；未改变服务端权限、来源有效性或幂等语义。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
