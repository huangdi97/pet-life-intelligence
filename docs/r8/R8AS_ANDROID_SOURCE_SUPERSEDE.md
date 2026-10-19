# PLI R8AS · Android 端修正并取代旧记录（supersede）

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AQ（Web）与 R8AR（Mini）已支持受控 supersede；Android 仍只有撤回，没有“把写错的
数值改成正确值”的入口，三端能力不一致。

## 已实现（Android）

- `CaseSourceList` 新增 `metric` 与修正状态：
  - 仅 `ownerCanRetract`（主人视图）+ 来源有效 + 指标支持时显示“修正这条记录”；
  - 支持 `daily.walk` / `daily.sleep` 的时长修正；`daily.meal` 明确不支持；
  - 表单说明“只修正数值；发生时间与原始记录保持不变；修正会替代旧来源，旧对比随之失效”；
  - 提交 `POST /pets/{pet_id}/events/{event_id}/supersede`，payload 仅
    `{ duration_minutes }`，幂等键 `r8-android-correction-{eventId}-{value}`；
  - 成功后清空已加载来源、重新拉取第 0 页并重读 Case；服务端派生 `INVALIDATED`，
    append-only Review 保留；
  - 失败显示可读错误，不伪造修正或失效。
- 详情页传入 `metric={detail.metric}`；事实行仍保持单一 accessible 节点。

## 测试

- 新增 `tests/blind_ui/test_r8as_android_supersede.py`（2 项）：
  主人/来源/指标前置、append-only 端点、数值范围、meal 不支持、无本地改写、
  失败不声称已修正。
- `pnpm --dir apps/mobile typecheck` PASS。
- 后端、Web、Mini 的 supersede 语义未变（复用同一端点与幂等规则）。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `700467b4f626db8cafe6cdd9e70820bf72e4e127` |
| CI | run `39191463755` **success** |
| Android | run `39191463747` **success**（APK 构建与既有真实取证未回退） |
| OpenAPI | run `39191463741` **success** |
| 本地 blind_ui | `test_r8as_android_supersede.py` **2 passed** |

## 诚实边界

- 本轮的 Android 修正**尚未纳入真实 UIAutomator 取证脚本**：
  `R8AS_RUNTIME_ACCEPTED = PENDING`，下一阶段需在模拟器中真实点击修正、输入数值、
  提交，并核对原生 `INVALIDATED`、服务端状态与 Review 不变。
- 不支持修改发生时间；需要改时间时只能撤回后重新记录。
- Mini 真机运行仍 `NOT_YET_OBSERVED`；真实个体 3D `EXTERNAL_BLOCKED`。
- 未新增数据库迁移；权限、幂等、来源有效性语义未变。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
