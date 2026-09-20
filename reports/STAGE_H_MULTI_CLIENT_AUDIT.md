# STAGE_H_MULTI_CLIENT_AUDIT — 多端审计与数据治理确认

> 日期：2026-09-20 · 阶段：Stage H · 范围：§73（Multi-client Consistency）+ §111（Pilot 数据治理保护）+ §112（PILOT_MODE）+ §113（不伪造真实指标）
> 依据：docs/ui/MULTI_CLIENT_EXPERIENCE_MATRIX.md + /pilot/status 实测 + git diff 审计

## 1. 多端体验一致性（§73）

| Experience | Web | Mini | Mobile | Admin | Professional | 一致性表现 |
|---|---|---|---|---|---|---|
| Today | Full | Full | Full | — | — | 同一信息层级（State/Attention/Action）；Quick Log 三端同语义 |
| Timeline | Full | Full | Full | View | View | TimelineItem 视觉统一；AI/真实记录区分徽章同规则 |
| Quick Log | Full | Full | Full | — | — | tap→min input→save；Sheet 三端同类 |
| Health | Full | Full | Full | Audit | Full | 风险语义色/标签同源（tokens risk_status） |
| Medication | Full | Full | — | — | Full | Plan/Scheduled/Given/Skipped/Missed 状态同集合 |
| Vet Brief | Full | Full | Full | — | Full | 分区（Chief Complaint/Onset/Trend/Evidence/Medication/History/Risk/Provenance）三端一致 |
| Care / Handoff | Full | Full | — | — | Full | 临时权限 expires_at 可见跨端 |
| Behavior | Full | Full | — | — | Full(ABC) | 用户端中文三问引导；Pro 端显式 ABC |
| Training | Full | Full | — | — | Full | Goal/Plan/Session/Progress/Outcome |
| Welfare | Full | Compact | — | — | — | Mini 降低信息密度，不删 Evidence/Trend/Uncertainty |
| Social | Full | Compact | — | — | — | 关系图谱 + 互动历史 + 安全 + 反馈；非 Feed |
| Monitoring | Full | Compact | Full | Device audit | — | 设备五档状态 + 候选事件 Review 流程跨端 |
| Companion | Prototype | Prototype | Prototype | — | — | 跨端一致 PROTOTYPE 标记 + 不伪装成功 |
| Agent | Full | Full | Compact | — | — | Ask/Brief/Find/Plan/Explain；AI Answer 结构同源 |
| Notifications | Full | Full | Full | — | — | 分类 + 打包 + 优先级 |
| Settings / Me | Full | Full | Compact | — | — | Household/Notifications/Privacy/Data/Settings |

- **契约保护**：前端未自造 DTO，统一走 `packages/domain-schema` + `packages/api-client`；Mini/Mobile/Pro 复用同一 API 契约（跨端同源数据）。
- **Mini 密度**：Bottom Tab 5 + Sheet + Fast Input；无大表格/复杂侧栏/多层 Modal（§68）。
- **Mobile 优先屏**：Today/QuickLog/Monitoring/Companion/Notifications/Camera/Health/Timeline 全部有屏（§69）。

## 2. Pilot 数据治理保护（§111）——实测确认

```
/pilot/status (2026-09-20 本地实测):
{"pilot_mode":false,"pets_total":0,"active_pets_3d":0,"active_pets_7d":0,
 "feedback_count":0,"invited":0,"registered":0,"activated_owners":0,
 "north_star":"Active Pets with Continuous Evidence Chain",
 "excludes":["demo","internal","synthetic_domain"]}
```

- `is_demo` / `is_internal` 列与 pilot_org 机制保持（Stage G-W0 迁移 c4d8e2a71b93 未回退）；
- 合成域过滤（OR→AND 修复 8bcc0bf）保持：demo/internal/test 数据被 `/pilot/status` 排除；
- Stage H 的 mock / prototype / 截图 / E2E 数据（`@pli.demo` 域、dev seed）**未污染** `/pilot/status`（pets_total=0 证明）；
- `.env.local` 为 Stage H 本地 E2E 临时覆盖，**Stage H 结束恢复**（见下）。

## 3. PILOT_MODE 与真实指标诚实性（§112/§113）

- `PILOT_MODE=false`（实测）：Stage H 不以招募用户为目标；未创建任何真实 Participant；
- REAL PARTICIPANTS = 0 / REAL PETS = 0 / ACTIVATED OWNERS = 0（`/pilot/status` 实测）—— 未伪造任何指标；
- Retention / Outcome 未虚构；所有 Stage H 验证数据均为 demo/internal/test 域。

## 4. 环境恢复

- Stage H 使用 `.env.local`（本仓库内 dev）覆盖 DATABASE_URL→55679 等仅用于本地 E2E；
- **Stage H 结束后**：删除/忽略 `.env.local`（不入库，.gitignore 已覆盖；本地 DB 数据为 dev seed，不含真实参与者）；
- staging 未部署、未触碰（契约「不部署公网 staging」保持）。

## 5. 结论

- 多端体验矩阵（Web/Mini/Mobile/Admin/Pro/H5）逐项确认一致；
- Pilot 数据治理（is_demo/is_internal/synthetic filtering/pilot_org）+ 真实指标诚实性（全 0）**无回归**；
- **STAGE_H_MULTI_CLIENT_AUDIT：PASS**。