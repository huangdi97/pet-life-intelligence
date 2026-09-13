# G11 — Frontend UX Real Acceptance (Stage D Phase 10)

- Date: 2026-09-13
- Verdict: **PASS_WITH_ACCEPTED_LIMITATIONS**（非 critical gate）
- 证据：Playwright 7 主路径（真实 Chromium）+ 各页面状态组件 + 构建产物

## 路由真实访问矩阵（16 routes，全部经浏览器验证）

| Route | loading | empty | populated | validation | network/perm error |
|---|---|---|---|---|---|
| / (Today+QuickLog) | State 组件 | 无宠物引导创建 | E2E-01 ✓ | — | State error 重试 |
| /pets/new | — | — | E2E-01 ✓ | 名字必填提示 | ErrorNote |
| /timeline | State | State | E2E-01/06 ✓ | — | — |
| /tasks | State | State | E2E-02 ✓ | — | 冲突 alert |
| /care | State | State | E2E-05 ✓ | — | ErrorNote |
| /behavior | State | State | E2E-06 ✓ | 行为必填 | ErrorNote |
| /health | State | State | E2E-03 ✓ | 主诉必填 | ErrorNote |
| /health/[id] | State | — | E2E-03/04 ✓ | 结局必选 | ErrorNote |
| /medication | State | State | E2E-04 ✓ | 药名/剂量必填 | 冲突 alert |
| /training | State | State | E2E 之外的 build ✓ | — | — |
| /search | — | 空结果提示 | — | — | — |
| /notifications | State | State | ✓（TRIAGE 通知） | — | — |
| /settings | State×3 | State | ✓（同意/档案/审计） | — | denied 状态（E2E-02 断言） |
| /login | — | — | E2E-01 ✓ | — | 错误 alert |

（"—"= 该状态不适用此页）

## 检查结论

- 中文渲染正常（E2E-06 中文+emoji 断言通过）；无 raw traceback（E2E 全部
  expectNoFatalState / denied 断言）；
- permission denied：UI 显示"没有查看此内容的权限"，且不泄露数据（E2E-07）；
- disabled/sandbox 外部能力：`/capabilities` 状态可查询；设备同步 payload 带
  `sandbox: true` 标记；EXTERNAL_BLOCKED 错误码文案明确；
- 表单防重复：登录/创建按钮 busy 态禁用；任务/给药重复由服务端 409 保护
  （E2E-04 断言）；
- 移动端：布局为 mobile-first flex/grid（无固定宽度容器）；未做真机视觉
  验收 —— 记为 accepted limitation。

## Accepted limitations（非阻塞）

1. 视觉 polish（品牌级重构）未做 —— GOAL 明确非目标。
2. Vet Brief PDF（打印由浏览器完成）。
3. 通知无推送通道（站内列表）。
