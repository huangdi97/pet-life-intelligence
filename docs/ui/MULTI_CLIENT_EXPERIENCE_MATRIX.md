# MULTI_CLIENT_EXPERIENCE_MATRIX — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 实际状态按代码确定（下表为 Stage H 完成后目标态；审计以 reports/STAGE_H_MULTI_CLIENT_AUDIT.md 为准）
> 取值：Full / Compact / View / Audit / Prototype / —（不提供）

## 跨端体验矩阵

| Experience | Web | Mini | Mobile | Admin | Professional |
|---|---|---|---|---|---|
| Today | Full | Full | Full | — | — |
| Timeline | Full | Full | Full | View | View |
| Quick Log | Full | Full | Full | — | — |
| Health | Full | Full | Full | Audit | Full |
| Medication | Full | Full | — | — | Full |
| Vet Brief | Full | Full | Full | — | Full |
| Care / Handoff | Full | Full | — | — | Full |
| Behavior | Full | Full | — | — | Full（ABC 显式） |
| Training | Full | Full | — | — | Full |
| Welfare | Full | Compact | — | — | — |
| Social | Full | Compact | — | — | — |
| Monitoring | Full | Compact | Full | Device audit | — |
| Companion | Prototype | Prototype | Prototype | — | — |
| Agent (Assistant) | Full | Full | Compact | — | — |
| Notifications | Full | Full | Full | — | — |
| Settings / Me | Full | Full | Compact | — | — |
| Platform / Flags | — | — | — | Full | — |

## 一致性规则

1. 同一能力跨端：同一信息层级（State/Attention/Action），同一语义色与 Risk 标签，同一 zh-CN 文案（COPY_GUIDELINES）。
2. Compact 端（Mini/Mobile）降低信息密度，不删关键状态与安全信息。
3. Prototype 端（Companion）：跨端一致的 PROTOTYPE 标记与不伪装成功原则。
4. 审计端（Admin）：只看平台事实（users/pets/safety/ai/devices/audit/incidents/flags），不混 Owner 体验。
5. Professional：专业术语显式（ABC / Vet Brief 分区），数据与 Owner 端同源（同一 API/schema）。

## 契约保护

- 前端不各自造 DTO：统一 packages/domain-schema + packages/api-client。
- E2E：现有 12/12（Web 七路径 + auth + PWA/share）不回归；新增关键 UX E2E 覆盖 Today/Quick Log/Timeline。
