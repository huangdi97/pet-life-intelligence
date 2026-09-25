# ANDROID EMULATOR VISUAL AUDIT — Stage R.1-E

> Stage: R.1-E 路 日期：2026-09-25 路 设备：AVD pdig36（Pixel 5，1080×2340 @440dpi ≈ 393×851dp，API 36）
> 依据：模拟器真实截图 + 运行时 UI 层级（uiautomator：文本/边界/对齐）+ 布局越界检测（0 越界）。
> 截图目录：`artifacts/emulator/v0.1.2/`（全部来自 Android Emulator 真实 framebuffer，非浏览器 viewport）。

## 0. 审计方法说明

- 每屏截图真实落盘（尺寸见下表）；所有文本、坐标、层级来自设备端 `uiautomator dump`。
- 布局越界检测：对每屏 hierarchy 扫描全部节点 bounds，越界（超出 1080×2340 或负坐标）数量 = **0**。
- 中文渲染：全部中文文案在 dump 中正确呈现（无 tofu/乱码可检出；Android runtime 中文字体正常）。
- 视觉判断以结构证据 + 截图文件为准；P0/P1 定义为"崩溃/死交互/布局阻塞/信息缺失"，P2 为"可优化项"。

## 1. 逐屏审计表

| Screen | Screenshot | Visual Status | UX Status | Issues | Severity | Fix | After | Final |
|---|---|---|---|---|---|---|---|---|
| 01 登录（Me 页开发模式登录） | `01_login.png`（371 KB） | 正常 | 登录卡片清晰：演示账号 chips + 邮箱输入 + 登录按钮 | 无 | — | — | 登录后卡片隐藏，会话=开发模式登录 | PASS |
| 02 Today（Living Canvas） | `02_today.png`（338 KB） | 正常 | Pet 英雄卡（豆豆·狗·Corgi）为视觉主体 → 当前状态 → 快速记录 → 任务 → 值得关注 → 最近；五 Tab 自然 | 无 | — | — | 本轮新增英雄卡 + 助手入口 | PASS |
| 03 Quick Log | `03_quick-log.png`（152 KB） | 正常 | 九宫格分类 + 完成；喂食表单可输入/保存 | 无 | — | — | 真实提交喂食成功 | PASS |
| 04 Timeline | `04_timeline.png`（397 KB） | 正常 | Life Stream：类型/时间/演员/来源（溯源可见）；筛选 chips | 事件类型 `pet.asked` 显示原文 | P2 | `ui_labels.tsx` 补中文标签 | 已修（重建后复查） | PASS |
| 05 Pet（PetHub） | `05_pet.png`（233 KB） | 正常 | 身份主体（头像圈+品种/性别/出生）+ 当前状态 + 7 能力入口网格 | 无 | — | — | 本轮新增 | PASS |
| 06 3D Life View | `06_3d-life-view.png`（465 KB） | 正常 | 诚实 fallback：服务暂未开放 + 版本空态 + 当前状态覆盖 + 真实照片说明；无假 LIVE/假医学模型 | 无 | — | — | — | PASS |
| 07 Health | `07_health.png`（129 KB） | 正常 | 仅信息整理声明 + 发现异常入口 + 记录列表空态 | 无 | — | — | — | PASS |
| 08 Behavior | `08_behavior.png`（404 KB） | 正常 | ABC 表单完整（前因/行为/后果/持续/环境/强度/备注）+ 历史 | 无 | — | — | 本轮新增 | PASS |
| 09 Training | `09_training.png`（346 KB） | 正常 | 新建目标 + 目标列表空态 + 工具库（来自后端） | 无 | — | — | 本轮新增 | PASS |
| 10 Welfare | `10_welfare.png`（360 KB） | 正常 | 福利档案 + 观察记录（四类 chips）+ 证据概览 + 近期记录；无开心指数 | 无 | — | — | 本轮新增 | PASS |
| 11 Social | `11_social.png`（291 KB） | 正常 | 社交倾向 + 好友 + 记录互动（好友/质量/时长）+ 互动历史 | 无 | — | — | 本轮新增 | PASS |
| 12 Assistant | `12_assistant.png`（355 KB） | 正常 | Ask/Brief/Find/Plan/Explain 五 tab；建议问题→真实提问→AI 回答（事实/推断/来源/不确定/动作结构）；AI 未接入时诚实标注 | 无 | — | — | 本轮新增 | PASS |
| 13 Companion | `13_companion.png`（256 KB） | 正常 | 诚实 PROTOTYPE gate：四层原型 + 硬件未激活；无可观察语言违规 | 无 | — | — | — | PASS |
| 14 Me | `14_me.png`（236 KB） | 正常 | 当前宠物/家庭/会话 + 快捷入口 + 设置占位 + 退出登录 | 无 | — | — | 本轮补登录入口 | PASS |
| 15 Pet Switch | `15_pet-switch.png`（335 KB） | 正常 | 咪咪为当前宠物（Today 标题/英雄卡一致），无串宠 | 无 | — | — | — | PASS |
| 16 Error/Offline | `16_error-offline.png`（428 KB） | 正常 | 后端停止时显示"网络异常，请检查网络后重试"，无白屏/无限加载/堆栈 | 无 | — | — | 恢复后数据回流 | PASS |

## 2. Today Living Canvas 专项（§17）

- Pet 视觉主体：本轮新增英雄卡（头像圈 + 名称 + 品种），点击进 PetHub → ✓
- Current State 第一眼可理解：最后活动/今日事件两行 → ✓
- Attention 突出：值得关注（后端规则文案 + 规则 ID）→ ✓
- Quick Action 易点：+ 快速记录 主按钮 → ✓
- 同级卡片数：当前状态/任务/值得关注/最近（≤4，非后台 Dashboard 感）→ ✓
- 顶部占用：标题 + 英雄卡 ≈ 500px，可接受 → ✓

## 3. 专项结论（§18-§24）

- Timeline：日期层级/事件节奏/演员/来源/媒体/Outcome 数据链路正确；事件间视觉区分（类型加粗+时间右对齐）→ PASS
- Pet：身份主体突出（不再是"小头像+按钮堆"）→ PASS
- 3D fallback：身份+真实照片说明+状态覆盖完整，无空白 Canvas/假 LIVE/假医学模型 → PASS
- Health：信息整理声明清晰，无监护仪/诊断化设计 → PASS
- Assistant：Ask/Brief/Find/Plan/Explain 五能力可见；回答含事实/推断/来源/不确定性/建议动作，citations 引用真实记录 → PASS
- Companion：Observe/Presence/Enrichment/Learned Interaction 语言，无"豆豆想你了/打电话"类表述；硬件状态诚实 → PASS
- Me：Household/Notifications/Privacy/Data/Settings 均在；无开发者选项堆积 → PASS

## 4. Android UI 专项（§25）

| 检查项 | 结果 |
|---|---|
| 顶部/底部 Safe Area | SafeAreaView 正确处理（内容从 y≈176 起始，未与状态栏重叠） |
| Bottom Tab 触摸区 | 5 Tab 各 ≈216px 宽，远高于可点击下限 |
| 中文换行/超长宠物名 | 名称使用 flexShrink/多行策略，无截断 |
| Modal 超屏 | QuickLog modal 完整可见（540×~1400 内容区） |
| 横向溢出 | 0 越界节点 |
| 图标尺寸/对齐 | 底部 Tab 图标+标签对齐正常；PetHub 网格 2 列对齐 |
| 键盘遮挡 | QuickLog 输入/保存流程可用；Behavior 表单为 ScrollView 可滚动 |

## 5. 审计结论

```text
P0 = 0 · P1 = 0 · P2 = 2（pet.asked 等事件标签原文显示；退出登录后宠物上下文残留）—— 均已在本轮修复并重建
关键 P2 修复状态：已修（ui_labels.tsx 补标签；context.tsx reset + MeScreen logout 调用）
MOBILE_VISUAL_ACCEPTANCE 依据：16 屏真实截图 + 0 越界 + 0 P0/P1
```
