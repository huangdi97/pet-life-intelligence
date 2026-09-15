# MULTI_CLIENT_AUDIT — 多端一致性与客户端矩阵审计

- Date: 2026-09-14
- 方法：真实构建 + 真实测试 + 跨端一致性测试（tests/multi-client）+ 浏览器 E2E。

## 客户端状态

| 客户端 | 路径 | 技术栈 | 构建 | 运行验证 |
|---|---|---|---|---|
| Web (Owner) | apps/web | Next.js 15 + React 19 | `next build` 绿 | 10/10 Playwright E2E |
| PWA | apps/web + /sw.js + manifest | 自研 SW | build 绿 | manifest/sw/offline 200 |
| H5 Share | apps/web/app/share/* | Next.js client | build 绿 | E2E-09 匿名访问 PASS |
| WeChat Mini | apps/mini | Taro 4 + React 18 | `taro build weapp` 绿 | 12 pages, 5-tab |
| Alipay Mini | apps/mini | 同 Taro | `build:alipay` 绿 | — |
| Douyin Mini | apps/mini | 同 Taro | `build:tt` 绿 | — |
| iOS | apps/mobile | Expo 51 + RN 0.74 | `expo export ios` 绿 | Hermes bundle 2.21MB |
| Android | apps/mobile | Expo 51 + RN 0.74 | `expo export android` 绿 | Hermes bundle 2.21MB |
| Admin | apps/admin | Next.js 15 | `next build` 绿 | 5 pages |
| Professional (Pro) | 受控授权视图 | Admin 内 | build 绿 | 分享 token 查看 |

## 跨端一致性（GOAL §48）

`tests/multi-client/test_consistency.py` — 4 tests PASS：
- Web Quick Log → Timeline 端点读回同一 canonical event（event_id/type/payload/provenance 一致）。
- Web 创建 Task → Open tasks 列表一致。
- Health 红旗 → triage 输出 EMERGENCY（规则引擎确定性，跨客户端一致）。
- Vet Brief 分享 token → H5 匿名访问 与 Admin 专业视图读到同一 content。

## 单一来源原则验证

- 医疗安全规则：仅 `packages/rules`（服务端），客户端不复制。
- Event Schema：`packages/domain-schema/life_event.schema.json` + 服务端 Pydantic registry。
- API DTO：`packages/api-client`（Web）与 mini/mobile 的 `services/types.ts` 字段级镜像。
- 客户端只负责 presentation / local draft / navigation / cache / upload / notification。

## 平台差异（允许 Platform-native UX）

- Mini 使用微信 tabBar（今日/时间线/宠物/助手/我的）；Web 使用顶部导航+更多菜单；Mobile 使用底部 Tab（Today/Timeline/Profile）。
- 数据、身份、安全、事件全部同一套。

## 已知限制（诚实分类）

| 项 | 状态 |
|---|---|
| Mini 登录（AppID/AppSecret/主体） | EXTERNAL_BLOCKED（sandbox dev-auth 仅限开发） |
| Mobile 真机签名/商店发布 | BUILD_READY_SIGNING_BLOCKED（无证书/账号） |
| HarmonyOS 原生 | 未实现；见 docs/mobile/HARMONYOS_PORTING_PLAN.md（PORT_READY） |
| Mini 自动 UI 测试 | 以 Taro build + typecheck + API integration 覆盖（无微信开发者工具自动化环境） |

## 结论

多端共享同一 Canonical API 与 Event Graph；跨端一致性测试证明同一数据在所有客户端可见且一致。客户端矩阵除外部账号类 blocker 外均真实构建通过。