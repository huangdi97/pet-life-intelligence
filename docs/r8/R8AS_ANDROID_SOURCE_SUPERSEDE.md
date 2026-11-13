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

- 新增 `tests/blind_ui/test_r8as_android_supersede.py`（3 项）：
  主人/来源/指标前置、append-only 端点、数值范围、meal 不支持、无本地改写、
  失败不声称已修正、真实取证门禁存在。
- `pnpm --dir apps/mobile typecheck` PASS。
- 后端、Web、Mini 的 supersede 语义未变（复用同一端点与幂等规则）。

## 真实 Android 取证（R8AS_RUNTIME_ACCEPTED = PASS）

取证脚本使用**独立宠物 + 独立 Case**（避免与 R8AO 撤回 Case 互相失效），在真实模拟器中：

1. 创建 3 天历史散步 + 当日 20 分钟，重算基线并创建 Case；
2. demo 登录刷新宠物列表，deep link 到该宠 Today，滚动找到并点击 Case；
3. 打开来源明细，点“修正这条记录”，聚焦输入框键入 `35`，收起数字键盘并提交；
4. 必须同时满足：
   - 原生状态“原始记录已变更 · 需重新核对”；
   - 服务端 `source_valid=false`、`state=INVALIDATED`；
   - 原事件 payload 仍为 20 分钟（`original_row_unchanged`）；
   - 来源投影出现 `superseded_by_event_id`；
5. 输出 `case-source-correction-truth.json` 与 `owner-case-source-corrected.png`。

真实 manifest（`d90bd97f`）：

```json
{
  "native_status": "原始记录已变更 · 需重新核对",
  "corrected_by_real_android_tap": true,
  "server_source_valid": false,
  "server_state": "INVALIDATED",
  "original_payload_duration_minutes": 20,
  "original_row_unchanged": true,
  "superseded_by_event_id": "9da13eb3-35ba-4c31-9b8f-14151f35154b"
}
```

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `700467b4f626db8cafe6cdd9e70820bf72e4e127` |
| 真实取证提交 | `d90bd97f426c9ea9925eb32451fbfe3800471714` |
| 取证加固 | `52b28340`（清空预填值/校验 35/条件式收起键盘） |
| 最终代码 HEAD | `de0ba512b8672776a6c5027b5360e7b2c836d679` |
| CI | run `39207653954` **success** |
| Android | run `39207653965` **success**（含修正真实取证；`52b28340` 的 Android run `39205404493` 亦 success） |
| OpenAPI | run `39207653971` **success** |
| 本地 blind_ui | `test_r8as_android_supersede.py` **3 passed** |

## 诚实边界

- 修正只覆盖 walk/sleep 时长；meal 与其它事件类型不提供在线修正。
- 不支持修改发生时间；需要改时间时只能撤回后重新记录。
- Mini 真机运行仍 `NOT_YET_OBSERVED`；真实个体 3D `EXTERNAL_BLOCKED`。
- 未新增数据库迁移；权限、幂等、来源有效性语义未变。
- 本轮顺带加固 R8D：Review 3D 首次挂载若仍读到旧 life manifest，会重挂载
  Review 路由一次并重新下发同一视角，仍失败才报错（不放宽断言）。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。

## 2026-11-03 runtime truth closure

旧门槛只证明“来源投影有 `superseded_by_event_id` + 原事件未被改写”，仍不足以证明 successor 本身就是主人刚输入的那条修正，也不足以证明 Android 冻结来源没有被静默重写。

本轮在现有 R8AS 真实 Android 路径上加固为双层证据合同：

1. **append-only successor truth**
   - successor 与原事件属于同一 `pet_id`；
   - successor.`supersedes_event_id == original.event_id`；
   - successor payload 的 `duration_minutes == 35`，对应主人在真实 Android 输入框中输入并提交的值；
   - successor 与 original 的 `occurred_at` 相同：本动作只修正数值，不改写“什么时候发生”。
2. **frozen source owner truth**
   - Case 已失效后重新核对原生来源区；
   - 原始冻结来源继续显示 **20 分钟**；
   - 原生可访问文案明确显示“**记录已由后续修正替代**”；
   - 原始来源行不得显示 35 分钟，避免把 append-only correction 伪装成原记录被原地编辑。

最终 code-bearing HEAD：

- `3cb2e2a15e4b07f2aff8c1593d5618d276078cf0`
- commits:
  - `b01ed52f` — prove append-only correction truth on Android
  - `376a97c6` — state-aware source-panel proof
  - `3cb2e2a1` — Ruff-only lint closure

exact-HEAD hosted gates：

| Workflow | Run | Result |
|---|---:|---|
| CI | #1822 / `41587931879` | **SUCCESS** |
| OpenAPI Artifact Sync | #1054 / `41587931835` | **SUCCESS** |
| Android + Release Artifacts | #1763 / `41587931823` | **SUCCESS** |

Android runtime artifact：

- `r5-6-android-runtime-evidence`
- artifact id: `13210108125`
- digest: `sha256:fb64ede41d0d0d5b185435b0a77a5579232b91ef7e1ace38e508018098ad0ba4`
- `case-source-correction-truth.json` records:
  - `successor_payload_duration_minutes: 35`
  - `successor_occurred_at_matches_original: true`
  - `native_original_source_marked_superseded: true`
  - `native_original_value_preserved: true`
- `correction-invalidated-sources.xml` contains the original 20-minute row and “记录已由后续修正替代”, and does not rewrite that row to 35 minutes.

This is a runtime-evidence strengthening only. It does not expand R8 product scope or change the visual baseline. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`.

