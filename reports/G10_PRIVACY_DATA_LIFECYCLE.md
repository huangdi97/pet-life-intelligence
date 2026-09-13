# G10 — Privacy & Data Lifecycle (Stage D Phase 5)

- Date: 2026-09-13
- Verdict: **PASS**（GA-critical；PLI-012 已由 audit-record 升级为真实掩码）

## 8.1 Field-level privacy（真实执行，本阶段修复）

实现：`pets.field_privacy JSONB`（迁移 9b0058ac2e82）+ 序列化强制：
- `GET /pets/{id}`：无 `manage:pet` 能力的查看者（family/caregiver/sitter）
  看到的掩码字段为 null，响应带 `field_privacy_applied`；owner/co-owner 永远全量。
- Care Card 序列化尊重掩码（birth_date/breed 置 null 并标注）。
- 可掩码字段白名单：weight_note / birth_date / breed（身份字段 name 不可掩码，422）。
- search 仅索引事件 payload，宠物元数据字段不在其中（无泄露面）。
- 应用日志（pli.access）只记 method/path/status/duration/request_id —— 无 body。
- 测试：`tests/ga/test_privacy_lifecycle.py::TestFieldPrivacy`（4 项）。
- AIInferenceLog 说明：保存 ≤500 字符输入/输出摘要用于 AI provenance
  （PLI-214 要求），无任何 API 暴露该表；此口径记录于 PRIVACY_MODEL.md。

## 8.2 Deletion

- 删除请求仅登记（PENDING）+ 通知 + 审计；执行需人工确认（AGENTS §5 高风险动作）。
- 事件撤回（retract）：Timeline 不再返回、search 不命中（测试
  `TestRetractedAndArchived::test_retracted_event_invisible_everywhere`）；
  audit 保留事件本身（合规追溯），API 不可访问。
- 宠物 DECEASED 为终态（v0.2 测试），TRANSFERRED 走人工确认流程。
- search/派生视图无独立物化副本（无残留面）。

## 8.3 Export

- `GET /pets/{id}/export`：owner-only（family 403 已测）、含全部带 provenance
  事件、UTF-8 中文完好（测试断言"鸡肉配方"）、500+ 事件下正常（perf fixture）。
- 不导出他人宠物（outsider 403 测试）。

## 8.4 Retention

- 现状：无自动 retention 任务（不伪造）。PRIVACY_MODEL.md 已载明：
  当前行为（数据保留 + 用户可见删除请求 + 人工执行）、未来策略占位、
  与"不可静默覆盖"的合规权衡说明。

## 8.5 Audit trail

高风险操作审计断言（`TestAuditTrailHighRisk`）：transfer.request /
grant.create / care_card.issue 全部落 audit_entries；medical 敏感工件读取
（artifact.view_sensitive）、分享访问、字段隐私变更、agent 提案均有写入。
