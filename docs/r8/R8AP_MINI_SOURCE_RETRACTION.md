# PLI R8AP · Mini 端原始来源撤回（跨端补齐）

2026-10-18。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AN/R8AO 已让 Web 与 Android 的主人在 Case 详情中两步撤回原始来源；Mini 仍只能查看
“已撤回/失效”状态，无法执行撤回，三端能力不一致。

## 已实现（Mini）

- Case 详情来源卡在 **`owner_can_review` 且来源仍有效** 时显示“这条记录有误”；
- 两步确认：先显示“撤回后旧对比失效；历史主人反馈仍保留”，再点“确认撤回这条记录”；
- 调用既有、已审计的 `POST /events/{id}/retract`；服务端仍校验 `MANAGE_PET`；
- 成功后清空已加载来源、重新拉取第 0 页，并重读 Case；**不在客户端改写 `source_valid`**；
- 服务端派生 `INVALIDATED` 后，详情状态与撤回说明直接显示；Review 历史保留；
- 失败只显示“撤回未确认，请稍后重试”，不伪造失效。

## 测试与验证

| 项 | 值 |
|---|---|
| 实现提交 | `e3e75ac13b2137038b0d6de62c569ac2bc156181` |
| CI | run `39140214503` **success** |
| Android | run `39140214454` **success**（APK 与既有真实取证未回退） |
| OpenAPI | run `39140214435` **success** |
| 本地 blind_ui | `test_r8an_source_retraction.py` **4 passed** |
| Mini 构建 | `tsc` PASS；Taro `build:weapp` PASS |

- `tests/blind_ui/test_r8an_source_retraction.py` 扩为 **4 项**：Mini 主人/有效性前置、
  两步确认、真实端点、清空缓存、服务端重读、文案不声称恢复。

## 诚实边界

- Mini 真机/开发者工具运行仍为 `NOT_YET_OBSERVED`（本机无微信开发者工具运行时）；
  本轮只验证类型、Taro 构建与静态契约，不能替代真实设备验收。
- 仍只支持“撤回”；“用新记录取代旧记录”（supersede）未提供。
- 撤回使旧 Case 失效，不自动创建新事实或新 Case。
- 未新增数据库迁移；未改权限、幂等或来源有效性语义。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
