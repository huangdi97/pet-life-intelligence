# PRIVACY_AUDIT — 隐私与数据生命周期审计

- Date: 2026-09-14
- 基线：tests/ga/test_privacy_lifecycle.py（字段掩码/撤回不可见/owner-only export/search 不泄露）全绿。

## 覆盖

| 项 | 覆盖 | 证据 |
|---|---|---|
| Cross-pet / cross-household 隔离 | PASS | ABAC + E2E-07 |
| Share revoke | PASS | DELETE share-token + revoked 检查 + 审计 |
| Care expiry | PASS | grant/handoff 到期自动失效 + worker |
| Export | PASS | /pets/{pet_id}/export owner-only |
| Delete（pet/household） | PASS | deletion-requests 流程存在 |
| Audit | PASS | AuditEntry 全操作记录 + Admin 可查 |
| Media 隔离 | PASS | artifact 归属 pet，访问走权限 |
| Search leak | PASS | search/ask 限定当前 pet |
| 字段级掩码 | PASS | PLI-012 field_privacy 真实掩码 |
| 撤回记录不可见 | PASS | retracted 事件不进入 search/ask |

## 隐私政策文档

- docs/PRIVACY.md + SECURITY.md + PRIVACY_MODEL.md 存在。
- 法律审核状态：**LEGAL_REVIEW_PENDING**（未经律师审核，模板级）。

## 生产注意

1. 真实平台（微信/App Store）隐私清单需按官方规则在发布包内填写（见 docs/release/*）。
2. PWA 离线壳只缓存静态 UI，不缓存医疗/敏感数据（sw.js 明确 network-first + 不缓存 API/分享页）。

## 结论

隐私 GA blocker：无。跨端不泄露、导出/删除/撤销真实执行。法律审核未完成如实标记。