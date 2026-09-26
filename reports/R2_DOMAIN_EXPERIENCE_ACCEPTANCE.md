# R2_DOMAIN_EXPERIENCE_ACCEPTANCE — 健康/行为/训练/福利/社交 验收

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §44-§49（先读后写）+ §91（Forms Guardrail）+ §90（Pet 护栏）；实现：apps/mobile/src/screens/{Health,Behavior,Training,Welfare,Social}Screen.tsx

## 1. 截图证据

Before：`artifacts/emulator/v0.1.2/07_health.png`、`08_behavior.png`、`09_training.png`、`10_welfare.png`、`11_social.png`

After（`artifacts/visual-reconstruction/v0.2.0/wave-04-domains/after/`）：

- Health-390.png · Behavior-390.png · Training-390.png · Welfare-390.png · Social-390.png
- final/_s_06_Health.png · _s_07_Behavior.png · _s_08_Training.png · _s_09_Welfare.png · _s_10_Social.png

## 2. 逐域 Checklist

### Health（§44-§45）

| 检查 | 结果 |
|---|---|
| 首屏顺序 豆豆的健康 → 近期状态 → 最近变化 → 记录 → 用药/测量 → 记录健康事件 | PASS |
| 「+ 发现异常」不再是视觉核心 | PASS |
| 风险 level 来自 backend deterministic rule；普通数据不用红 | PASS（danger 视觉仅 URGENT/EMERGENCY 分诊） |
| 首屏无大表单 | PASS（§91） |

### Behavior（§46）

| 检查 | 结果 |
|---|---|
| 观察优先：Recent Observations → Patterns → Current context | PASS |
| ABC Form 不在默认首页；「记录行为」打开 Record Sheet | PASS |
| 首屏无大型录入表单 | PASS（§91 / §105 P0） |

### Training（§47）

| 检查 | 结果 |
|---|---|
| Current Goal → Progress → Recent Sessions → Safe Tools →「+ 新训练目标」 | PASS |
| 「新建训练目标」不再是首屏主体 | PASS |

### Welfare（§48）

| 检查 | 结果 |
|---|---|
| 近期观察 + 舒适/环境/活动/恢复 趋势优先 | PASS |
| 无快乐指数/幸福分数/情绪指数 | PASS（§27 AGENTS 禁止项） |

### Social（§49）

| 检查 | 结果 |
|---|---|
| 关系 → 最近互动 → 互动历史 | PASS |
| 记录互动为 Action 而非页面主体 | PASS（§105 P0） |
| Pet/Person media 可用时优先头像/照片 | ACCEPTED_LIMITATION（本轮无生成媒体） |

## 3. 横切

- §91 Forms Guardrail：五个 Domain 默认首页首屏均无大型编辑表单（Quick Log dedicated flow 为唯一例外）。PASS。
- Content Truth（§92）：域摘要字段全部来自真实 API（health-events / behavior-events / training-goals / welfare-evidence / social），无编造。
- Owner 内部词：无 PLI-xxx / raw enum（ui_labels 翻译层）。

## 4. Remaining Issues

- P2/ACCEPTED_DEFER：Social 关系媒体头像待真实 media 接入（本轮无生成照片）。
- P2：Behavior/Training/Social 录入 sheet 的交互细节（后续打磨，不影响 Gate）。

## 5. 结论

HEALTH_EXPERIENCE_PASS / BEHAVIOR_EXPERIENCE_PASS / TRAINING_EXPERIENCE_PASS / WELFARE_EXPERIENCE_PASS / SOCIAL_EXPERIENCE_PASS：**PASS**。
