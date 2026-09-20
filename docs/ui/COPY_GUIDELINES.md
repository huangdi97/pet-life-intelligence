# COPY_GUIDELINES — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · zh-CN 默认；键值集中（apps/web/lib/i18n.ts + 各端镜像）；禁止散落 hard-code

## 1. 统一范围（§74）

医疗风险语言 / AI 不确定性 / 空状态 / 错误 / 权限 / 隐私 / Consent / Notification —— 全部走统一 copy 层（i18n dict），新 copy 必须加 key。

## 2. 禁止文案（§75，无充分依据一律禁用）

- 「AI 确诊」「确诊」类断言（AI 不诊断）
- 「宠物很伤心」「宠物想你了」「宠物开心/难过」类拟情绪断言
- 「98% 开心」「100% 安全」类伪精确/绝对化
- 「豆豆正在给你打电话」（宠物不理解视频电话）
- 「豆豆想你了」（无依据拟人）

## 3. Companion 文案（§76）

事实表达，不拟人不伪能力：

| ❌ 禁止 | ✅ 使用 |
|---|---|
| 豆豆想你了 | 豆豆刚刚来到互动设备附近 |
| 豆豆正在给你打电话 | 豆豆触发了互动按钮 |
| 豆豆很开心 | 豆豆活跃了 18 分钟（观察事实） |
| 远程陪伴成功 | 原型演示：未连接真实设备 |

## 4. 医疗风险语言

- 风险等级用统一标签：正常 / 注意 / 观察 / 建议就医 / 紧急 / 危及生命（+ secondary English: Normal/Notice/Monitor/Vet Soon/Urgent/Emergency）。
- 红旗必须呈现规则来源（rule_id）；Next Action 用祈使句但不诊断：「请尽快联系兽医」不是「宠物患有 X」。
- 紧急信息使用 EmergencyAction 组件（role=alert），包含「立即」字样的行动指令。
- 免责声明固定：「本摘要为信息整理，不是兽医诊断」。
- 不把未发现红旗写成「没有疾病」→ 使用「未发现红旗规则触发」。
- 不把图片结果写成确定诊断 → 「影像观察（待专业确认）」。

## 5. AI 不确定性

- AI 输出必须带「AI 生成」徽章 + Sources（CitationChip）+ Uncertainty 提示。
- 不确定时明示：「基于现有记录推断，可能不完整」。
- AI EXTERNAL_BLOCKED（无 provider）时：「服务暂未开放」——不显示 AI 编造内容兜底。

## 6. 错误映射（§62，用户不可见 raw codes）

| 内部 | 用户看到 |
|---|---|
| EXTERNAL_BLOCKED | 该服务暂未开放 |
| Schema validation failed / payload invalid | 提交的内容格式有误，请检查后重试 |
| 500 Internal Server Error / network | 服务暂时不可用，请稍后重试 |
| 403 / permission | 没有查看此内容的权限。如需访问，请联系宠物主人授权。 |
| 404 | 页面不存在 |
| NO_PET_SELECTED | 请先选择宠物 |
| timeout | 连接超时，请重试 |

## 7. 空状态（统一）

- 时间线：「还没有记录。」+ CTA 快速记录
- 任务：「没有待办任务。」
- 通知：「暂时没有新通知。」
- 宠物：「还没有宠物，先创建一只吧。」+ CTA 创建宠物档案
- 能力未开放：「该服务暂未开放」（不显示工程细节）

## 8. 离线（§63）

- 草稿状态四档：未同步 / 同步中 / 已同步 / 同步失败。
- Quick Log / Behavior / Health Intake / Care Note 离线可起草，恢复后同步。

## 9. 权限 / 隐私 / Consent / Notification

- 权限拒绝统一文案（§6 表）；不暴露角色/授权细节。
- 隐私：导出/删除用平实语言；说明数据用途与保留期。
- Consent：按用途逐项（研究/训练等），默认最小化。
- Notification：分类（Tasks/Care/Health/Medication/Monitoring/System）+ 打包 + 去重 + 优先级；不轰炸。
