# EMPTY_LOADING_ERROR_STATES — 空态 / 加载 / 错误状态规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §59-§61；实现：apps/mobile/src/components/feedback/Feedback.tsx（EmptyState / InlineError / Skeleton）

## 1. 状态清单

| 状态 | 组件 | 规则 |
|---|---|---|
| EmptyState | EmptyState | 必须含 meaning + next action |
| InlineError | InlineError | 局部失败，页面其余内容继续可用 |
| FullPageError | —（组合） | 整页不可用，含重试 |
| OfflineBanner | — | 顶部横幅：「暂时连接不上 · 你的本地操作不会丢失」 |
| RetryState | — | 明确的 [重试] 按钮，非自动狂刷 |
| PartialDataState | — | 已有内容保留 + 缺失部分说明 |
| Skeleton | Skeleton | 加载骨架，非大空白 Card + spinner |

## 2. 文案（用户语言）

- 禁止 raw 红色错误文本直接插页面（如「请求超时，请检查网络后重试。」这类工程化红字，§59）。
- 标准文案：「暂时连接不上」+「你的本地操作不会丢失」+ [重试]。
- exception / stack trace 留 logs，不上屏（§16 global / §59）。
- 具体错误如已实现本地草稿/重试语义，按产品事实说明，不夸大。

## 3. Empty State（§61）示例

- Timeline：「豆豆的时间线还很安静 —— 第一次喂食、散步或健康记录会从这里开始」+ [快速记录]。
- Training：「还没有训练目标 —— 记录豆豆正在学习的第一件事」+ [创建目标]。
- Today Now：「今天还没有足够记录」（数据不足时不编造，§22）。
- Companion：「连接支持的设备后，可以在不打扰它的前提下观察和互动。」

## 4. 约束

- 所有核心 Domain 必须有 Empty（meaning + next action）；不是只有「还没有记录。」
- Loading 默认 skeleton / retained previous content / subtle progress；仅必要时局部加载。
- 任何重要状态不能只在图片上（§68）：空态/错误态需文本等价物。
