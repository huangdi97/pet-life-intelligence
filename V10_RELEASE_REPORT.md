# V10 RELEASE REPORT — Pet Life Intelligence v1.0 (GA)

- Date: 2026-09-13
- Head: 见 §20.2；branch `main`

## 20.1 Final Status

## `PLI_V1_0_GA_READY`

依据：reports/V10_GA_GATE_REPORT.md — G0–G17 全部 PASS；
六个 critical Gates（Browser E2E / Migration / Backup-Restore / Security /
Medical Safety / Privacy）均为无条件 PASS。

## 20.2 Git

- branch: `main`
- head: 本报告提交（chore: v1.0.0 release），前一功能提交 61da455
- working tree: clean
- remote: 无 → **PUSH_BLOCKED_NO_REMOTE**（未伪造推送）

## 20.3 Quality

| 项 | 结果 |
|---|---|
| pytest | **235 passed**（含 GA 安全/医疗/隐私/幂等 54 项新增） |
| Playwright | **7 passed**（真实 Chromium；7 条浏览器主路径） |
| ruff | 0 error |
| web typecheck | 0 error |
| web build | 绿（16 routes） |
| migration | 空库→head 重放 ✓；downgrade×2+re-upgrade ✓（G06） |
| staging smoke | 12/12 PASS（G15） |

## 20.4 Safety

- **auth**：dev 签名会话（v1.0 设计模式）；malformed/unknown/inactive 全 401。
- **IDOR**：33 探针矩阵（15+ 资源类）无一 2xx；404 不泄露存在性；403 无业务字段。
- **privacy**：PLI-012 字段掩码真实执行（序列化层+Care Card）；撤回事件全域不可见；
  export owner-only；访问日志无 body。
- **medical**：规则引擎独立且版本化；淡化语言/提示注入不可降级；
  决策字段 schema 层禁入；升级单调。
- **high-risk agent controls**：BOOKING/PURCHASE/MEDICAL → REFUSED；
  transfer/merge/deletion 仅登记（人工确认边界）。

## 20.5 Recovery

- 备份/恢复 round 2：64 表 dump → 全新库恢复 0 错误 → 计数一致 →
  恢复库 API 登录/读/写 smoke PASS（G07）。

## 20.6 Accepted Limitations（随 GA 发布，逐项）

1. 认证为 dev 模式（PLI-217）；生产部署需替换 secret 并接入密码/OIDC。
2. Vet Brief 分享为 JSON 端点（PDF 导出未做）。
3. 通知无推送通道（站内列表 + 邮件/推送为 EXTERNAL/未来）。
4. 视觉 polish 与真机视觉验收未做（功能与状态覆盖已验）。
5. 病毒扫描边界未实现（上传有 MIME+魔数+大小校验）。
6. Worker 为轮询式（幂等保证重试安全）；无 durable queue。
7. 速率限制为进程内实现（多实例需 Redis 化）。
8. 性能基线为单用户顺序负载（并发容量未压测）。
9. PLI-005 QR 前端渲染、PLI-003 头像专用 UI（UX_POLISH → v1.0.1）。
10. PARTIAL 22 项分类见 reports/PARTIAL_TRIAGE.md（多数为记录层完成、UI 待接）。

## 20.7 External Blockers（真实外部依赖，均 EXTERNAL_BLOCKED）

1. PLI-141 服务者真实撮合（需平台运营与合规）。
2. PLI-165 份量辅助（需真实商品营养数据库）。
3. 设备真实厂商接入（PETKIT/Tractive 等：无凭据/协议/沙箱——adapter+沙箱+flag 就绪）。
4. 真实支付 / 保险理赔通道 / 推送服务商 / 医院预约系统。

## 20.8 Future Backlog

Future 42 项保持 backlog（PLI-007, 068, 107…208，见 FULL_PRODUCT_AUDIT.md Stage D 节）。

## 20.9 Startup

```powershell
cd "E:\AI\Pet Life Intelligence"
.\scripts\dev.ps1      # 依赖(55432/56379/59000) + migrate + seed + API:8800 + Web:3100 + worker
# Web: http://localhost:3100/login  (owner@pli.demo / family@pli.demo / sitter@pli.demo)
# 验证: .venv\Scripts\python.exe -X utf8 scripts\staging_smoke.py
```

## 20.10 Known Issues

1. 无远端仓库 → 未推送（PUSH_BLOCKED_NO_REMOTE）。
2. PowerShell 5.1 对中文 body 的编码限制 —— 一切含中文的自动验证使用
   Python httpx（staging_smoke.py 为权威）。
3. 进程内速率限制与轮询 worker（见 §20.6 第 6/7 条）。
4. timeline search 为关键词匹配（向量语义检索按 GOAL 未引入）。
