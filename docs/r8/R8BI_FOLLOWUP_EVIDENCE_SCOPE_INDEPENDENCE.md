# PLI R8BI · 后续观察来源与原始 Case 冻结角色隔离

## 经最新 HEAD 查实的缺陷

`GET /pets/{pet}/life-change-cases/{case}/sources?review_id=...` 已正确从 Review 自己的 `related_event_ids` 读取来源数组和形状完整性，但仍将**原始 Case**的 `evidence_role_by_event_id` 与其角色完整性应用到这些后续事件。因此：
- Review 里的新观察会继承不属于它的 `CURRENT/HISTORICAL` 角色和 `FROZEN_AT_CREATION` 标签；如出现历史重复事件 ID，会直接产生误导性角色。
- 原始 Case 的旧 JSONB 角色映射损坏，会错误连带标记一个完整、真实的后续观察为“冻结角色异常”。
- 这与 R8BG 对 Review 来源形状和 Case 证据形状独立核验的原则不一致。

## 已落地的最小隔离

- 原始 Case 详情仍严格调用 `validated_frozen_roles`，拒绝伪造的 CURRENT/HISTORICAL 或不完整来源分区。
- `review_id` 选择后续观察时：只接受指定 Review 的事件 IDs、独立校验形状与原始事件授权；`role=null`，`role_source=FOLLOW_UP_OBSERVATION`，`evidence_role_shape_valid=null`（**不适用**，非 TRUE 或 FALSE）。
- 医疗权限、宠物和 Case ID 边界不放松。当前 Review 来源有效性仍受撤回、修正、指标类型、事件来源资格约束。角色“并不适用”不能被 UI 映射为“日期待核实”，后续独立详情 UI 需使用“后续观察”。
- 真实 API 集成测试：创建有两种冻结角色的 Case，真实记录并关联一条后续观察，断言其没有旧角色；再人为损坏 Case 的角色 JSONB，保证原始 Case 仍显示完整性失败，后续 Review 不受污染；恢复后重跑旧 JSONB 损坏用例。

## 不得宣称的能力

此提交不代表所有 Review 来源详情在 Android/Web/Mini 都已经可直接展开。不得将 API 的来源 ID、数值或权限凭空映射为真实影像、诊断结论或 3D 重建。

**门槛：** Backend Ruff + full pytest、Frontend、Blind UI、Browser Playwright、Android APK 与真实模拟器取证，全部针对 exact HEAD。NO_VISION_MODEL_USED=TRUE，HUMAN_VISUAL_ACCEPTANCE=PENDING。PR #2 不合并，不发布，不晋升基线。

## R8BI-R2 · 历史 Review 来源数组的详情页安全解释

- `_review_response` 原先将旧 `related_event_ids` JSONB 原样返回；它可能是字符串、对象、null、重复大小写 UUID 或包含错误成员的数组，导致三端直接 `.map` 崩溃或误把不完整历史视为可核对。
- 服务端新 `safe_review_source_ids` 仅对严格 UUID 生成规范化、去重的可读取 ID 列表，附带 `related_evidence_shape_valid`。错误历史内容仍留在数据库，不覆盖主人 Review；合法剩余来源仍然可见。
- `/sources?review_id` 与 Case 详情共享该安全解释；Android、Web、Mini 只有在服务端**明确返回 false** 时展示“历史后续来源格式异常”，不会把旧服务器缺少该字段擅自视为异常。
- 真实集成回归模拟损坏/恢复 Review JSONB，确认详情仍 200、来源不会变成 HTML/React 非法对象、独立原始 Case 身份仍保留。自动化 PASS 不等于人眼认可 UI。
