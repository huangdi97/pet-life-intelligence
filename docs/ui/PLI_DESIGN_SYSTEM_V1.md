# PLI_DESIGN_SYSTEM_V1 — Stage H 冻结版

> 状态：`FROZEN（Stage H）` · 代码：`packages/ui-tokens`（tokens.json v2 + dist/tokens.css）+ `packages/ui-kit`
> 视觉方向：Warm / Professional / Calm / Trusted / Long-term / Life-oriented
> 反方向（禁止）：医院后台 / AI 科技蓝大屏 / 儿童卡通 / 廉价商城 / 过度拟物 / 过度玻璃拟态 / emoji 泛滥

## 1. Token 总览（11 类）

| 类别 | 位置（tokens.json） | 内容摘要 |
|---|---|---|
| Color | `color` | bg（canvas/surface/muted/strong）、ink（primary/secondary/muted/disabled）、line（default/strong/focus）、primary（绿系 50-900）、accent（暖棕系 50-700）、semantic（语义色 + *_bg） |
| Typography | `typography` | font_family（Inter + PingFang SC + Microsoft YaHei）、scale xs-3xl、line_height、weight 400-700 |
| Spacing | `spacing` | 0/1/2/3/4/5/6/8/10/12 → 0-48px |
| Radius | `radius` | sm 8 / md 10 / lg 12 / xl 16 / 2xl 20 / pill |
| Elevation | `elevation` | none/sm/md/lg/focus |
| Border | `border` | width_thin/thick、color default/strong/focus |
| Motion | `motion` | duration instant/fast/normal/slow、easing standard/emphasized/decelerate |
| Icon | `icon` | Lucide 风格 1.5px stroke；导航 [today/timeline/pet/agent/more]；risk [circle/info/eye/clock/alert-triangle/siren] |
| Grid | `grid` | container_max 1200、columns 4/12、gutter 16 |
| Breakpoint | `breakpoint` | xs 360 / sm 390 / md 768 / lg 1024 / xl 1440 |
| Z-index | `z_index` | base 0 / sticky 100 / dropdown 200 / sheet 300 / modal 400 / toast 500 |

CSS 变量前缀：`--pli-`（由 build.mjs 从 tokens.json 生成 `dist/tokens.css`）。

## 2. 语义色（§57 医疗风险独立）

**不得**用品牌色直接表达医疗风险。语义色独立成组：

| 语义 | 值（前景） | 背景 | 用途 |
|---|---|---|---|
| Normal 正常 | ok #4E7A5A | ok_bg #EDF3EE | 正常状态 |
| Info 信息 | info #3E7C83 | info_bg #E8F1F2 | 操作反馈 |
| Notice 注意 | notice #B08A2E | notice_bg #FBF4E2 | 轻提示 |
| Monitor 观察 | monitor #61795C | monitor_bg #F3F6F2 | 观察中 |
| Vet Soon 建议就医 | vet_soon #C07A2D | vet_soon_bg #FDF2E3 | 尽快就诊 |
| Urgent 紧急 | urgent #C2503C | urgent_bg #FBECE7 | 紧急 |
| Emergency 危及生命 | emergency #B42318 | emergency_bg #FBEAE6 | 最高风险 |
| Success 成功 | success（=ok） | success_bg | 成功操作 |
| Error 错误 | error（=danger #B42318） | error_bg | 操作失败 |
| Disabled 禁用 | disabled #B5ACA0 | — | 禁用态 |

- Risk Status（NORMAL/NOTICE/MONITOR/VET_SOON/URGENT/EMERGENCY）通过 `.pli-risk-*` 语义类使用；**颜色不是唯一表达**（必须配图标 + 中文标签 + secondary English）。
- 后端 triage 值是唯一风险来源；前端不自行判断。

## 3. Typography（§58 中文优先）

- 至少 8 档：Display(30/3xl) H1(24/2xl) H2(20/xl) H3(18/lg) Body(14/base) Secondary(13/sm) Caption(12/xs) Data（tabular-nums）。
- 中文体验优先：PingFang SC / Microsoft YaHei 兜底；**不要满屏小字**（正文 ≥14px，辅助 ≥12px）。
- 数据（体重/剂量/金额）使用 Data 档 + tabular-nums，显式单位。

## 4. 组件（见 docs/ui/COMPONENT_INVENTORY.md）

packages/ui-kit 29 组件，全部引用 `--pli-*` 变量；Web/Pro 接入（transpilePackages），Mini/Mobile 镜像值自实现，Admin 用 tokens css + 自有 globals。

## 5. 状态模型（§61）

每个主要页面统一状态：Loading / Skeleton / Empty / Partial Data / Populated / Error / Offline / Permission Denied / Not Found / Feature Disabled / External Blocked / Safety Blocked / Success。
- 统一由 `State` 容器 + EmptyState/ErrorState/Skeleton 呈现。
- 错误永远映射人类语言（见 COPY_GUIDELINES §错误映射），不暴露 raw codes。

## 6. Motion（§78）

动画只用于：state transition / confirmation / spatial context；duration ≤300ms；尊重 prefers-reduced-motion（关闭非必要动画）。不炫技。

## 7. 品牌视觉（§80）

App icon / Mini icon / Favicon / Default Pet Avatar / Empty Illustrations / Error Illustration / Share Image（web/public 已有基础版：favicon.svg、default-pet-avatar.png、illustrations/empty.png、error.png、icons/、og-image.png）。Logo 未冻结不阻塞产品。

## 8. 接入规范

```tsx
// layout.tsx（Web/Pro）
import "@pli/ui-tokens/css";
import "@pli/ui-kit/styles.css";
```

```json
// next.config.ts
transpilePackages: ["@pli/api-client", "@pli/ui-kit", "@pli/ui-tokens"]
```

Mini：`apps/mini/src/styles/tokens.scss`（SCSS 镜像）；Mobile：`apps/mobile/src/tokens.ts`（TS 镜像）。
