# G08 — Security & Authorization (Stage D Phase 3)

- Date: 2026-09-13
- Verdict: **PASS**（GA-critical：不允许 PASS_WITH_ACCEPTED_LIMITATIONS）
- Test suite: `tests/ga/test_security.py`（+ 既有 v0.1/v0.2 权限负例 32 项）

## 检查范围与结果

### 6.1 IDOR（resource → pet → membership → policy）

- 33 个探针矩阵：outsider（无任何 membership/grant）对 pet/timeline/health/
  medication/behavior/care/tasks/notifications/search/export/memory/baseline/
  diary/reminders/identifiers/health-records/expenses/milestones/training/
  friends/device-events/data-quality 全部 GET + 关键 POST/DELETE →
  一律 401/403/404，无 2xx。
- 404 路径不泄露存在性（响应不含宠物名）；403 响应体不含任何业务字段。
- 测试：`TestIDOR::test_idor_matrix`、`test_fake_uuid_stays_404_without_leak`、
  `test_response_of_forbidden_has_no_pet_data`。

### 6.2 Mass assignment

- pet 创建注入 role/is_admin/household_id/owner_id/lifecycle_status/
  field_privacy → 服务端 schema 全部丢弃；宠物落在创建者 household。
- 事件 payload 注入 triage/diagnosis/emergency_override → 422（strict payload）。
- health-events 注入 triage_override/final_diagnosis/treatment_order →
  **本阶段修复**：HealthEventCreate 加 `extra="forbid"`，422 extra_forbidden。
- 测试：`TestMassAssignment::*`。

### 6.3 Authentication

- malformed dev header / unknown user / missing auth / inactive user /
  garbage bearer → 全部 401。测试：`TestAuthNegatives::*`。

### 6.4 Authorization

- owner / family / caregiver / revoked(expired grant) / non-member 矩阵在
  v0.1/v0.2 集成测试 + E2E-02/05/07（浏览器层）覆盖：read/write/delete/
  share/transfer/medical/privacy 全部经 `app/services/permissions.py` 单点解析。

### 6.5 Injection / malformed input

- `<script>`、SQL 注入串、JSON 注入、emoji×200、CJK×500、5000 字符、NUL/控制
  字符、None、无效枚举、±超大数字、重复请求 → 无 500、无 SQL 注入、存储按原文
  或 422 拒绝。
- **本阶段修复的真实缺陷**：NUL 字节曾导致 500（PG JSONB 拒绝 \u0000）→
  `eventlog._reject_unsafe_strings` 统一 422（含深度限制 12）。
- 测试：`TestMalformedInput::*`。

### 6.6 High-risk agent actions

- BOOKING/PURCHASE/MEDICAL → REFUSED + executed=False；transfer/merge/deletion
  保持 PENDING，无任何自动执行。测试：`TestHighRiskAgent::*`（+ v10 既有）。

## 修复记录

| 问题 | 严重度 | 修复 |
|---|---|---|
| NUL/控制字符 → 500 | 高 | 422 统一拒绝（eventlog） |
| HealthEventCreate 未禁 extra 字段 | 中 | extra=forbid（决策字段不可注入） |
| CORS 缺 3100（浏览器 E2E 发现） | 中 | origins 配置补齐 |

## 最终结果

`pytest tests/ga -q` → 全绿（见 TEST_REPORT Stage D 汇总 235 passed）。
