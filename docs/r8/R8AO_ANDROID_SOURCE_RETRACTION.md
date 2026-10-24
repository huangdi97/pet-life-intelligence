# PLI R8AO · Android 原始来源撤回与真实失效取证

2026-10-18。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AN 已在 Web 提供主人两步撤回原始来源；Android Case 详情仍只能查看来源与继续复核，
没有撤回入口。跨端能力不一致，且“原始事件修正撤回”缺少 Android 真实运行证据。

## 已实现（Android）

- `CaseSourceList` 新增 `ownerCanRetract` / `onRetracted`：
  - 只有**主人视图且该来源仍有效**时显示“这条记录有误”；
  - 两步确认：先展开说明“撤回后旧对比失效；历史主人反馈仍保留”，再确认；
  - 确认后调用既有、已审计的 `POST /events/{id}/retract`（服务端仍校验 `MANAGE_PET`）；
  - 成功后清空缓存的“有效”来源行并重新分页读取，再通知详情页重读 Case；
  - 客户端从不本地改写 `source_valid`，失效状态全部由服务端派生；
  - 撤回失败只显示可读错误，不伪造失效。
- 事实行仍是单一 accessible 节点（角色 + 数值 + 发生/录入 + 来源 + 完整 ID），
  撤回按钮作为同级独立按钮，避免破坏 R8AB/R8AF 的原生行契约。
- 详情页传入 `ownerCanRetract={detail.owner_can_review === true}` 与 `onRetracted` 重载。

## 严格运行取证（扩展 `capture-android-final.py`）

在真实 Case 详情、完整历史检查之后，脚本执行**本 Case 的最后一次变更**：

1. 从历史返回真实详情；
2. 规范化回顶部，读取来源开关的无障碍描述（“收起/查看”）判断面板开合，
   仅在确实收起时展开；
3. 对当日原始来源点“这条记录有误”，再点“确认撤回”；
4. 必须看到原生状态变为“原始记录已变更”，否则失败；
5. 与 API 核对 `source_valid=false`、`state=INVALIDATED`；
6. 核对 Review 数量与撤回前完全一致（append-only 未被删除/改写）；
7. 输出 `case-source-retraction-truth.json` 与 `owner-case-source-retracted.png`。

所有点击都要求控件 `enabled/clickable` 处于安全垂直区间（避免状态栏与底部 Tab 栏误触）。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `23ab619a185d4c50a688d05a7e732efd0af81ae2` |
| CI | run `39136256691` **success** |
| Android | run `39136256743` **success** |
| OpenAPI | run `39136256692` **success** |
| 真实 manifest | `native_status=原始记录已变更 · 需重新核对`、`server_source_valid=false`、`server_state=INVALIDATED`、`reviews 3→3 preserved` |

## 取证门禁的三轮真实修复（不是放宽断言）

1. 从历史返回后首屏 identity 不在视口：改用固定 header 判定同一详情；
2. 详情保留深滚动位置、撤回按钮可能在上下两侧：先规范化到顶部，再向下遍历；
3. 打开来源会异步清空/重载行，盲目滚动会把目标滚走：等待渲染稳定后再小步揭示；
4. 面板可能已展开但容器在视口外，误判为收起会把它点关：读取开关的 `content-desc`
   （“收起/查看”）判定真实开合。

最终 `23ab619a` 首次运行即通过全部 Android 门禁，manifest 与截图均来自真实模拟器。

## 诚实边界

- Mini 仍没有撤回入口（`NOT_IMPLEMENTED`）。
- 只实现“撤回”；“用新记录修正并取代旧记录”（supersede）仍无 UI。
- 撤回使旧 Case 失效，不自动创建新事实或新 Case。
- `R8AO_RUNTIME_ACCEPTED` 以 exact-HEAD Android Action 成功与该 manifest 为准。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
