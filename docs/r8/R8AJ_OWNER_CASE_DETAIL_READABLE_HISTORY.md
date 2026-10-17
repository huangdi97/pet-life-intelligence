# PLI R8AJ · 可回看的个体观察档案

## 源码审计确认的问题

R8AI 已在 Today 保留持久化的 LifeChangeCase，但其卡片此前只展示静态摘要，唯一操作是打开普通时间线。主人不能直接核对同一条 Case 的**原始来源、冻结的同期角色、历次人类反馈和后续来源的现行有效性**，这使“保存了长期记忆”不等于“能够实际回顾”。

## 已实现的 Android 第一段

- Today 原有持久化 Case 卡片变为可点击、有辅助功能标签的一级操作，导航到当前 RootStack 的 `LifeChangeCase` 详情，而不是增加第六个底部 Tab。
- 详情只读取现有 `GET /pets/{pet_id}/life-change-cases/{case_id}`，不自动创建 Case、不生成 AI 医疗解释或替主人操作。
- 显示冻结的 Case 当前记录值、历史参考值、可比样本天数、比较发生时间，以及服务端提供的有效/失效状态；没有记录不代表动物没有活动。
- 严格区分 **Case 原始依据的 source_valid** 与 **每一条后续 RECORD_OBSERVATION 的 related_sources_valid**；保留全部 append-only Review 的决策、时间和实际事件 ID。
- 只在 API 返回 `FROZEN_AT_CREATION` 时使用存储在服务端的 CURRENT/HISTORICAL 来源角色；旧版无冻结角色 Case 只能显示待核实，不反向制造来源分类。
- 不主动输出 Review actor UUID 或关联任务详情；备注只使用后端已经根据 Owner 权限过滤后的响应。现有非主人 `DAILY_READ` 不应获得私人备注。
- 页面通过选中宠物 ID、路由 pet ID、服务端返回 Case ID 与 generation 共同约束数据读取。切换宠物时直接遮蔽旧页面，异步 A→B→A 返回结果不会被误认为最新请求。
- 有单独的只读时间线入口。已实现轻量的首屏样式，非高保真视觉验收。

## 严格运行取证

现有 `capture-android-final.py` 的 R8AI 测试先创建真实 Case、真实 FOLLOW_UP_LATER 与真实 QuickLog 后续记录，并用另一条真实散步把当日启发式变化恢复到非 notable。此时：

1. 验证 Today 上原 Case 长期存在、且原始 follow-up source_valid 仍然为 true。
2. **实际点击**该历史 Case 卡片，而不是通过 API 或模拟跳转替代 UI 交互。
3. 必须在 Android accessibility tree 中进入 `pli.r8.case-detail.identity`，并看到原 Case 的真实状态。
4. 与相同宠物/Case 的 API 内容核对，滚动页面，逐条发现**全部**原始 event ID 和**全部** append-only Review ID。
5. 输出两张真实 Android 截图、每次滚动的 UIAutomator XML 以及 `case-detail-truth.json`。不能由后端清单代替原生 UI 证明。

新增静态盲测只做代码契约；**R8AJ_RUNTIME_ACCEPTED** 必须等 exact HEAD 的 Android Action 成功，再以真实取证数据核验。

## 未关闭的后续门槛

- 详情目前是只读的，不可在旧 Case 里直接添加新 Review；主人写入仍遵循现有具备校验和幂等恢复的 R8C 入口。
- Case 列表仍只提供最近 50 条。完整历史检索、分页、来源筛选及跨端 Web/Mini 一致性仍待 R8AK 设计和实现。
- 源 ID 可用于审计，但详细原始附件访问必须继续经过 pet 权限和敏感内容策略。不要把 ID 显示误当成用户已看到原始媒体。
- 个体 3D 材料真实性与主人视觉验收不受本阶段改变。

`NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`; PR #2 保持 OPEN，不合并、不修改 main、tag、Release 或视觉基线。
