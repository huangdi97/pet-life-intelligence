# PLI R8AC · 当日依据 / 同期参考在主人来源页可解释

## 真实缺口
R8AB 在新 HEAD 已实测展示所有 11 条真实事件及其时长、来源、发生/录入两种时间，但同一清单没有告诉主人哪条记录构成当日变化，哪条是比较的历史同期记录。

## 本次改动
- 来源列表按 Case `computed_at` 和事件 `occurred_at`，依照当前算法的 **UTC+08 日期边界**标识 `当日依据` / `同期参考` / `日期待核实`，不随手机时区变化而改变计算解释。
- 显示**当前已加载页**的各组数量和已查看 N/M 进度。未加载的分页数据不被冒充已核对。
- 每条来源同时保留真实数值、发生和录入时间、原始来源身份及完整不可变事件 ID（无障碍标签）；不额外曝光 payload 自由文本。
- 保留每批 8 条、确认 pet ID/event ID、异步 generation 防串宠和所有 Review 后台安全规则。
- Node 测试真实执行 TypeScript helper：UTC/+08 等价时刻、跨午夜、未来或损坏时间，原有 23 条分页及身份失败测试继续执行。

## 限制和后续门槛
角色目前根据 Case 已保存的 `computed_at` 判定，原始对比时刻来自 `abnormal-day-hint.as_of`。若后端 Case 创建刚好跨越 UTC+08 午夜，二者的日期可能不同。下一阶段应由后端冻结**当日/历史来源 ID 的分区和原始比较时刻**，避免客户端推断；不能夸称当前已解决午夜跨日的所有语义问题。

本改动不是实时监测、医学确诊、主人核准的个体化 3D，也不是 Human Visual Acceptance。最新 HEAD 的 CI 和 Android UIAutomator 仍需复核。

`NO_VISION_MODEL_USED=TRUE` · `HUMAN_VISUAL_ACCEPTANCE=PENDING` · `3D_ASSET_QUALITY=BLOCKED_BY_SOURCE_ASSET`. 不合并 PR #2、不发布、不更新基线。
