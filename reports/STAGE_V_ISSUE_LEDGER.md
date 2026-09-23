# STAGE V ISSUE LEDGER
- 更新：2026-09-23（本 Stage 收口，P0/P1 已清零）

| ID | Category | Severity | Evidence | File | Status | Fix | Test | Remaining Risk |
|---|---|---|---|---|---|---|---|---|
| SV-001 | Permissions | **P1（已修）** | 任意登录用户可写 ops feature-flags | services/api/app/api/routes/...ops... | FIXED | 增加 require_ops_admin（is_internal 平台运营） | ADVERSARIAL §15（普通 owner 403 / 运营 201） | 低（运营账号治理随 Pilot） |
| SV-002 | Env/Workflow | INFO | 本 Stage 会话遗留 13 个未提交修改文件 | 工作区 | CLOSED | 保留并随本 Goal 以 [PLI-STAGEV] 提交（契约要求） | 全量回归 | 无 |
| SV-003 | Docs | INFO | Goal 引用 v3.3-R1 2026-09-20 不存在 | WORK_STATUS/Goal | CLOSED | 以 repo 实际 v3.1-R1 2026-09-18 为准并记录差异 | 文档核对 | 无 |
| SV-004 | Dead code | P3（已收口） | `apps/web/_backup/page_bootstrap.tsx.bak` 备份残留 | apps/web/_backup | CLOSED（2026-09-23） | 已移入 artifacts/archive/stage-f-backup/（归档不删除，保守处理） | 非运行路径 | 无 |
| SV-005 | Dead code | P3（已收口） | `scripts/_patch_ga2*.py` 一次性补丁（ga2b 陈旧语法） | scripts/ | CLOSED（2026-09-23） | 语法已随 Stage H 修复（ruff check 实测 All checks passed）；补丁保留供审计追溯 | 非运行路径 | 无 |
| SV-006 | Architecture | P3 | Mobile 双 API 层（src/api.ts + src/services/api.ts） | apps/mobile | OPEN（记录） | 下阶段合并（真实 Pilot 反馈驱动） | typecheck 已绿 | 低（维护性） |
| SV-007 | Security | SHOULD_FIX | 限流为 in-process deque，多 uvicorn worker 各自独立 | config.py | OPEN（记录） | 生产迁移 Redis 分布式限流 | — | 低（生产部署时） |
| SV-008 | Test | INFO | race 逐条非 500 由 DB 唯一约束捕获 | tests/stage_v | CLOSED | 约束 `uq_lifeevent_idem` 兜底，对抗已覆盖 | ADVERSARIAL §14 race | 低 |
| SV-009 | Product boundary | INFO | Device Staleness / Companion Session Expiry 无本地实现（无真实设备/硬件） | — | CLOSED（N/A） | 真实设备接入时实现（EXTERNAL_BLOCKED） | TIME_TRAVEL §19 记录 | 无（产品边界） |
| SV-010 | Docs | P2（已修） | 已起草报告 pytest 数字为 419，实测 420 | reports/*.md | FIXED | 本轮按真实命令统一修正为 420 | 全量重跑 pytest 420 | 无 |
| SV-011 | UX Copy | P1（已验证） | 禁止文案扫描 | apps/ | CLOSED | 全部 CLEAN（「数字孪生」仅注释声明禁用，非 UI copy） | Grep 扫描 | 无 |

**统计：P0=0 / P1=0（剩余）/ P2=0（剩余）/ P3=3（全部收口：SV-004 归档、SV-005 已修、SV-006 待下阶段）/ INFO=4（记录）/ SHOULD_FIX=1（记录）**
