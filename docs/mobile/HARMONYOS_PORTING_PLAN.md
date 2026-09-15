# HARMONYOS_PORTING_PLAN — 鸿蒙移植计划

## 状态

```
PORT_READY（未实现原生应用；响应式 Web/PWA 已可在鸿蒙浏览器使用）
```

本仓库不伪造 HarmonyOS 原生支持。

## 现状

- Web/PWA（apps/web）为响应式，鸿蒙浏览器（Chromium 内核）可直接使用，含离线壳与安装提示。
- 未实现 ArkTS 原生应用（无鸿蒙开发者账号/签名/DevEco 环境，EXTERNAL_BLOCKED）。

## 移植方案（条件就绪后）

| 层 | 方案 |
|---|---|
| 原生壳 | ArkTS + DevEco Studio，WebView 包 Web/PWA 或自绘 |
| API 复用 | 直接调用 Canonical API（/api/v1），无需改造后端 |
| 认证 | 鸿蒙账号登录 → 后端 auth adapter 化（同微信/支付宝） |
| 推送 | Push Kit 接入 → platform/notification 适配器 |
| 存储 | 安全存储（Keystore）→ platform/storage |
| 媒体 | camera/相册 → platform/media 适配器 |

## 发布要求

- DevEco 签名、AppGallery Connect 账号、隐私声明、网络权限（ohos.permission.INTERNET）。
- 隐私权限需声明相机/相册/通知。

## 结论

不改写现有多端（最小破坏 + 最大共享）。原生鸿蒙为独立 `apps/harmony` 工程，仅在外部队列具备时创建。