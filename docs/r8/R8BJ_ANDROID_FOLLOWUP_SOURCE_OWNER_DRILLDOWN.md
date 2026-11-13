# PLI R8BJ · Android 主人可核对的后续观察来源

## 设计定位

R8BH/R8BI 已区分原始 Case 比较的 `CURRENT/HISTORICAL` 冻结来源角色与主人后续 Review 的观察来源。R8BJ 使这一边界在 Android 上可直接操作：主人不必复制 UUID 去其他界面找一条后续记录。

### 已实现

- Android `LifeChangeCaseScreen` 的每条 `RECORD_OBSERVATION` Review 增加按需展开的“核对后续观察来源与数值”；此前的原始 Case 来源入口保留不变。
- 新的 `FollowUpSourceEvidence` 仅通过 `/sources?review_id=<Review>` 请求服务器授权的后续来源；校验返回 `pet_id`、`case_id`、`review_id`、`FOLLOW_UP_REVIEW` 与记录列表中的身份、角色来源。任何混入原始 Case `CURRENT/HISTORICAL` 的响应都拒绝展示。
- 可读取的记录显示记录数值、发生时间、录入时间、来源类型、独立的当前来源有效性原因与完整事件 ID；分页按服务端 `next_offset` 前进。
- 旧历史 JSONB 不完整或某些来源已不可访问时，保留警告，不把零条可读事件称作零次发生，更不根据后续观察推断宠物已恢复。
- 跨宠物、跨 Case 或跨 Review 的异步响应由作用域与 generation 守卫阻止渲染；仅在主人主动展开时读取，避免页面进入即批量拉取敏感来源。
- 此组件**只读**，不在不确定的旧 Review 上隐式撤回、修正、建立新结论或动用医疗写入权限。

### 验证和边界

- `tests/integration/test_r8ak_case_history.py` 使用真实 Case、真实 Review、损坏和恢复的 JSONB，检查服务端独立性。
- `tests/blind_ui/test_r8bi_followup_source_boundary.py` 约束三端损坏提示、Android 深入查看真实来源、身份与时间线契约。
- 仍须 exact-HEAD GitHub CI、TypeScript/小程序构建、Web E2E、Android APK 及模拟器真实性取证。现有 Android 取证如果没有点击新 Review 展开按钮，不等于已经完成该交互的真实视觉验收。
- Web/Mini 当前先有安全完整性提示，并未宣称达到 Android 的同等展开交互体验。不得偷偷将原始来源角色重新应用于 Review。
- `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`。PR #2 不合并，不发布，不改变视觉基线。
