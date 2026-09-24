# ANDROID BRANDING REPORT — Stage R.1 Phase H

> Stage: R.1 · 日期：2026-09-24 · 状态：`ANDROID_BRANDING_READY`
> 结论：Android 图标/Adaptive Icon/Splash 已从 Expo 默认资源替换为 PLI 品牌资源，满足
> warm / intelligent / clean / premium / non-medical / non-game 原则。

## 1. 现状（v0.1.0 时的缺口）

```text
v0.1.0：apps/mobile/assets/ 仅有 Expo 默认 icon.png（7311 B），无 adaptive-icon / splash。
App 安装后显示 Expo 默认图标 — 不可作为实际试用版本。
```

## 2. 设计原则（按计划 H2 禁用清单）

- **warm**：奶油画布 #FAF8F5 家族 + 暖陶土色渐变（#E9B88B → #C56B46）。
- **intelligent**：简洁抽象爪印/圆角 mark，传达「陪伴 + 数据」而非机械。
- **clean / premium**：低饱和、大面积留白、无多余装饰。
- **non-medical**：**无医疗十字 / 听诊器 / 药丸**。
- **non-game**：**无霓虹 / 赛博 / 全息 / 游戏化徽章**。
- 禁用：机器人头像、ChatGPT 风 swirl、过度科技感、霓虹全息（H2 清单全部遵守）。

## 3. 资源清单与来源

| 文件 | 尺寸 | 生成方式 | 说明 |
|---|---|---|---|
| `apps/mobile/assets/icon.png` | 1024×1024 | `scripts/gen-brand-assets.mjs`（纯 Node zlib，确定性、无外部依赖） | App 图标（full-bleed 设计） |
| `apps/mobile/assets/adaptive-icon.png` | 1024×1024 | 同上 | Adaptive foreground（透明底，mark 位于 Android safe zone） |
| `apps/mobile/assets/splash.png` | 1284×2778 | 同上 | 竖屏 Splash（宽度 ≥1024，满足 Expo/Android 要求） |

生成脚本头部注释（保留为证据）：

```js
// PLI Android brand asset generator — Stage R.1 Phase H.
// Deterministic, dependency-free PNG rendering (pure Node zlib). Produces:
//   apps/mobile/assets/icon.png           1024x1024  (app icon, full-bleed design)
//   apps/mobile/assets/adaptive-icon.png  1024x1024  (adaptive foreground, transparent bg,
//                                                     mark inside the Android safe zone)
//   apps/mobile/assets/splash.png         1284x2778  (portrait splash, width >= 1024)
// Design language (see reports/ANDROID_BRANDING_REPORT.md):
//   warm + intelligent + clean + premium, non-medical, non-game.
//   Cream canvas (#FAF8F5 family), warm terracotta gradient mark, white paw print.
```

调色板（与 `@pli/ui-tokens` 对齐）：

```js
const CREAM = [250, 248, 245]; // #FAF8F5 canvas
const CREAM_DEEP = [244, 233, 222];
const WARM_A = [233, 184, 139]; // #E9B88B
const WARM_B = [197, 107, 70];  // #C56B46 terracotta
const INK_SHADOW = [74, 54, 44];
```

## 4. app.json 引用

```json
{
  "name": "宠物生活智能",
  "icon": "./assets/icon.png",
  "android": {
    "package": "com.pli.mobile",
    "versionCode": 2,
    "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#FAF8F5" }
  },
  "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#FAF8F5" }
}
```

APK 实测（aapt badging）：

```text
application-label: '宠物生活智能'   （不再显示 Expo App / React Native App / PLI Test）
```

## 5. 禁用清单复核

| 元素 | 结果 |
|---|---|
| 医疗十字 | 未使用 |
| 机器人头像 | 未使用 |
| ChatGPT 风 swirl | 未使用 |
| 霓虹/全息/赛博 | 未使用 |
| 游戏化徽章 | 未使用 |

## 6. 结论

```text
ANDROID_BRANDING_READY = TRUE
图标/自适应图标/Splash 已替换为品牌资源（可复现脚本生成，确定性输出）
App 名称显示：宠物生活智能（versionName 0.1.1 / versionCode 2）
禁用清单全部满足
```
