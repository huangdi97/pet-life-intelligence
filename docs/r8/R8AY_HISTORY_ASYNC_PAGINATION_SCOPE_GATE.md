# PLI R8AY · 历史分页异步 Scope 隔离

## 缺陷与风险

R8AX Web 历史页首屏 API 已对卸载/筛选切换做 `alive` 保护，但“继续查看更早的档案”不检查旧请求属于哪只宠物、哪个筛选条件或哪次重试。移动网络、瞬时断网恢复时，旧 `cursor` 的响应可能在新筛选/宠物页面初始化后到达，污染列表与分页状态；尤其不能把宠物 A 的档案追加到宠物 B 的页面。

## 本轮最小修复

- `scopeEpoch` 在 pet ID、metric、query、validity、reloadToken 的每次 effect 初始化及清理时推进。
- 首屏与分页回调均验证当次 epoch；旧分页结果不能写入 `rows` / `cursor` / `hasMore` / `error` / `loading`。
- `moreInFlight` 避免未重新渲染前的重复点击造成同一 cursor 并发请求；切换 scope 时重置。
- 保持服务端 keyset 筛选/权限契约、无离线假缓存、不修改后端 Case/Review、五个一级导航入口及历史事实。

## 执行证据与明确限制

新增 `r8-offline-recovery.spec.ts` 中的 R8AY 延迟分页测试：通过真实 API 创建宠物与 Case；仅在浏览器网络边界人为延迟并模拟分页，让旧“全部”分页请求滞留，然后将有效性筛选改为“已失效”，确认新结果为空，最后释放旧响应，核验不会重新出现原 Case、旧分页按钮或伪造的总数。此项是**可控网络竞态测试**，不冒充真实 Android 或人工视觉验收。

只有提交后的同 SHA CI/Playwright 成功才可标记 PASS。当前 `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`；PR #2 保持 OPEN，不发布 Release、不合并 main。

## Mini parity · asynchronous generation guard

`apps/mini/src/pages/observations/index.tsx` also lacked stale-request invalidation on initial/page-2 results. It now advances a pet/metric/validity epoch when rebuilding history, invalidates it on cleanup/unmount, discards all older `then/catch/finally` state writes, and blocks concurrent duplicate cursor clicks. This is Mini Taro React code; automated Mini typecheck/build and source-contract gates can validate compilation, but **real WeChat DevTools / physical-device runtime remains NOT_YET_OBSERVED**. Browser network-race Playwright remains the executable Web test, not a substitute for Mini runtime.
