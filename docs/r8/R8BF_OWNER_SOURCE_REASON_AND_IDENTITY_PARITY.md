# PLI R8BF · 主人来源失效原因与 UUID 身份一致性

2026-10-20 · 仅 PR #2 功能分支；不得合并 main、发布 Release、晋升截图视觉基线。

## 查实的缺陷

R8BE 已使服务端的“来源有效”需要同时满足：指标类型与 Case 一致、属于有来源的真实观察/报告、未撤回且未被修正。但 Android 仍把**所有无效来源**显示为“来源已撤回或修正”，使旧 Case 中的错误指标或 AI 派生记录看起来像主人主动修改过。

R8BD 已处理服务端大小写不同、格式合法的历史 UUID。Android 仍将 `expectedSourceIds`、服务端返回 `event_id` 和冻结角色键进行大小写敏感的比较，可能错误拒绝同一条合法来源。

## 实际修改

- 来源详情接口在原 `valid` 布尔值之外增加 `validity_reason`：`VALID`、`RETRACTED`、`SUPERSEDED`、`WRONG_METRIC`、`NON_FACT_SOURCE`，与 R8BE 的判断条件一致。失效原因的确定优先级为撤回、修正、指标不符、来源资格不符；**不做疾病、心情或行为的推测**。
- Android 对每一种原因显示对应事实性文案；遇到不包含原因的旧接口，显示“来源有效性待核实”，绝不擅自称主人曾撤回或修正。
- 冻结来源校验只对合法的带连字符 UUID 做英文大小写归一；非法、无连字符、跨 Case/跨宠物记录仍拒绝。冻结角色发生冲突时，使用“日期待核实”，不构造不存在的来源角色。
- 服务端对历史冻结角色的合法 UUID 键也按同一身份规则读取，不再因为字母大小写而丢失角色。
- 保持 Case 与 LifeEvent 的不可变记录、医疗读取权限、双时间戳、来源 ID、原始媒体边界；未修改 3D 资产。

## 自动化门槛

- Python 集成回归覆盖有效、指标不符、非原始事实、被后续修正等来源原因；独立 Blind UI 合同覆盖 Android 文案与 UUID 归一。
- 仅以最新 HEAD 的 Ruff/pytest、Frontend Typecheck/Playwright、Android APK 和真实模拟器取证、OpenAPI workflow 结论为准，不复用旧 SHA PASS。
- 单元与合同测试通过仍不等于新错误文案已由真人在手机上验收。保持 `NO_VISION_MODEL_USED = TRUE`、`HUMAN_VISUAL_ACCEPTANCE = PENDING`，不发布、不合并、不晋升视觉基线。

## 后续仍需审计

旧式 Case 中的非数组 JSONB 来源列表，以及更多来自外部系统的来源链和独立原始文件权限，仍需按真实数据风险单独评估；不能把本次 R8BF 视作全部来源可信性已完成。 
