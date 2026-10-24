# PLI R8AK · 完整生活观察历史、旧 Case 继续复核与跨端读取

2026-10-17。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main、不打 tag。

## 起点核验

- 远端实际 HEAD：`06c0ba5ca35678c0e1d026c31e477f8135094667`（`git ls-remote` 与 PR #2 head 一致）。
- 本地起始 HEAD：`b52cd1ea`，落后 136 个提交（2026-10-11 → 2026-10-17 的 R8A–R8AJ）。本地无独有提交；两处未提交的 3D 舞台打包产物已保护性 stash 并另存补丁，未删除。
- exact-HEAD CI：`CI` / `Android + Release Artifacts` / `OpenAPI Artifact Sync` 三个 workflow 均 success；APK artifact `pli-mobile-apk` 与 `r5-6-android-runtime-evidence` 存在且未过期。
- R8AJ 文档明确列出 R8AK 范围：旧 Case 继续复核、完整历史检索/分页、授权来源详情、跨端一致性。

## 已实现（源码）

### 1. 完整历史检索与稳定分页（后端）

- `GET /api/v1/pets/{pet_id}/life-change-cases` 新增 `limit`（1–50，默认 20）、`cursor`、`metric`、`since`、`until`、`q`。
- 游标编码不可变 `(created_at, id)` 位置（版本化 base64），**不是偏移量**：新建 Case 不会让旧页漂移或重复。
- 排序固定 `created_at DESC, id DESC`；响应新增 `next_cursor`、`has_more`、`total`、`filters` 回显。
- `q` 只在服务器已公开给 `DAILY_READ` 的字段内匹配（指标身份 + 冻结的主人问题），不搜索私人备注或临床文本。
- 无时区的时间窗、倒置窗口、被篡改游标统一 422；`since/until` 必须是带时区瞬间。

### 2. 授权来源详情（后端）

- 新增 `GET /api/v1/pets/{pet_id}/life-change-cases/{case_id}/sources`。
- 每个事件重新经过与 `GET /events/{id}` 相同的 pet 成员权限与 `medical:read` 边界；Case ID 不是访问凭据。
- 支持 `review_id` 限定到某一条 `RECORD_OBSERVATION` 的后续来源；只接受该 Case 下的 observation review。
- 返回冻结角色 `role`/`role_source`、逐条 `valid`（撤回/被后继修正即 false）、`missing_event_ids`、`offset/limit/total/has_more`。
- 旧 Case 无冻结角色时保持 `LEGACY_DATE_DERIVED`，不做追溯伪造。

### 3. 旧 Case 内继续复核

- `GET /pets/{pet_id}/life-change-cases/{case_id}` 新增 `owner_can_review`、`latest_review_id`、`review_decisions`、`follow_up_review_count`。
- 详情页可以直接追加 `FOLLOW_UP_LATER` / `NOT_RELEVANT` / `CORRECT_SOURCE`，走原有 POST（owner 角色、来源有效性、latest-review CAS、幂等键、审计全部保留）。
- 不新建 Case、不改写旧 Review；`RECORD_OBSERVATION` 仍必须先由 QuickLog 保存真实 LifeEvent。

### 4. Android

- 新增 `LifeChangeHistoryScreen`（RootStack，**不是第六个 Tab**）：指标筛选、搜索、稳定游标分页、空/错误/加载态、切宠遮蔽。
- Today 持久化 Case 区块新增「查看全部观察档案」入口；详情页新增「全部档案」「记录一条真实观察」「继续关注 / 暂不关注 / 来源需核对」。
- 来源列表改为显式展开的分页详情：逐条显示记录值、发生/录入时间、来源类型、有效性、完整事件 ID；全部来源可展开核对。
- 组件拆分：`CaseSourceList` / `CaseReviewActions` / `caseHistoryApi`，详情页不再膨胀。

### 5. Web

- 新增 `/pets/[id]/history`（筛选 + 搜索 + 游标分页）与 `/pets/[id]/history/[caseId]`（冻结值、全部 Review、来源分页、继续复核）。
- Today 右栏新增「最近的生活观察回顾」（真实 Case 才显示；空/失败不伪造历史），入口到完整历史。
- 语义与 Android 一致：状态只描述主人决定与来源有效性，不做诊断/恢复声明。

### 6. Mini

- 新增 `pages/observations/index` 与 `pages/observations/detail/index`：完整历史分页、来源详情、继续复核（同一 API 语义）。
- 宠物页新增「观察档案」入口。

## 回归测试

- 新增 `tests/integration/test_r8ak_case_history.py` 6 项：游标稳定性、指标/时间/关键词检索、被篡改游标与歧义时钟拒绝、来源授权与冻结角色、跨宠/陌生用户拒绝、旧 Case 继续复核 token。
- 更新 `tests/blind_ui/test_r8aj_case_history_detail.py`：来源渲染迁移到 `CaseSourceList` 后契约保持；新增 R8AK 契约（历史路由、分页、来源重新授权、继续复核）。

## 运行取证门槛（未完成前不得声称 RUNTIME_ACCEPTED）

`README` 的 Android evidence 脚本已扩展为：

1. 真实点击 Today 历史 Case → 原生详情。
2. 真实点击「来源需核对」→ 服务器必须恰好追加一条 `CORRECT_SOURCE`，同一 Case ID 保持。
3. 真实点击展开来源 → 分页加载全部来源，逐条核对 ID。
4. 从详情进入「全部档案」→ 完整历史必须列出同一真实 Case，且筛选控件存在。
5. 产出 `case-continue-review-truth.json`、`case-history-truth.json`、截图与每次滚动的 UIAutomator XML。

`R8AK_RUNTIME_ACCEPTED` 只有在 exact HEAD 的 Android Action 成功后，依据上述真实证据才可标记。

## 诚实边界

- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
- 未新增第六个底部一级入口；五端 IA 未改变。
- 历史检索不提供“按有效状态过滤”：有效状态是读时计算的，无法用单一稳定 SQL keyset 表达，避免给出会漏行的伪分页。
- 来源 ID 展示不代表已看到原始媒体；附件访问仍受 pet 权限与敏感内容策略约束。
- 3D 个体材料与主人视觉验收不受本阶段影响。
