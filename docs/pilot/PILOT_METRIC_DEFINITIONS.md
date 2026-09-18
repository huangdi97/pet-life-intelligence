# PILOT_METRIC_DEFINITIONS — Stage G 指标字典

> 全部指标默认 `exclude_demo=true / exclude_internal=true / exclude_synthetic=true`。
> 无真实数据时一律写 `NOT_YET_OBSERVED`。口径以此文件为准，周报引用本文件编号（M-xx）。

## 0. 数据基础口径

- 有效 Event：LifeEvent 满足 pet_id + actor_id + occurred_at + source_type 非空，且 `is_duplicate=false`。
- Active Pet（连续性）：以「产生新有效 Event」计，而非「打开页面」。
- 时间窗口：UTC；日 = 自然日（UTC 0 点切分）。

## 1. 用户与宠物（M-01）

| 指标 | 定义 |
|---|---|
| Invited Users | 已发放邀请码数（含未注册） |
| Registered Users | 注册且绑定 invite 的真实用户 |
| Activated Owners | 见 PILOT_ONBOARDING.md §4（Pet + 24h ≥3 Events） |
| Activated Professionals | 见 PILOT_ONBOARDING.md §4（真实查看/协作一次） |
| Active Pets | 30d 内 ≥N active days（N 见 M-04 北极星，校准后定） |
| Multi-member households | ≥2 成员的家庭数 |

## 2. 连续性（M-02）

- Pets with 3/7/14/30-day evidence：rolling 窗口内有 ≥1 个 active day 的 pet 数。
- D1/D3/D7/D14/D30 按 Pet 统计「该 pet 是否产生新有效 Event」（Retention 口径）。

## 3. 频率（M-03）

- Events / Active Pet / Day
- Active Days / Pet
- Quick Logs / Pet
- Timeline Views / Pet
- Time to First Log / Time to Complete Log / Log Abandon Rate
- Event Category Distribution（什么事件最常/几乎没人记录）
- Repeated Correction Rate（同一事件反复修正）

## 4. 北极星（M-04）

**Active Pets with Continuous Evidence Chain**

定义：rolling 30d 内 ≥ N 个 active days；每 Event 带 pet/actor/time/source；覆盖 ≥2 个核心 domain
（daily / care / health / behavior / training 至少 2 类）。
- N 初始建议 5，Pilot 后用真实分布校准；不得为美化结果调低。

## 5. Care / Household（M-05）

- Multi-member Rate = 多成员家庭 / 家庭总数
- Tasks Created / Completed，Task Completion Rate
- Care Handoffs 次数
- Duplicate-prevention events（重复喂食/用药被阻断）
- Professional views（专业用户查看资料次数）

## 6. Health（M-06）

- Health Events Created
- Vet Briefs Generated / Opened（Open Rate）
- Professional Follow-up（专业跟进数）
- Outcome Recorded / Health Closure Rate（Outcome Closure，见 M-08）
- Intake Completion Rate / Evidence Completeness
- 安全：Red Flags、Triage Distribution、Under/Over-triage Reports、Owner Override、Professional Corrections、Medication Duplicate Prevention

## 7. Behavior / Training（M-07）

- Behavior Events
- Training Sessions
- Behavior/Training Follow-ups 与 Outcomes
- ABC 事件结构完整率（Antecedent/Behavior/Consequence 是否可理解）
- 视频上传率

## 8. Outcome Closure（M-08）

- Health：HealthEvent → Vet → Treatment → Recovery Outcome 的闭环完成率。
- Behavior：Behavior Event → Plan → Follow-up → Outcome。
- Service：Service → Care → Incident/Completion → Outcome。
- 总口径：`Outcome Closure Rate = 已记录 Outcome 的健康/行为/服务事件 / 应闭环事件数`。
- 目的：避免「记录很多数据但不知道结果」。

## 9. AI（M-09，真实 key 启用后）

calls / success / fallback / schema_fail / latency / tokens / cost；用户反馈 helpful / not_helpful / wrong / unsafe。
成本口径：AI cost / active pet、/ AI-enabled event、/ Health Event。

## 10. Cohort 与机构类型（M-10）

Cohort：Owner Only / Multi-person Family / Vet-connected / Trainer-connected / Service-connected，
分别看 Activation / Retention / Event Frequency / Outcome Closure。
机构类型：Vet / Trainer / Store / Care Service 横向比较 → 决定下一阶段销售重点。

## 11. Search / Agent（M-11）

查询类型分布（health_history / daily / medication / behavior / training / care / other）；
答案是否引用真实 Event；用户是否点击证据；是否需要重复提问。

## 12. Activation Funnel（M-12）

```
Invite → Register → Pet Created → First Event → 3 Events → Day 2 → Day 3 → Day 7 → Day 14
```
每个 drop-off 必须分析（模板：reports/pilot/ACTIVATION_FUNNEL.md）。

## 13. 使用热力（M-13）

模块：Today / Quick Log / Timeline / Tasks / Care / Behavior / Training / Health / Vet Brief / Medication / Search / Agent
分级：Never Used / Rare / Occasional / Frequent。
多周 + 目标用户足够 + 几乎无人使用 → REMOVE/REDESIGN CANDIDATE。

## 14. 质量（M-14）

missing actor / missing source / duplicate event / unknown source / failed artifact / incomplete outcome。
真实数据一定比测试数据脏，不忽略。

## 15. 性能与稳定性（M-15）

API p95 / Web load / AI latency / upload latency；availability / 5xx / major incidents（Error Budget 简化版）。

## 16. 成本（M-16）

Server / DB / Storage / Bandwidth / AI / Email / Monitoring；cost / active pet / month。
