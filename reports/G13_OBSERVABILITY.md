# G13 — Observability (Stage D Phase 8)

- Date: 2026-09-13
- Verdict: **PASS**
- Suite: `tests/ga/test_registry_observability.py`

## 11.1 Request ID

- 接受 `X-Request-ID` 或生成 UUID；response header 回显；错误 envelope 的
  `error.request_id` 与 header 一致（测试断言）。

## 11.2 Structured logging

- `pli.access` logger 每请求一条结构化记录：
  `request_id / method / path / status / duration_ms`（extra 字段）。
- 测试断言：日志存在、含 request_id、**不含请求 body**（敏感文本规则）。
- 禁记：token/password/完整病历正文 —— 中间件不接触 body。

## 11.3 Error taxonomy

统一 envelope（`error.code/message/request_id`），现存码：
`UNAUTHENTICATED / PERMISSION_DENIED / NOT_FOUND / VALIDATION_ERROR /
CONFLICT(TASK_CONFLICT, MEDICATION_CONFLICT, DUPLICATE_EVENT) /
EXTERNAL_BLOCKED（本阶段新增）/ RATE_LIMITED / INTERNAL / HTTP_ERROR`。
测试断言代表性路径的 code 精确匹配。

## 11.4 Worker logs

- worker 每轮在有动作时输出 `[worker] <iso> {grants_expired, handoffs_ended,
  doses_missed}`（成功计数）；异常输出 `[worker] error: <type>: <msg>`；
  静默轮次不打印（降噪）。job 级区分：函数即作业（expire_grants /
  end_handoffs / mark_missed_doses），幂等键保证可安全重试。

## 11.5 Health / Readiness

- `/api/v1/health`：进程存活；
- `/api/v1/ready`：postgres + redis 逐项 ok/degraded（503）；
- `/api/v1/ready/engine-info`：规则引擎版本；
- `/api/v1/ops/status`：业务计数 + 引擎版本（PLI-228）。
