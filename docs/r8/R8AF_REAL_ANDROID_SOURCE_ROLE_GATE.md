# PLI R8AF · Android UIAutomator 来源比较角色真实取证

## 为什么不能只测代码

R8AC/R8AE 将“当日依据 / 同期参考”展示在原始事件卡片。原取证只证明完整 event ID、真实 `duration_minutes`、发生时间和录入时间同时出现在 Android 源节点，**不能发现同一个事件的比较角色被错误归类**。

## 本次取证门槛

- 使用现有 11 条真实 HTTP 新建事件：5 个历史产品日 × 每天两条 45 分钟，另加今天一条 20 分钟，全部含服务器真实 immutable event ID。
- 为每个真正植入的来源 ID 独立记录预期角色：0 天之前 `当日依据`，1–5 天之前 `同期参考`。
- UIAutomator 必须在**同一个实际可见的原生节点**中同时找到：完整事件 ID、对应记录分钟数、`发生 `、`录入 ` 和独立预期比较角色；任何一个 ID 缺失即失败。API 结果或模拟渲染不得替代原生截图及 UI 树。
- 保留 >8 来源分页按钮必须真实点击，且不能因只扫描第一屏而把未出现的原始事件计入“已观察”。
- `api-truth.json` 增补 `expected_role_by_event_id` 和 `native_observed_comparison_role_ids`，让自动化报告可审计。
- 老的多宠物身份、来源 POST/GET、一致性、主人确认、QuickLog 后续观察、3D Runtime 和视觉不验收原则不降级。

此项是**自动化事实绑定**，不是视觉审美判定。要求本次新 HEAD 的 CI、APK 和模拟器取证实际全绿后才能称 R8AF 运行门禁 PASS；主人视觉验收仍独立进行。

`NO_VISION_MODEL_USED=TRUE` · `HUMAN_VISUAL_ACCEPTANCE=PENDING`. 不合并、不发布、不替换视觉基线。
