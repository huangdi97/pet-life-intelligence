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
| Medication | Full | Full | Full | — | Full |
| Vet Brief | Full | Full | Full | — | Full |
| Care / Handoff | Full | Full | Full | — | Full |
| Behavior | Full | Full | Full | — | Full（ABC 显式） |
| Training | Full | Full | Full | — | Full |
| Welfare | Full | Full | Full | — | — |
| Social | Full | Full | Full | — | — |
| Monitoring | Full | Compact | Full | Device audit | — |
| Companion | Full（硬件能力按真实状态降级） | Full（轻量） | Full（硬件能力按真实状态降级） | — | — |
| Agent (Assistant) | Full | Full | Full | — | — |
| Notifications | Full | Full | Full | — | — |
| Settings / Me | Full | Full | Full | — | — |
| Platform / Flags | — | — | — | Full | — |

## 一致性规则

1. 同一能力跨端：同一信息层级（State/Attention/Action），同一语义色与 Risk 标签，同一 zh-CN 文案（COPY_GUIDELINES）。
2. Compact 端（Mini/Mobile）降低信息密度，不删关键状态与安全信息。
3. Companion 端：跨端一致的诚实能力降级原则；Owner UI 不展示 PROTOTYPE / feature flag，未接硬件时显示无设备/不可用状态，不伪装 LIVE。
4. 审计端（Admin）：只看平台事实（users/pets/safety/ai/devices/audit/incidents/flags），不混 Owner 体验。
5. Professional：专业术语显式（ABC / Vet Brief 分区），数据与 Owner 端同源（同一 API/schema）。

## 契约保护

- 前端不各自造 DTO：统一 packages/domain-schema + packages/api-client。
- E2E：现有 12/12（Web 七路径 + auth + PWA/share）不回归；新增关键 UX E2E 覆盖 Today/Quick Log/Timeline。


## R5.3 implementation note（2026-10-04）

- Mobile 已补齐原生 Care / Handoff 与 Medication owner surfaces，并从 Pet / Health / Me 的真实情境入口进入。
- Mini 已补齐 Welfare / Social / Monitoring，并将 Companion 从 prototype gate 升级为诚实的 Living Experience。
- Mini 的高保真交互 3D 仍是明确的平台能力例外：该客户端保持轻量视觉；Web/Android 承担可交互 Twin。
- 表格中的 “Full” 指该客户端拥有完整的 owner-facing information/state/action surface，不表示外部硬件/第三方依赖已解除。
- Human Visual Acceptance 仍独立于功能矩阵，必须依据最新截图/Contact Sheet 判定。
