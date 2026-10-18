# PLI R8AN · 原始来源撤回：主人可执行的真实失效闭环（Web）

2026-10-18。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8A–R8AM 已实现 Case 来源有效性、撤回后自动失效、历史 Review 保留，
但全端只有“已撤回”的**展示**，没有任何主人可执行的“这条原始记录有误”操作。
来源失效只能通过 API 或测试构造，产品闭环不完整。

## 已实现（Web Case 详情）

- 来源卡片在 **主人视图且该来源仍有效** 时提供“这条记录有误”；
- 两步确认：第一次仅展开确认区，明确告知“撤回后旧对比失效，历史主人反馈仍会保留”；
- 确认后调用既有、已审计的 `POST /events/{id}/retract`（服务端仍校验 `MANAGE_PET`，
  UI 不是权限边界）；
- 成功后**不在客户端改写** `source_valid`：清空已加载来源、重新读取 Case，
  由服务端派生 `INVALIDATED`；页面状态变为“原始记录已变更 · 需重新核对”；
- 全部 append-only Review 仍显示，不删除、不改写；
- 失败只给出“撤回未确认”，不伪造失效。

## 测试与真实取证

- 新增 `tests/blind_ui/test_r8an_source_retraction.py`（2 项）：主人/有效性双重前置、
  两步确认、真实端点、服务端派生、Review 保留、文案不声称恢复。
- 扩展 `tests/e2e-browser/specs/r8-followup.spec.ts`：在真实补录闭环之后，
  浏览器点击“这条记录有误”→ 确认 → 断言状态文本变为“原始记录已变更”、
  API `source_valid=false`、`state=INVALIDATED`、Review 数量不变。
- 本地 Chromium + 本地 API/Web：**1 passed**。

## 诚实边界

- 本轮只做了 **Web**；Android 与 Mini 仍只展示撤回/失效状态，没有主人撤回入口
  （下一阶段补齐，运行时证据不能由本项目伪造）。
- 只实现“撤回”；“用新记录修正并取代旧记录”（supersede）仍未提供 UI。
- 撤回原始来源使旧 Case 失效，但不会自动创建新 Case 或新事实；
  主人需要重新记录真实生活事件。
- 未新增数据库迁移；未改权限、幂等或来源有效性语义。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
