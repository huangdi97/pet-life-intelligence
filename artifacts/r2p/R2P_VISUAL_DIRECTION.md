# R2P_VISUAL_DIRECTION — R2-P 视觉方向（P0 实现契约）

> 日期：2026-09-27
> 输入：R2P_UIUX_AUDIT.md（ui-ux-pro-max） + R2P_VISUAL_FIDELITY_AUDIT.md（impeccable） + GAP 表 +
> v3.4-R1 §33/§34/§45-§49。本文档是 P0 实现的唯一视觉契约；实现（frontend-design 职责）不得自行改向。

## 1. Visual Identity — Warm Living Intelligence

不成为：Apple Health clone / Notion clone / SaaS dashboard / game UI / cyberpunk HUD / pet toy app /
generic pet tracker。关键词：

```text
living（有生命感）· warm（温暖）· calm（安静）· premium（高级）· organic（有机）
· spatial（空间）· trustworthy（可信）· pet-first（宠物优先）· quiet intelligence（克制智能）
```

具体化（可核验）：
- 宠物视觉是每一屏唯一主角；任何 UI 都不得在视觉权重上超过宠物。
- 暖调来自分层（environment wash / stage），不靠"白卡+暖底"。
- 界面语言说"豆豆的话"（微文案叙事），不说"功能标签"。

## 2. 三层视觉深度（每屏强制）

| 层 | 职责 | 实现 |
|---|---|---|
| BACKGROUND | 环境与情绪 | warm vertical gradient + soft ambient wash（如 `stageGradientTop/Base`），圆润环境光；禁止霓虹/发光 |
| MIDGROUND | Pet Stage | pet visual 居中/偏上，软椭圆 shadow（ground shadow）、微光层（subtle rim），光从窗侧来 |
| FOREGROUND | 状态/注意/动作 | 半透明锚点 chip、attention 行、CTA；可点击，≥48dp |

cross-check：任何核心页若仍由"白卡 + 纵向分段"主导 = FAIL（impeccable §2 反捷径）。

## 3. Surface Grammar（构图单元）

```text
PetLivingStage   —— 三屏共同语法：身份行 + center pet + 环绕状态锚点 + 副文案（诚实态）
PetStateAnchor   —— 环绕/锚定的状态 chip：label + value + 与个人基线差值（真实派生）
LifePulse        —— "现在 / 最近变化 / 记忆"叙事段
ChangeNarrative  —— 基线比较一句话 + [为什么]（Explain 入口，P0 仅路由占位）
LivingAttention —— 一屏唯一 attention（calm 态显示"目前稳定"）
DomainMeaning    —— Pet 页：先讲豆豆最近…，导航降权
LivingModeSwitcher —— LifeView 底部模式条：此刻(默认)/趋势/时间线/外观
PetStageRenderer —— renderer 抽象：photo / twoPointFiveD / generated / threeD（未来替换无需改页）
```

规则：
- 不先堆抽象 primitives，先实现三页真实重复后的提取（Goal §24）。
- 新组件保持 ≤150 行 / 屏幕文件 ≤300 行；不产生 God Component。

## 4. Motion（§22 + v3.4 §47.5）

```text
允许：gentle page transition · hero transition · sheet transition · state fade（subtle）
禁止：bounce · neon pulse · game animation · dramatic effect
必须：respect reduced motion（RN AccessibilityInfo + web prefers-reduced-motion 降级为无动画）
```

- 实现层面 RN 用 Animated opacity/translate 轻过渡；Web 用 CSS transition ≤240ms + reduced-motion 关闭。
- 不做 scroll-jacking / parallax 依赖（降到 reduced-motion 时保底可读）。

## 5. Identity / Demo Media 契约（§10、§21、C5）

```text
REAL_3D_PROVIDER = EXTERNAL_BLOCKED（如实）
PetStageRenderer: photo → twoPointFiveD → generated → threeD
当前：identity-specific demo visual（DEMO/SYNTHETIC，带 provenance 标签）
说明文案：“3D 形象尚未创建 · 当前以照片与记录呈现”（v3.4 §46.8 原文），不显示 provider/model/raw
```

Demo actors：豆豆（dog/corgi，本阶段 entity）+ 咪咪（cat）+ 空空（canine companion）；
三屏 owner 可见 = 豆豆；其他 actors 不进入三屏视觉。

## 6. 文案与语义（C3/C4/C6）

- Owner 可见文案零内部术语（BW-*/raw enum/UUID/event key/feature flag/developer）。
- enum → user language：STRESS_RECOVERY→压力恢复；OWNER_REPORTED→主人记录；未知 enum → 安全 fallback + 日志。
- 数据诚实：只展示真实 API 派生值；不伪造 mood/emotion/健康状态/未来风险；demo 布局 deterministic。
- 「一句话叙事」只允许在真实数据支撑下（如"饮水比自身近期基线低 18%"来自 hint）。

## 7. 三屏具体方向

### 7.1 Today — Living Stage（G1/G5/G6）
```text
[header] 豆豆 · 柯基 · 年龄         （身份行，轻）
[stage]   center pet visual
         围绕锚点：饮水 198ml / 进食 2次 / 活动 42min / 睡眠 7h（真实派生，稀疏布置）
         ground shadow + rim light
[now]    “今天整体稳定 · 正在休息 · 最近活动 12 分钟前”（真实派生）
[change] 与它自己相比：饮水 -18% [为什么]
[attention] 一屏唯一（calm → 不显示或一行“目前没有需要特别关注的变化”）
[action] 1 主 CTA（快速记录）+ 2 轻入口（看看它 / 问助手）
[memory] 最近发生 life stream preview（底部，≤5 条）
```
首屏 accept：PET IS PRIMARY FOCUS · CARD_DASHBOARD_PATTERN=NO · ONE_ATTENTION=YES ·
PRIMARY_ACTION_CLEAR=YES · 同权大卡 ≤2。

### 7.2 Pet — Pet World（G2/G4/G8）
```text
[stage]  identity visual（identity-specific demo）+ 名称 + 年龄/品种/性别
[life pulse] 现在 · 最近变化（一句话，真实） · 记忆（最近重要生活事件 1 条）
[its life]  域叙事（DomainMeaning）：
   健康：“最近 7 天 N 条记录”（可点→Health，但视觉上是叙事不是菜单）
   行为：“最近一次：门铃后吠叫”
   训练：“当前目标：坐下保持 5 秒”
   福利：“近期观察 N 条”
   社交：“最近与咪咪互动 1 次”
[entries]  生命视图 / 陪伴（轻量，次级）
```
accept：FEATURE_GRID_AS_PRIMARY=NO · PET_WORLD=YES · MEMORY_PRESENT=YES。

### 7.3 Life View — Pet Living Stage（G3/G7）
```text
[stage]   center pet（占 visual 权重最高）+ 环绕锚点：饮水/进食/活动/睡眠/体重/任务（有值才显示）
         副文案诚实态：3D 形象尚未创建 · 当前以照片与记录呈现
[modes]   底部 LivingModeSwitcher：此刻（默认）/ 趋势 / 时间线 / 外观
[此刻 mode] 状态锚点 + “豆豆现在怎么样？”的一句话真实回答
[趋势/时间线/外观 mode] P0 提供内容化占位（趋势=当日小折线如有数据；时间线=life stream 4 条；外观=3D 诚实态）
```
accept：LOOKS_AT_PET_FIRST=YES · SPATIAL_LAYOUT=YES · DATA_ANCHORED_TO_PET=YES ·
PROVIDER_STATE_NOT_DOMINANT=YES · MODE_SWITCH_PRESENT=YES。

## 8. Web Parity（G10 / C2）

apps/web 新增 `/today` `/pet` `/life-view`：同一 grammar，语义化 HTML（h1→h2→h3），
390px 单列 = 移动端；≥1024px 双栏（stage 左、pulse 右），不是简单放大移动端。
Web 用同一 data（@pli/api-client）+ 渐变/阴影实现三层深度 + prefers-reduced-motion。

## 9. Acceptance（P0 终检，供 Human Gate Q1-Q9 用的自检清单）

```text
Q1 pet 第一眼 = 豆豆（identity-specific visual，不是 UI）          —— 依赖 §5 demo media
Q2 pet visual 是豆豆不是"一只狗"                                    —— 依赖 §5 demo media
Q3 Today = Living Canvas（stage），不是 dashboard                    —— §7.1
Q4 Pet = Pet World，不是 profile/hub                                —— §7.2
Q5 LifeView = 看豆豆，不是看数据/provider                           —— §7.3
Q6 有空间感（三层深度成立）                                         —— §2
Q7 数据与 pet 建立视觉关系（锚定/环绕）                             —— §7.x + PET>50% 首屏权重
Q8 warm/living/premium/calm/trustworthy，非 flat/generic/utility    —— §1 + white 占比显著下降
Q9 无 raw enum/BW-*/debug/test pet/内部 ID                          —— grep + 截图
```
Automated 侧（与上述 human 侧并行）：typecheck/build/unit/Playwright/Emulator 截图照跑；
但任何 automated PASS 都不能替代 Q1-Q9（v3.4 §45）。

## 10. 明确不做（P0）

- 不改 Health/Behavior/Training/Welfare/Social/Assistant/Companion/Me/Timeline/QuickLog/Monitoring；
- 不 freeze baseline、不 bump 版本、不发 Release、不进 Pilot/真机；
- 不做游戏 HUD / 霓虹 / glassmorphism-heavy / 全屏 glow。