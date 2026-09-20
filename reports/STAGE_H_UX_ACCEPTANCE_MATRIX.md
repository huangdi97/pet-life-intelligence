# STAGE_H_UX_ACCEPTANCE_MATRIX — 核心页面接受度矩阵

> 日期：2026-09-20 · 阶段：Stage H（全产品设计 / UI·UX / 多端前端完成）
> 状态取值（§99）：PASS / PASS_WITH_LIMITATION / EXTERNAL_BLOCKED / PROTOTYPE / NOT_APPLICABLE
> 依据：真实代码审计（apps/* 路由与组件，2026-09-20）+ docs/ui/MULTI_CLIENT_EXPERIENCE_MATRIX.md + docs/product/MASTER_PAGE_INVENTORY.md
> E2E：本地 Playwright **17/17 PASS**（12 旧路径 + 5 新 Stage H UX）

## 1. 验收矩阵

| Page | Web | Mini | Mobile | Admin | Professional | Responsive | Accessibility | States | E2E | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Today（OWN-001） | Full | Full | Full | — | — | PASS | PASS | L/S/E/P/F/X/O | E2E-01 | **PASS** |
| Quick Log（OWN-002） | Full | Full | Full | — | — | PASS | PASS | L/X/O(草稿) | E2E-01 | **PASS** |
| Timeline（OWN-003） | Full | Full | Full | View | View | PASS | PASS | L/S/E/F/X/O | E2E-01/03/06 | **PASS** |
| Pet Profile（OWN-004） | Full | Full | Compact | — | — | PASS | PASS | L/E/F/X/N | — | **PASS_WITH_LIMITATION**（domain 分区齐全；bio 字段级隐私待真实数据） |
| Health（OWN-005） | Full | Full | Full | Audit | Full | PASS | PASS | L/E/F/X/SB/D/N | E2E-03 | **PASS** |
| Vet Brief（OWN-006） | Full | Full | Full | — | Full | PASS | PASS | L/F/X/D | E2E-09 | **PASS** |
| Medication（OWN-007） | Full | Full | — | — | Full | PASS | PASS | L/E/F/X/D | E2E-04 | **PASS** |
| Care / Handoff（OWN-008） | Full | Full | — | — | Full | PASS | PASS | L/E/F/X/D | E2E-02/05 | **PASS** |
| Behavior（OWN-009） | Full | Full | — | — | Full(ABC) | PASS | PASS | L/E/F/X/D | E2E-06 | **PASS** |
| Training（OWN-010） | Full | Full | — | — | Full | PASS | PASS | L/E/F/X/D | — | **PASS_WITH_LIMITATION**（首屏完整；Progress 依赖训练 session 数据） |
| Welfare（OWN-011） | Full | Compact | — | — | — | PASS | PASS | L/E/F/X/D | Stage-H-1 | **PASS** |
| Social（OWN-012） | Full | Compact | — | — | — | PASS | PASS | L/E/F/X/D | Stage-H-2 | **PASS** |
| Monitoring（OWN-013） | Full | Compact | Full | Device audit | — | PASS | PASS | L/E/P/F/X/EB/O | Stage-H-3 | **PASS**（设备数据真实时降级；无 provider 显 PROTOTYPE，不伪装在线） |
| Companion（OWN-014） | Prototype | Prototype | Prototype | — | — | PASS | PASS | L/E/F/X/FD/EB | Stage-H-5 | **PROTOTYPE**（feature flag；硬件 EXTERNAL_BLOCKED） |
| Agent（OWN-015） | Full | Full | Compact | — | — | PASS | PASS | L/E/F/X/EB/D | Stage-H-4 | **PASS**（AI 真实 provider EXTERNAL_BLOCKED 时降级「服务暂未开放」） |
| Notifications（OWN-016） | Full | Full | Full | — | — | PASS | PASS | L/E/F/X/O | — | **PASS** |
| Settings / Me（OWN-017） | Full | Full | Compact | — | — | PASS | PASS | L/F/X/D | E2E-10 | **PASS** |
| H5 Share（Vet Brief / Care Card） | Full | — | — | — | Share | PASS | PASS | L/F/X/撤销态 | E2E-09 | **PASS** |
| Admin IA（ADM-001..010） | — | — | — | Full | — | PASS | PASS | L/E/F/X/EB | — | **PASS_WITH_LIMITATION**（Devices/AI 页显示 EB 态，real provider 未接） |
| Pro IA（PRO-001..006） | — | — | — | — | Full | PASS | PASS | L/E/F/X | — | **PASS_WITH_LIMITATION**（Vet/Trainer/Service 角色由 grant 决定；demo 下默认 Vet 视图） |

## 2. 多端一致性摘要

- 同一能力跨端：同一信息层级（State/Attention/Action）、同一语义色与 Risk 标签、同一 zh-CN 文案（COPY_GUIDELINES）。
- Compact 端（Mini/Mobile）：降低信息密度，不删关键状态与安全信息。
- Prototype 端（Companion）：跨端一致 PROTOTYPE 标记 + 不伪装成功。
- 审计端（Admin）：只表达平台事实，不混 Owner 体验。
- Professional：专业术语显式（ABC / Vet Brief 分区），与 Owner 同源数据（同一 API/schema）。

## 3. 前端契约（§85/§18）

- 未自造 DTO：统一走 `packages/domain-schema` + `packages/api-client`；event payload 由后端 canonical schema 控制。
- 禁止文案扫描（apps/ 排除 node_modules）：**CLEAN**（无「AI 确诊」「宠物想你了」「98% 开心」「100% 安全」及 Companion 拟人表述）。

## 4. 结论

- 核心页面 19 组 × 6 端（含 Admin/Pro/H5）逐项验收完成；
- 全部核心页面无 `EXTERNAL_BLOCKED` 文案暴露（均映射人类语言「该服务暂未开放」）；无 raw error codes（Schema validation failed / 500 / payload invalid 均映射）；
- 通过：**STAGE_H_UX_ACCEPTANCE_MATRIX PASS**（4 项 PASS_WITH_LIMITATION 均因真实外部依赖尚缺，非 UI 缺陷）。

---

## 5. H.1 复查（2026-09-20）

- 128 项 PARTIAL_UI 逐项代码级审计完成（GOAL PHASE B）：`PARTIAL_UI = 0`。
- 终态分布：FULL_UI +47 / BACKGROUND_ONLY +30 / PRO_ONLY +13 / EXTERNAL_BLOCKED +10 / ACCEPTED_UI_LIMITATION 28。
- `prefers-reduced-motion` 已全局实现（globals.css + mini app.scss），ACCESSIBILITY LIMITATION 归零。
- 多端职责保持：Mini/Mobile 为 Compact 职责，Pro/Admin 为专业/运营职责（无需像素相同）。
- 结论：**STAGE_H_UX_ACCEPTANCE_MATRIX（H.1 复查）：PASS** —— 无无原因 PARTIAL。
