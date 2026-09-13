# G05 — Browser E2E (Playwright) Report

- Date: 2026-09-13
- Verdict: **PASS — 7/7 browser main paths green**
- Runner: Playwright 1.63.0, Chromium (Desktop Chrome), locale zh-CN
- Target: Web `http://localhost:3100`（生产构建 next start）+ API `http://localhost:8800`
- Config: `tests/e2e-browser/playwright.config.ts`（workers=1, trace retain-on-failure,
  screenshot only-on-failure, artifacts in `tests/e2e-browser/artifacts/`）

## Results (real run)

```text
npx playwright test --config tests/e2e-browser/playwright.config.ts
  ok 1 E2E-01 创建宠物 → Quick Log → Timeline（刷新后仍存在，后端真实落库）
  ok 2 E2E-02 家庭协作 / 权限（成员可完成，Owner-only 被拒，API 403）
  ok 3 E2E-03 红旗 → EMERGENCY → Vet Brief（前端不降级、刷新一致、无伪诊断）
  ok 4 E2E-04 Medication → 给药 → Outcome → Timeline（重复提交无重复数据）
  ok 5 E2E-05 Care Handoff / Care Card（最小字段、结束后权限收回）
  ok 6 E2E-06 Behavior ABC（中文+emoji 输入，Timeline 可见，页面不崩）
  ok 7 E2E-07 IDOR / URL 篡改（跨 owner 访问必须 403/404 且不泄露）
  7 passed (15.3s)
```

- 总数 7；PASS 7 / FAIL 0；运行时间 15.3s
- 失败截图/trace 目录：`tests/e2e-browser/artifacts/test-results/`（本轮无失败）
- 数据确定性：`python -m app.seed` 重置 + 测试内时间戳唯一命名；无 sleep，全部 locator/expect 自动等待；UTF-8 中文与 emoji 全程覆盖

## 每条路径要点（GOAL §5 对应）

| 路径 | 验证点 |
|---|---|
| E2E-01 | UI 登录 → UI 建宠 → QuickLog → Timeline 含 provenance/actor → 刷新仍存在 → API 断言 OWNER_REPORTED 落库 |
| E2E-02 | Owner UI 建任务 → Family 浏览器会话完成 → completed_by=Family（API 断言）→ Family 访问审计 UI 显示"没有查看此内容的权限"且 API 403 |
| E2E-03 | 红旗主诉 → 详情页 EMERGENCY 徽章 + 紧急提示 → 生成 Vet Brief → 免责声明可见 → 无"确定是/诊断为" → 刷新后仍 EMERGENCY |
| E2E-04 | UI 建用药计划 → UI 给药 → API 重复给药 409 MEDICATION_CONFLICT（无重复数据）→ UI 记录 Outcome → Timeline 关联 |
| E2E-05 | UI 建交接 → 匿名读 Care Card（有 emergency_contacts、无 triage_history/observations）→ 未授权宠 403/404 → 结束交接 → 权限收回 |
| E2E-06 | 中文+emoji ABC 输入 → 列表与 Timeline（behavior.observed 过滤）可见 → 无 fatal 状态 |
| E2E-07 | 无成员身份用户 URL/API 篡改 3 类资源（pet/events/health-events）+ 假 UUID：全部 403/404，响应不含宠物名/事件字段；UI 路径同样不泄露 |

## 浏览器 E2E 发现并修复的真实缺陷

1. **CORS 未包含 3100 端口（真实产品缺陷）**：`config.cors_origins` 只列了
   3000/127.0.0.1:3000 —— Web 前端在 3100 上从未能在真实浏览器调通 API
   （此前所有验证都走 curl 绕过了 CORS）。已修复（config + .env.example）。
2. 前端从未在生产构建下被浏览器真实走过主路径；本轮补齐。

## 结论

GOAL §19 的 critical Gate "Browser main-path E2E" 真实 PASS。
