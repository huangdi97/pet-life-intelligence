# Pet Life Intelligence — 今晚从零开工入口

目标目录（Windows）：

```powershell
E:\AI\Pet Life Intelligence
```

## 你现在要做的只有 4 步

1. 将本压缩包完整解压到：
   `E:\AI\Pet Life Intelligence`
2. 把你的 AI 编码 Agent（WorkBuddy / OpenCode / Codex 类工具）的工作目录设置到这个目录。
3. 把 `START_PROMPT_直接粘贴给Agent.txt` **完整粘贴给 Agent**。
4. 不要手工替 Agent 改代码。让它持续执行 `GOAL_今晚从零到v0.1_RELEASE.md`，直到 Release Gate 有真实证据。

## 权威顺序

后续出现冲突时，按以下顺序裁决：

1. **真实仓库状态、运行结果、测试报告、migration、日志、Git diff**
2. `docs/reference/Pet_Life_Intelligence_v3.0_完整产品与技术设计母版_2026-09-13.docx`
3. `docs/reference/Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx`
4. `GOAL_今晚从零到v0.1_RELEASE.md`
5. `docs/01_V01_SCOPE_50_P0.md`
6. 其他辅助文档

文档文字不能覆盖真实测试失败。

## 今晚“做完”的定义

不是把 228 项都写个页面，也不是让 AI 宣布“完成”。

今晚主终点是：

> **v0.1 的 50 个 P0 功能形成一个可运行、可迁移、可测试、可本地启动、可演示、可推 GitHub 的闭环版本。**

v0.2 / v1.0 / Future 只允许：
- 预留 schema / interface / feature flag；
- 写设计说明；
- 不允许为了“功能数量”破坏 v0.1 的完成度。

## 禁止伪完成

任何 Gate：
- 没有实际执行命令 = `NOT_RUN`
- 因环境/密钥/外部服务无法执行 = `BLOCKED`
- 只有命令真实返回成功并有证据 = `PASS`

禁止：
- “理论上可用”
- “应该通过”
- “代码看起来没问题”
- 未运行却写 PASS
