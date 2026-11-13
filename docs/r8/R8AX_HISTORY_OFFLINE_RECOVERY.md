# PLI R8AX · 历史档案离线恢复（Web）

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN。

## 起步问题

历史档案页在请求失败时只显示错误态，**没有就地重试入口**；一次瞬时断网/5xx
后主人必须整页刷新，且无法确认“空列表”不是离线造成的。

## 实现

- `apps/web/app/pets/[id]/history/page.tsx` 新增 `reloadToken`；
- 错误态显示“重新读取档案”（`pli.r8.web-history.retry`），点击后按当前
  指标/有效性/搜索条件重新 keyset 读取；
- 失败时继续显示错误，**不保留/伪造旧行**；恢复后按服务端结果重新渲染；
- 不改变筛选、分页或权限语义。

## 测试

- 新增 `tests/e2e-browser/specs/r8-offline-recovery.spec.ts`：
  1. 创建真实宠物与 Case；
  2. 浏览器拦截 `/life-change-cases` 并 `abort("failed")`；
  3. 断言出现重试按钮、且**没有任何 Case 行**；
  4. 解除拦截并点击重试，断言真实 Case 行出现。
- `tests/blind_ui/test_r8at_validity_filter.py` 新增第 5 项：重试入口、
  reload 依赖、离线期间不伪造行。
- 本地所有 R8 浏览器回归（补录/修正/筛选/离线）**4 passed**。

## 诚实边界

- 仅 Web；Android/Mini 的错误态重试仍由各自页面现有行为承担（未伪造证据）。
- 该测试模拟瞬时读取失败，不等同于真实移动网络弱网/长离线；
- 未引入离线缓存或后台队列，避免把旧数据当作实时事实。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
