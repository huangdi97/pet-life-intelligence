# PRIVACY_MODEL

## 数据最小化

- 只采集照护与医疗必需字段；Care Card 分享只含最小字段（喂食/用药/禁忌/紧急联系/首选医院文字）。
- 日志不记录完整病历正文或媒体内容（只记 id/动作/摘要）。

## 数据分类

| 类别 | 示例 | 保护 |
|---|---|---|
| 身份数据 | 用户邮箱、显示名 | 认证后可见；家庭成员可见 |
| 日常事件 | 吃喝拉撒玩、体重 | household + 授权范围内可见 |
| 医疗数据 | 健康事件、观察、用药、Outcome | `medical:read/write` 能力；sensitive artifact 单独审计 |
| 媒体 | 照片/视频 | 权限校验 + 敏感标记审计 |

## 同意（Consent）

四个目的，按宠物维度管理：SERVICE_ESSENTIAL（必需，不可撤回）、
AI_INFERENCE、RESEARCH_SECONDARY_USE、EXTERNAL_SHARING（默认关闭）。
每次变更发 `consent.changed` 事件 + 审计（PLI-016/215）。

## 分享

- Care Card / Vet Brief 分享令牌：最小字段或单一摘要、短期、可撤销、访问计数+审计。
- 分享默认不泄露完整医疗历史（测试断言）。

## 删除与保留（PLI-216）

- 用户可见的删除请求状态（deletion_requests：PENDING → 人工确认）。
- v0.1 不自动删除：删除是高风险动作，需显式人工确认后离线执行（AGENTS.md §5）。
- 事实不可静默覆盖：修改通过 supersedes 新版本；撤回只置 `retracted_at`，历史保留以保
  医疗追溯完整性。这可能与"立即删除"冲突，执行删除时需人工权衡并记录。

## AI 处理

- AI 输出标记 AI_DERIVED 并记录 model/prompt/schema version（PLI-214）。
- AI 不改变事实来源层级；主人原始陈述始终单独保留（OWNER_STATEMENT）。
- v0.1 默认 MockProvider（无外部数据出域）；真实 provider 需核对
  EXTERNAL_SHARING/AI_INFERENCE 同意与数据处理协议后方可启用。
