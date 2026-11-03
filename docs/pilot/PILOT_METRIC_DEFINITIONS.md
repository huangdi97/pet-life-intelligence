# PILOT_METRIC_DEFINITIONS — Stage G 指标字典

> 全部指标默认 `exclude_demo=true / exclude_internal=true / exclude_synthetic=true`。
> 无真实数据时一律写 `NOT_YET_OBSERVED`。口径以此文件为准，周报引用本文件编号（M-xx）。

## 0. 数据基础口径

- **有效事实 Event（R8_PILOT_V2）**：仅统计 `daily.*` 生活事实，且 `is_duplicate=false`；来源必须属于 OWNER/CAREGIVER/DEVICE/PROFESSIONAL/LAB 的 record-fact 来源。建宠/页面浏览/审计/系统聚合等生命周期或 telemetry 事件都不计。用于“当前活跃”时还必须是当前有效版本：已撤回或已被 successor 替代的旧版本不计。
- **Active Pet（连续性）**：以「产生新的当前有效事实 Event」计，而不是打开页面、系统聚合或旧版本数量。
- **Owner Activation** 使用双时间截止：按 `min(当前时间, Pet.created_at + 24h)` 判断当时可知的有效事实；24h 截止后结果冻结，后来的修正/撤回不会倒写 onboarding 历史。
- 时间窗口：运营聚合仍以 UTC 计算；Pet Life Replay / 当天事实仍使用宠物本地日历边界，两者不要混为同一语义。

## 1. 用户与宠物（M-01）

| 指标 | 定义 |
|---|---|
| Invited Users | 已发放邀请码数（含未注册） |
| Registered Users | 注册且绑定 invite 的真实用户 |
| Activated Owners | **去重后的 Owner 人数**；至少一只真实 Pet 在建档后 24h 知识截止内达到 ≥3 条有效事实 Event。多宠不得把同一 Owner 重复计数。 |
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


## 17. R8 Individual Life Intelligence Loop（M-17）

R8 后 Pilot 不能只看“记录了多少事件”，还要验证可信闭环是否真的发生。第一阶段只统计数据库中已经存在的 append-only journal facts，不制造不存在的“注意力/页面打开”埋点。

| 指标 | 口径 |
|---|---|
| Cases Created | 真实 Pet 的 `LifeChangeCase` 数 |
| Cases Reviewed | 至少有一条 Owner Review 的 distinct Case 数 |
| Cases with Follow-up Observation | 至少有一条 `RECORD_OBSERVATION` Review 的 distinct Case 数 |
| Cases with Outcome | 至少有一条 append-only Outcome 的 distinct Case 数 |
| Source Corrections | 真实 Pet 中 `supersedes_event_id != null` 的 correction journal rows |
| Source Retractions | 真实 Pet 中 `retracted_at != null` 的 source rows |

**禁止伪造的指标**：Case 卡片曝光、Owner“看见了”某条解释、Knowledge Delta 阅读率、证据点击率。除非产品已有明确、隐私合规且可审计的 telemetry，否则一律标记为 **NOT_INSTRUMENTED**，不能用页面渲染或 API GET 次数替代。

M-17 的目标不是把数字做大，而是回答：PLI 是否真的让主人完成了“有来源变化 → 主人判断 → 后续真实观察 → 结果/纠错”的可信闭环。
