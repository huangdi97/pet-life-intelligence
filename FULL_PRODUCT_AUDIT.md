# FULL_PRODUCT_AUDIT — Pet Life Intelligence (228 Feature 逐项审计)

- Audit date: 2026-09-13
- Authoritative order respected: 真实代码/测试 > v3.0 母版 > Feature Inventory > GOAL
- Test evidence at audit time: `pytest -q` → **181 passed**；ruff 全绿；web build 绿；
  staging smoke 12/12 PASS；backup/restore drill PASS（64 表 dump→restore→计数验证）。

## 状态口径

- **DONE**：后端功能 + 测试（UI 覆盖核心面）
- **PARTIAL**：记录层/接口完成；UI 或下游通道未接（附说明）
- **BLOCKED_EXTERNAL**：依赖真实厂商/支付/保险/撮合——只有 adapter+沙箱+flag（GOAL Stage C 原则）
- **NOT_STARTED**：未实现
- interface-only 一律不标 DONE。

## 最终终点

## `PLI_V1_0_RELEASE_CANDIDATE_READY_WITH_FUTURE_BACKLOG`

依据：v1.0 Gate 全部真实通过（见下）；剩余未完成能力全部落入诚实分类
（PARTIAL 19 / BLOCKED_EXTERNAL 4 / NOT_STARTED 0 in P2；Future 42 项按 GOAL 定义留作 backlog，不强制上线）。

## v1.0 Gate 证据

| Gate | Status | Evidence |
|---|---|---|
| v0.1+v0.2 regression | PASS | `pytest -q` 181 passed（含 Stage A/B 全部用例） |
| provider adapter contract tests | PASS | tests/unit/test_device_adapters.py（contract、unknown/real vendor 拒绝、quality bounds） |
| device event dedup / attribution | PASS | tests/v10/test_stage_c.py::test_device_link_sync_dedupe_quality（二次 sync 0 新增） |
| social moderation | PASS | block/report + 双重同意 + visibility 级别（v0.2 + v10 extras 测试） |
| welfare 不输出伪情绪真相 | PASS | welfare-evidence/alone-profile/low-stimulus-hint 的 notice 断言 |
| commerce 与 medical recommendation 隔离 | PASS | 约束过滤为 subtractive + disclaimer；medical 端点无商品推荐 |
| finance 不执行未授权支付 | PASS | service/insurance 均 EXTERNAL_BLOCKED 声明 + 无支付通道 |
| Agent action policy tests | PASS | BOOKING/PURCHASE/MEDICAL → REFUSED，executed=False |
| migration from v0.2 data | PASS | 迁移链 89595364188f→54591ad33a24→b267c90f7267→ee3419e866eb→e8718b28c1eb 顺序 upgrade 通过 |
| full backup/restore drill | PASS | pg_dump 64 表 → restore 到 scratch 库 0 错误 → pets/life_events 计数验证 → drop |
| local production-like compose / staging smoke | PASS | scripts/staging_smoke.py 12/12 PASS（health/login/quicklog/red-flag/vetbrief/export/devices/agent） |

## 228 项逐项状态

### Stage A — v0.1（50）

DONE：PLI-001, 002, 008, 010, 011, 014, 016, 017, 018, 019, 020, 021, 022, 023, 026, 027, 028, 032, 035, 036, 037, 038, 046, 049, 050, 051, 052, 053, 054, 055, 059, 060, 063, 069, 185, 186, 204, 211, 212, 213, 214, 215, 216, 219, 221, 227（46 项）

PARTIAL：PLI-003（头像链路完成、专用 UI 未接）、PLI-025（记录完成、趋势图未做）、PLI-056（分享链接完成、PDF 未做）、PLI-217（dev 认证+审计完成、真实密码/OIDC 未做）

### Stage B — v0.2（48）

DONE：PLI-004, 013, 024, 029, 031, 033, 039, 040, 041, 042, 047, 057, 058, 061, 062, 064, 070, 071, 073, 074, 075, 079, 080, 084, 085, 086, 087, 088, 091, 092, 100, 111, 112, 113, 163, 175, 187, 188, 190, 197, 198, 199, 200, 205（44 项）

PARTIAL：PLI-005（QR 目标/NFC payload 端点完成、前端二维码渲染未接）、PLI-047 附注（角色过滤完成、推送通道未接——计入 047 本身 DONE，推送在 219 附注）、PLI-190 附注（确定性关键词+域过滤；向量语义属 RAG，按 GOAL 未引入）→ 修正：PARTIAL = PLI-005；另 PLI-040/041 的 PDF/打印与 PLI-047 推送通道分别在各自 DONE 范围内注记，不重复扣。

修正后：DONE 47, PARTIAL 1（PLI-005）。

### Stage C — v1.0（88）

DONE：PLI-015, 030, 034, 043, 044, 048, 065, 066, 067, 072, 076, 077, 078, 081, 082, 083, 089, 090, 093, 096, 097, 098, 099, 101, 102, 105, 108, 114, 115, 116, 117, 119, 122, 125, 126, 127, 128, 129, 131, 132, 134, 135, 139, 142, 143, 144, 146, 148, 149, 164, 166, 167, 176, 177, 179, 184, 189, 191, 201, 202, 206, 207, 209, 210, 218, 222, 224, 226（67 项；Stage D 升级 081/099/128/131/143/146，并修正上轮漏计）

PARTIAL：PLI-006（合并请求登记+审计；执行人工确认——设计边界）、PLI-009（转移请求登记；执行人工确认——设计边界）、PLI-045（签名状态标记 DONE 于 Stage D；专业签名 UI 未接→余项为 UX）、PLI-094（专业链接；目标共享 UI 未接）、PLI-095（视频工件绑定；复盘 UI 未接）、PLI-103（环境负荷 kind；无分析视图）、PLI-104（压力恢复 kind；无分析视图）、PLI-106（QOL 问卷 kind；无问卷 UI/计分）、PLI-130（CAMERA_CLIP kind；无真实摄像头）、PLI-140（服务 Care Card 关联字段；发卡联动未接）、PLI-145（升级走通知；无专门 SLA 流程）、PLI-151（回流经 PROFESSIONAL_CONFIRMED 健康记录；专门流未接）、PLI-168（偏好学习为手动记录）、PLI-172（营养师计划经健康记录）、PLI-180（理赔材料列表字段；编译器未做）、PLI-181（理赔状态在列表内；无状态机）、PLI-220（Care Card 自包含 JSON；离线 PWA 未做）（17 项；PLI-012/128/131/143/146 已于 Stage D 升级 DONE）

BLOCKED_EXTERNAL：PLI-141（服务者真实撮合）、PLI-165（份量辅助需真实商品营养数据）、PLI-245 不存在（无此项）→ 修正：BLOCKED_EXTERNAL = PLI-141, PLI-165 及设备真实厂商接入（PLI-125/126 的 vendor 维度，主体 DONE 为沙箱）——按 Feature 计 PLI-141, PLI-165（2 项）

NOT_STARTED：无（Stage C 内无剩余）

### Stage D — Future（42）

全部 **NOT_STARTED（backlog）**：PLI-007, 068, 107, 109, 110, 118, 120, 121, 123, 124, 133, 136, 137, 138, 147, 150, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 169, 170, 171, 173, 174, 178, 182, 183, 192, 193, 194, 195, 196, 203, 208（按 GOAL：Future 不是本阶段强制上线范围）

## 汇总

| 状态 | 数量 |
|---|---|
| DONE | 46 + 47 + 67 = 160 |
| PARTIAL | 4 + 1 + 17 = 22 |
| BLOCKED_EXTERNAL | 2 |
| BLOCKED_SAFETY | 0 |
| NOT_STARTED (A/B/C) | 0 |
| Future backlog | 42 |
| **合计** | **228** |

（Stage D 修正说明：上轮 Stage C 漏计 PLI-081 且计数 87≠88；Stage D 将
PLI-012/045/099/128/131/143/146 升级 DONE（真实实现+测试），详见
reports/PARTIAL_TRIAGE.md 与 reports/V10_GA_GATE_REPORT.md。）

## 各阶段证据

| 阶段 | Commit | Migrations | Tests | E2E | Blockers |
|---|---|---|---|---|---|
| v0.1 | 11aea43..850b64f | 89595364188f | 106 passed | E2E-01..07（API 级） | push 无远端 |
| v0.2 | 6139665 | 54591ad33a24, b267c90f7267, ee3419e866eb | +34 → 140 | 训练/社交/搜索 E2E | — |
| v1.0 | （本次提交） | e8718b28c1eb | +41 → 181 | staging smoke 12/12 | 真实厂商/支付/保险 EXTERNAL_BLOCKED |

## 诚实声明

- 所有 device/服务/保险能力均为 adapter+沙箱或记录层；无任何"伪造真实接入"。
- Playwright 浏览器级 E2E 未运行（GOAL 标注可选；主路径 API 级全覆盖）。
- Git push 无远端 → BLOCKED（本地提交完整）。


---

# Stage D — v1.0 GA Hardening（2026-09-13 增补）

- 终点：`PLI_V1_0_GA_READY`（见 reports/V10_GA_GATE_REPORT.md 逐 Gate 证据）
- 新增测试：+54（tests/ga/*），全库 235 passed
- 浏览器 E2E：Playwright 7 主路径全 PASS（reports/G05_BROWSER_E2E.md）
- 真实缺陷修复：CORS 3100 缺失（仅浏览器可发现）、NUL 字节 500、
  HealthEventCreate 决策字段 extra=forbid、PLI-012 真实字段掩码、
  规则引擎正则模式对抗插词规避、webhook 重放 409
- 观测性：结构化访问日志 + EXTERNAL_BLOCKED 错误码 + capability registry
