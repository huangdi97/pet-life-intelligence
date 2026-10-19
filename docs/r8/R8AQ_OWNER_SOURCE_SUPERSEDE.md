# PLI R8AQ · 用新记录修正并取代旧记录（supersede，Web 第一段）

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8A–R8AP 已实现“撤回原始来源”，但“记录写错了、需要改成正确值”仍只能撤回后重新记录：
旧事实被标记无效，却没有一条可追溯的替代事实。领域层已有 `supersedes_event_id` 与
Case 失效推导，但没有任何主人可用的 supersede 入口。

## 已实现

### 1. 后端：受控的 append-only 修正

`POST /pets/{pet_id}/events/{event_id}/supersede`

- 要求 `MANAGE_PET`（主人/共同主人），事件必须属于该宠物；
- **不修改、不删除原始行**：追加一个新事件，`supersedes_event_id = 原事件`；
- **保持发生时间不变**（`occurred_at = original.occurred_at`），避免把事实挪到另一天而
  悄悄改变同刻基线与历史 Case 的来源成员；
- 事件类型必须与原记录一致；payload 仍走注册表校验（如 0–1440 分钟）；
- 一个原记录只允许一条现行修正链：已有 successor 时 409；被撤回的记录不可再修正；
- 幂等：同一 `idempotency_key` 的丢失响应重试返回已接受的修正（`replayed=true`），
  不会追加第二条；
- 审计 `event.supersede` 只记录 original/new ID 与事件类型；
- 来源投影新增 `superseded_by_event_id`，旧来源 `valid=false`，替代链可见。

### 2. Web：主人修正入口

- Case 详情来源卡在“主人视图 + 来源仍有效 + 指标支持”时出现“修正这条记录”；
- 支持 `daily.walk` / `daily.sleep` 的时长修正；**`daily.meal` 明确不提供**：
  一条进食记录不是单一可编辑数字，主人应撤回后重新记录；
- 表单明确“只修正数值；发生时间与原始记录保持不变；修正会替代旧来源”；
- 提交后清空来源缓存并重读 Case：服务端派生 `INVALIDATED`，历史 Review 全部保留；
- 失败只显示可读错误，不在客户端伪造失效或替代。

## 测试与真实取证

- `tests/integration/test_r8aq_source_supersede.py`：修正链、发生时间保持、原行不变、
  Case `INVALIDATED`、Review 保留、来源 `superseded_by_event_id`、幂等 replay、
  第二条修正 409、撤回后 409、非主人 403、陌生用户拒绝、跨宠 404、非法 payload 422。
- `tests/blind_ui/test_r8aq_source_supersede.py`：端点不可编辑历史、发生时间保持、
  `MANAGE_PET`、审计、幂等先于 409、Web 主人/数值/不支持 meal。
- 新增 `tests/e2e-browser/specs/r8-correction.spec.ts`：真实创建宠物/事件/基线/Case，
  在浏览器中修正当日散步为 35 分钟，断言状态失效、API `INVALIDATED`、原事件仍为 20 分钟、
  来源指向替代事件。
- 本地：新增 Vitest 3 项（共 **65 passed**）；R8AQ Playwright **2 passed**（含既有 follow-up）；
  后端全量 **784 passed / 0 failed / 0 error**。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `9b8d0624dad2485e487c0a8bc45ff2dcabd12c3d` |
| CI | run `39144839218` **success**（含新 Playwright `r8-correction.spec.ts`） |
| Android | run `39144839219` **success**（APK + 既有真实取证未回退） |
| OpenAPI | run `39144839233` **success**（203 paths / 95 schemas） |
| 本地后端 | **784 passed / 0 failed / 0 error** |
| 本地 Web | Vitest **65 passed**；R8AQ Playwright **2 passed** |

## 诚实边界

- 本轮只做 **Web + 后端**；Android / Mini 仍只有撤回，没有修正入口（下一阶段）。
- 只支持数值型日常指标（walk/sleep）；meal 与其它事件类型不提供在线修正。
- 不允许修改发生时间；需要改时间时只能撤回后重新记录。
- 修正使旧 Case 失效，不自动创建新 Case；主人需要重新记录生活事件。
- 未新增数据库迁移（`supersedes_event_id` 已存在）。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
