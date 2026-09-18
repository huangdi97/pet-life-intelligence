# PILOT_SUPPORT — 试点支持与事故规程

> 配套：SUPPORT_OPS.md（渠道/SLA 摘要）、STAGE_G_PILOT_READINESS.md（现状）、PILOT_OPERATIONS.md。
> 原则：任何真实用户不能暴露在「出问题没人处理」的状态；医疗问题不诊断，只引导。

## 1. 支持类型与入口

| 类型 | 入口 | 处理 |
|---|---|---|
| Login problem | 产品内反馈(bug) / 运营邮箱 | 检查账号状态 → 密码重置/会话 | 
| Data issue | 反馈(data) / 邮箱 | 定位 → 修正或登记删除 |
| Bug | 产品内反馈(bug) | 按 §4 分级 |
| Privacy request | 反馈(privacy) | 24h 内响应；导出/删除见 §6 |
| Health concern | 反馈(health_concern) | 见 §3 健康边界，不诊断 |
| Account deletion | 设置页「删除账号」/ 删除请求 | 人工确认后执行 |

> 注：反馈类别集合（10 类）已在本轮扩展并生效；「data」类别用 other 或 message 内注明。

## 2. 健康 Support 边界（重要）

用户问「我的狗是不是 XX 病？」：
- 不直接诊断、不改药、不自动停药。
- 引导三条路径：Health Flow（记录症状）→ Urgent Escalation（疑似急症：持续呕吐/倒地不起/严重出血/
  呼吸困难/中毒/误食异物 → 立即就医）→ Vet（真实医院联系）。
- 客服/支持人员不得以 PLI 名义给出医疗结论；只说「产品不诊断，请由兽医判断」。

## 3. Incident Management

事故记录字段（每起事故一行）：

```
incident_id / started_at / detected_at / resolved_at
impact / root_cause / fix / follow_up
```

**P0**（医疗安全、数据泄漏、账户越权、数据丢失、核心服务不可用）：立即处理，必要时暂停 Pilot；事后补记录。
**P1**（核心流程无法完成、严重数据错误、高频 crash）：24h 内评估并尽快修复。
**P2**（明显 UX 问题、有 workaround）：进 weekly triage。
**P3**（视觉/小优化）：进 backlog。

## 4. Safety Incident（必须单独记录的事件）

- Under-triage（红旗漏报）
- Wrong medication behavior（用药行为错误）
- AI diagnosis overclaim（AI 越权诊断宣称）
- Privacy leak（隐私泄漏）
- Wrong pet attribution（事件/媒体归属错误宠物）
- Cross-user access（跨用户访问）

任何一条出现即记 Safety Incident，进当周周报的 Safety 段，P0 级 24h 内通报。

## 5. Medical Safety Monitoring（每周）

Red Flags 数 / Triage 分布 / Under-triage Reports / Over-triage Reports / Owner Override /
Professional Corrections / Medication Duplicate Prevention。全部来自规则引擎审计 + 反馈，不靠印象。

## 6. Export / Delete / Consent Revoke（用户权利实测流程）

| 操作 | 系统能力 | 人工步骤 |
|---|---|---|
| Export | `GET /api/v1/pets/{id}/export`、`/pets/{id}/finance/export.csv` | 运营提供导出文件给用户（邮件未启用则线下交付） |
| Delete | `POST /pets/{id}/deletion-requests` 登记 + `POST /auth/delete-account` | 人工确认 → 备份 → 离线执行删除 → 回执 |
| Revoke Consent | 设置页「数据同意」可撤回（SERVICE_ESSENTIAL 除外） | 记录撤回时间与范围；数据保留按 consent 条款最小化 |
| 机构退出 | 台账状态 COMPLETED/WITHDRAWN | 撤销访问（is_active=false / revoke Grant）→ 导出/删除机构数据 |

原则：**不静默删除**；删除高风险动作需显式人工确认；Pilot Consent ≠ Research Consent，
Pilot 数据默认不用于训练/研究/公开案例/营销。

## 7. 每日 / 每周检查

- 每日：`/metrics` 摘要（pets / life_events_24h / ai_calls_24h / login_failures_24h /
  security_events_24h / audit_entries_24h / open_incidents）。
- 每周：反馈分类汇总 → 周报；Bug SLA 检查；Safety 事件复核；成本快照。
- 每次发布：staging smoke + 备份演练（已有脚本：remote_staging_smoke.py / pli_backup_drill.sh）。

## 8. 禁言/红线

- 不发布「真实账号无联系渠道」的产品状态。
- 不把未发现红旗写成「没有疾病」。
- 不把图片/记录结果写成确定诊断。
- 支持人员不冒充兽医。
