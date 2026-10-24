# PLI R8AL · Web 真实观察补录与 Case 关联闭环

2026-10-18。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AJ/R8AK 已让主人在 Android/Web/Mini 读取 Case 历史、来源明细并追加非观察类决定；
但“记录一条**真实**后续观察并关联到同一 Case”此前只有 Android QuickLog 具备。
R8AK 收口报告把 Web 端这一项标为 `ACCEPTED_LIMITATION`。

## 已实现（Web）

### 1. 纯逻辑与安全边界

`apps/web/lib/caseFollowUp.ts`：

- `followUpEventType(metric)` 只接受 R8 支持的三个指标 → `daily.walk` / `daily.meal` / `daily.sleep`；
  其他指标返回 `null`，不猜测事件类型。
- `followUpHref(petId, caseId, metric)` 生成带 `followUpPet/followUpCase/followUpMetric` 的 Today 链接。
- `isFollowUpTarget(target, petId, eventType)` 同时校验宠物与事件类型，避免把 B 宠记录或不同指标事件接到 A Case。
- `followUpIdempotencyKey(eventId)` 每个真实事件一个幂等键，重试不会追加第二条 Review。
- `linkFollowUpObservation` 在提交前重新读取 Case：校验 `pet_id`/`case_id` 身份、`source_valid`、
  取最新 Review 作为 CAS token，然后 POST `RECORD_OBSERVATION` 并核对响应身份。
  失败分三种诚实文案：档案身份不一致 / 原始依据已失效 / 网络未确认；**已保存的事件不会被回滚或吞掉**。

### 2. Today 补录入口

- 只从 URL 读取客户端参数；不伪造目标、不自动创建 Case、不自动提交。
- 顶部提示“正在为这条生活观察补录真实记录”。
- Quick Log 只展示该 Case 指标对应的一种记录类型，标题变为“补录真实观察”。
- 目标宠物与当前宠物不一致时**不会静默切换**：提示主人先切换宠物，切换后才打开表单。
- 保存成功后：事件已落库 → 关联 Review → 跳转到
  `/pets/{pet}/history/{case}?linkedEvent={eventId}`，主人在同一份不可变档案里看到结果。

### 3. Case 详情

- “记录一条真实观察”从原先的普通时间线链接改为带上下文的补录入口。
- 从补录返回时显示“已关联真实后续观察（事件 …）；是否有效仍以来源状态为准”，
  不把一次关联说成健康结论或恢复。

## 测试与真实取证

| 项 | 结果 |
|---|---|
| 实现提交 | `2a2a975de1810e5a1e636e3956970bf93aa0bdbe` |
| CI | run `39106612419` **success**（Backend / Frontend / Blind Visual Contract / Playwright） |
| Android | run `39106612427` **success**（APK 与真实运行取证未回退） |
| OpenAPI | run `39106612420` **success** |

- 新增 `apps/web/tests/case-follow-up.test.ts` 4 项：指标映射、链接参数、跨宠/跨指标拒绝、幂等键稳定。
- `pnpm --dir apps/web typecheck` PASS；`pnpm --dir apps/web test` **62 passed**；生产构建 PASS。
- 真实浏览器（Chromium，本地 API 8800 + Web 3100）执行完整闭环：
  - URL 进入 → 提示出现 → 只出现“散步”记录类型；
  - 保存 25 分钟散步 → 事件落库 → Review `RECORD_OBSERVATION` 追加；
  - 跳转 Case 详情并显示关联提示；浏览器 console error = 0；
  - API 复核：`decisions = CORRECT_SOURCE, FOLLOW_UP_LATER, RECORD_OBSERVATION`，
    `follow_up_source_valid = true`。
  - 截图：`.local/local-evidence/web-followup.png`（不入库）。

## 诚实边界

- Mini 端补录能力已由 R8AM 补齐；Mini 真机运行时仍为 `NOT_YET_OBSERVED`
  （本轮只完成 tsc/Taro build/静态契约）。
- 关联失败不会自动重试；事件已保存，失败文案会明确告知。
- 只在同一指标内关联；不同指标记录不会强行接到 Case。
- 没有新增数据库迁移；没有改变服务端权限、来源有效性或幂等语义。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
