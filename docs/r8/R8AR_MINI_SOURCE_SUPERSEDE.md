# PLI R8AR · Mini 端修正并取代旧记录（supersede）

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AQ 已在 Web 提供受控 supersede（追加替代事件、原行不变、发生时间保持）；Mini 仍只有
撤回，没有“记录写错了，改成正确值”的入口。

## 已实现（Mini）

- Case 详情来源卡在 **`owner_can_review` + 来源有效 + 指标支持** 时显示“修正这条记录”。
- 支持 `daily.walk` / `daily.sleep` 的时长修正；`daily.meal` 明确不提供
  （一条进食记录不是单一可编辑数字，应撤回后重新记录）。
- 表单明确：“只修正数值；发生时间与原始记录保持不变；修正会替代旧来源，旧对比随之失效”。
- 提交 `POST /pets/{pet_id}/events/{event_id}/supersede`，payload 仅
  `{ duration_minutes }`，幂等键 `r8-mini-correction-{eventId}-{value}`。
- 成功后清空来源缓存并重读 Case：服务端派生 `INVALIDATED`，历史 Review 保留；
  失败只显示“修正未确认”，不伪造替代或失效。

## 测试与验证

- 新增 `tests/blind_ui/test_r8ar_mini_supersede.py`（2 项）：
  主人/来源前置、append-only 端点、数值范围、meal 不支持、无本地改写、
  失败文案不声称恢复。
- `pnpm --dir apps/mini typecheck` PASS；Taro `build:weapp` PASS。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `e7e17fa81c9b4ac2784c08284d0b87822031e904` |
| CI | run `39187341387` **success** |
| Android | run `39187341420` **success**（APK 与既有真实取证未回退） |
| OpenAPI | run `39187341421` **success** |
| 本地 blind_ui | `test_r8ar_mini_supersede.py` **2 passed** |

## 诚实边界

- 本轮只做 Mini；**Android 仍没有修正入口**（下一阶段，并需真实 UIAutomator 取证）。
- Mini 真机/开发者工具运行仍为 `NOT_YET_OBSERVED`。
- 不支持修改发生时间；需要改时间时只能撤回后重新记录。
- 未新增数据库迁移；服务端权限、幂等、来源有效性语义未变。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
