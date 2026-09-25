# ANDROID EMULATOR BUILD REPORT — Stage R.1-E

> Stage: R.1-E 路 日期：2026-09-25 路 状态：`ANDROID_EMULATOR_BUILD_PASS`

## 1. Emulator Profile Build

| 项 | 值 |
|---|---|
| Profile | `emulator`（新增，仅本轮验收用） |
| API URL | `EXPO_PUBLIC_PLI_API_URL=http://10.0.2.2:8800` |
| APK 文件 | `artifacts/emulator/v0.1.2/Pet-Life-Intelligence-v0.1.2-emulator.apk` |
| Size | 88,166,218 B（≈84.1 MB） |
| SHA256 | `EE7E609183833C2FF7CF2C43A4E0735F51032DB42EFA58B36B8E3D7B39262FC4` |
| package | `com.pli.mobile` |
| versionName | `0.1.2` |
| versionCode | `3` |
| App 名称 | `宠物生活智能`（aapt badging 实测） |
| signing | `CN=Android Debug`（DEBUG_SIGNED_INSTALLABLE_APK / NOT_PLAY_STORE_SIGNED / PLAY_STORE_SIGNING=EXTERNAL_BLOCKED），apksigner 实测 |
| cleartext | release manifest `usesCleartextTraffic=true`（仅 http:// 构建，manifest-cleartext 插件按 URL 条件放行） |
| 构建方式 | `expo prebuild --platform android` + `gradlew assembleRelease`（clean，9m49s / 680 tasks） |

## 2. Bundle 注入验证（解包 assets/index.android.bundle 实测）

```text
contains 10.0.2.2:      True   （emulator profile URL 已注入）
contains localhost:8800: False
contains 192.168.0.100:  False  （LAN 地址未混入）
```

## 3. 本轮关键修复（build 依赖链）

1. **双 React 崩溃修复（P0）**：`expo-keep-awake`（经 pnpm store 解析）引入的 `useId` 来自 store 中 web 专用的 `react@19.0.0`，而 App 渲染使用 `react@18.2.0` —— 混合 React 导致 release 构建启动即崩（`Objects are not valid as a React child`）与 dev 构建 `Invalid hook call / Cannot read property 'useId' of null`。
   - 修复：`apps/mobile/metro.config.js` 增加 `resolver.resolveRequest`，将 mobile 工程内所有 `react*` 导入钉到 `apps/mobile/node_modules/react`（18.2.0，与 react-native 0.74.5 配对）。
   - 该修复同时覆盖 CI 的 `expo export` 与 gradle `bundleRelease`（同一 metro 配置），未来 CI APK 不再带此缺陷。
2. 移动端收口改动（v0.1.2）：Me 页开发模式登录入口、PetHub 宠物中枢、Behavior/Training/Welfare/Social/Assistant 五屏移植、Today 宠物英雄卡与助手入口、事件类型中文标签补齐（pet.asked 等）、退出登录清空宠物上下文。

## 4. 历史 APK 对照（未触碰）

```text
artifacts/release/v0.1.1/Pet-Life-Intelligence-v0.1.1-internal-lan.apk   （原样保留）
  size 88,151,802 B · sha256 7A0C1B14…（与 SHA256SUMS 一致）
v0.1.0 / v0.1.1 tag 与 Release 均未移动/删除
```

## 5. 构建环境

| 项 | 值 |
|---|---|
| Node / pnpm | Node 22 系 / pnpm 12.4.1（workspace） |
| SDK | `D:\Code\Android\SDK`：platform-tools 37.0.0、build-tools 34.0.0、platforms android-34/36 |
| Gradle | `apps/mobile/android/gradlew`（assembleRelease，JAVA 21 Temurin） |
| 输出日志 | prebuild → `build-pre.log`；gradle → `build-gradle.log`（BUILD SUCCESSFUL） |
