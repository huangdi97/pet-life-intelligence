# INCIDENT_RUNBOOK — 事故响应

## 原则

- 先止血（disable flag / 回滚 / 隔离），再诊断，最后复盘。
- 医疗安全 / 隐私事故优先级最高，先通知相关方并记录。
- 每个事故记录：时间线、影响、根因、修复、复盘改进。

## 场景速查

| 场景 | 止血 | 定位 | 恢复 |
|---|---|---|---|
| API down | 重启容器 / 回滚镜像 | 查日志（JSON）、/health、负载 | 起 api → smoke |
| DB 不可用 | 停写流量（临时只读/降级） | /ready/db、pg 日志 | 起 DB → 恢复 → 校验 |
| Redis 不可用 | 降级（当前 worker 用 PG 持久化） | /ready | 起 Redis → 双跑幂等验证 |
| AI provider 不可用 | 已有 fallback（MockProvider） | ai_inference_logs + gateway 日志 | 恢复真实 provider 或维持 fallback |
| 存储不可用 | 上传降级为本地暂存（storage 回退） | storage 日志 | 恢复 S3 → 补传 |
| 医疗安全事故 | 立即冻结该用户相关写入 + 标记事件 | 规则引擎版本 / 触发记录 | 规则版本回滚 + 升级引擎 |
| 隐私事故（泄露） | 撤销分享 token / 断开访问 + 通知 owner | audit + 访问日志 | 修复漏洞 + 安全回归 |
| 坏部署 | 回滚镜像到上一 tag | 对比变更 | 重新部署 + smoke |

## 升级路径

- P0（医疗安全/隐私/全站宕机）→ 立即响应，15 分钟内止血。
- P1（API 高错误率/慢）→ 30 分钟内。
- P2（部分功能异常）→ 工作时间内。

## 事后复盘模板

- 时间线：发现→止血→恢复→根治。
- 根因：五问。
- 影响：用户数 / 数据 / 审计。
- 改进：自动化测试 / 告警 / 文档更新，关联 PLI-xxx。

## 告警指标（见 G13/Observability 与 PRODUCTION 章节）

- API 5xx、p95、DB 连接、worker 队列、AI 失败与成本、上传失败、webhook 重试、红旗事件、授权失败。