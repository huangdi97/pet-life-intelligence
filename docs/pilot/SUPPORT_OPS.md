# SUPPORT_OPS — 试点支持与运营

## 支持渠道

| 渠道 | 值 | 状态 |
|---|---|---|
| 产品内反馈 | `/pilot/feedback`（bug/confusing/feature/health/other） | 已实现 |
| 支持邮箱 | pilot@pli.example.com | 模板占位（域名未上线） |
| 事故联系 | oncall@pli.example.com | 模板占位 |

> 邮箱为占位符：真实域名/邮箱 EXTERNAL_BLOCKED，上线前需确认。

## 支持 SLA（试点阶段）

- 工作日 24h 内响应反馈。
- 医疗安全/隐私相关反馈：1h 内升级处理。
- 事故（P0：全站/数据/安全）：见 docs/INCIDENT_RUNBOOK.md。

## 运营检查

- 每日：/metrics 摘要（pets、events、AI 调用、登录失败、安全事件、未关事件）。
- 每周：pilot 反馈分类汇总，驱动下一迭代（不凭空扩功能）。
- 每次发布：staging smoke + 备份演练。

## 禁止

- 不让任何真实用户暴露在一个"出问题没人处理"的状态。
- 不发布真实账号无联系方式的产品。