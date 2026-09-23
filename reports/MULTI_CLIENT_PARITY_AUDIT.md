# MULTI-CLIENT PARITY AUDIT（Stage V）
- 报告日期：2026-09-23
- 方法：逐 Feature 判断 Should Web/Mini/Mobile/Pro/Admin 职责，避免把「某端非目标端」误判为设计差异。

## 1. 职责矩阵（Should 有 vs 实际有）

| 能力 | Web | Mini | Mobile | Pro | Admin | 判定 |
|---|---|---|---|---|---|---|
| Today / Quick Log | ✅ | ✅ | ✅ | —（不适用） | — | 一致 |
| Timeline | ✅ | ✅ | ✅ | ✅（只读视图） | — | 一致（Pro 只读为设计） |
| Health 全流程 | ✅ | ✅ | ✅ | ✅（brief/evidence） | ✅（audit） | 一致 |
| Vet Brief | ✅ | ✅ | ✅（H5 分享路径） | ✅ | — | 一致 |
| Medication | ✅ | ✅ | ✅ | ✅（计划/给药） | — | 一致 |
| Behavior / Training | ✅ | ✅ | ✅ | ✅ | — | 一致 |
| Care / Handoff | ✅ | ✅ | ✅ | ✅（care cards） | — | 一致 |
| Welfare / Social | ✅ | —（设计密度更低，仅入口） | ✅ | — | — | 记录：Mini 保持入口级（MULTI_CLIENT_EXPERIENCE_MATRIX 已登记） |
| Monitoring / Devices | ✅ | ✅ | ✅ | — | ✅（device audit） | 一致 |
| Companion | ✅（Prototype） | ✅（Prototype） | ✅（Prototype） | — | — | 一致（三端 Prototype，诚实 blocked） |
| 3D Life View / Capture | ✅ | ✅（life-view） | ✅（LifeViewScreen） | — | — | 一致 |
| Agent / Assistant | ✅ | ✅ | ✅ | — | — | 一致 |
| Notifications | ✅ | ✅ | ✅ | — | — | 一致 |
| Me / Settings / Privacy | ✅ | ✅（mine） | ✅ | — | — | 一致 |
| Pilot 运营 | — | — | — | — | ✅（pilot 卡/状态） | 一致（ADMIN_ONLY） |
| Feature Flags / Ops | — | — | — | — | ✅（ops 门禁 SV-001 已修） | 一致 |

## 2. 判定原则
- Welfare/Social 在 Mini 端为「入口 + 摘要」而非完整页：这是**有意的信息密度设计**（§68 Mini 密度低于 Desktop），已在 MULTI_CLIENT_EXPERIENCE_MATRIX.md 登记，非遗漏。
- Pro 端 Timeline 为只读视图：Pro 角色是审阅者非记录者，属角色职责，非不一致。
- Admin 不混 Owner 页面（§70）：通过独立 apps/admin 实现，IA 分层验证通过。

## 3. 结论
`MULTI_CLIENT_AUDIT_PASS`：所有 Should 职责在对应端均有实现或明确登记的设计差异；无「某端应有无实现」的隐藏遗漏。
