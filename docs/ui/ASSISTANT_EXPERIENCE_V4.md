# ASSISTANT_EXPERIENCE_V4 — 宠物感知助手体验规范

> 阶段：Stage R.2（v0.2.0）· 日期：2026-09-26 · 状态：MOBILE + WEB + MINI IMPLEMENTED
> 依据 GOAL §50-§53；实现：apps/mobile/src/screens/AssistantScreen.tsx、assistant_panels.tsx、apps/web/app/agent/page.tsx、apps/mini/src/pages/agent/index.tsx

## 1. 定位

Assistant 不是 Generic Chat，而是**这只宠物的助手**（Pet-aware Intelligence，§50）。

- 顶部必须明确：「豆豆的助手」或「正在帮助你理解：豆豆」，并展示 Pet visual context（PetAvatar）。
- 不强制所有解释都走聊天（§21 AGENTS）：Why? / View evidence / Source / Compared with itself 语境解释并存。

## 2. 五种能力（§51）

保留 Ask / Brief / Find / Plan / Explain（问 / 摘要 / 找 / 计划 / 解释），但不再用等权 pill tab：

- **Ask 为主模式**（primary mode）；
- 摘要/找/计划/解释为 contextual actions（用户主要任务可通过 mode switch 切换）。

## 3. Answer Contract（§52）

回答呈现固定结构：

```text
结论
依据
不确定性
下一步
```

允许：查看记录 / 查看来源 / 与它自己相比。

Medical Risk 仍由 deterministic rule engine 控制（AI 不降级确定性红标，SAFETY INVARIANT）。

## 4. Empty State（§53）

禁止「还没有回答。输入问题开始。」；改为：

```text
我会基于豆豆已有的真实记录回答。
你可以问最近变化、任务、训练、健康记录。
```

配 Pet identity。

## 5. Deterministic-risk 边界

- AI 不得自主诊断、改药、改剂量、把推断写成临床事实（§12 AGENTS / GOAL §99）。
- 回答保留 观察事实 / 来源 / 不确定性 / 建议行动 四要素；禁止「AI 判断它生病了」类表述。
- AI 不可用时诚实显示服务不可用文案（web AskPanel ai-off copy 用用户语言），不伪装。

## 6. 验收

- §105 P0：Assistant 有 Pet Context（PASS）。
- §108：PET_AWARE_ASSISTANT_PASS。
- 截图：artifacts/visual-reconstruction/v0.2.0/wave-05-assistant-companion-me/after/assistant-390.png；final/_s_11_Assistant.png。
- 无障碍：模式切换为可访问控件，回答结构有文本层级（§68）。
