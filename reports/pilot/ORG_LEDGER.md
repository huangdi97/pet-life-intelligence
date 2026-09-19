# ORG_LEDGER — Wave 0 机构台账（配置模板）

> 规则：真实机构信息确认后才落 pilot_orgs 表（POST /api/v1/pilot/orgs，dev/staging 管理员）；
> 在此之前只用本模板占位（status=LEAD），**不伪造机构**。
> 状态机：LEAD → ONBOARDING → ACTIVE → PAUSED → COMPLETED；异常 WITHDRAWN / TERMINATED_*（保留记录，无硬删除）。

## W0 占位（待真实信息）

| pilot_org_id | name | type | contact | status | started_at | expected_end_at | participant_limit | consent_version | notes |
|---|---|---|---|---|---|---|---|---|---|
| W0-OWNER-01 | （待真实宠主确认） | OWNER_COHORT | 待定 | LEAD | — | — | 1–2 | PILOT_CONSENT v1（LEGAL_REVIEW_PENDING） | Wave 0 宠主 cohort 模板；多宠/多人家庭优先 |
| W0-PROFESSIONAL-01 | （待真实机构确认） | VET/TRAINER/STORE/CARE_SERVICE | 待定 | LEAD | — | — | 1 | PILOT_CONSENT v1（LEGAL_REVIEW_PENDING） | Wave 0 专业机构模板；合作意愿较强者优先 |

## 每机构 onboarding 必答（入 pilot_orgs 前填好，见 docs/pilot/PILOT_ONBOARDING.md §3）

1. 本次 Pilot 想验证什么？
2. 谁是负责人？
3. 预计宠物数量？
4. 预计持续多久？
5. 什么叫成功？
6. 哪些数据允许进入？
7. 哪些数据不得进入？

## 落库命令（有真实信息后）

```powershell
# 以管理员登录后：
POST /api/v1/pilot/orgs
  {"name":"<真实名>","org_type":"<VET|TRAINER|STORE|CARE_SERVICE|OWNER_COHORT|OTHER>",
   "contact":"<负责人>","notes":"<onboarding 答案>","participant_limit":N}
# 状态流转：
PATCH /api/v1/pilot/orgs/{id}/status  {"status":"ONBOARDING"|"ACTIVE"|...}
```
