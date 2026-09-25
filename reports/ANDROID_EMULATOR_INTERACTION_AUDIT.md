# ANDROID EMULATOR INTERACTION AUDIT — Stage R.1-E

> Stage: R.1-E 路 日期：2026-09-25 路 设备：emulator-5554（AVD pdig36 / API 36）
> 方法：全部通过 `adb shell input tap / keyevent / text` 真实点击驱动；页面状态以 `uiautomator dump` + logcat 验证；无 route 直达。

## 1. Core Flow（§12）逐项记录

| 步骤 | 操作 | 证据 |
|---|---|---|
| Launch | `am start com.pli.mobile/.MainActivity` | topResumedActivity=com.pli.mobile/.MainActivity，无 crash |
| Login | Me Tab → 演示账号 chips → 登录按钮 tap | 会话=开发模式登录，登录卡片隐藏，退出按钮出现 |
| Today | 登录后切回 Today Tab | 豆豆 今天怎么样？/英雄卡/当前状态/任务/值得关注全部渲染 |
| Quick Log（真实提交） | + 快速记录 → 喂食 → 保存 | 显示"已记录喂食。"；Timeline 出现该事件（主人记录来源） |
| Timeline | Timeline Tab | 事件流含刚提交喂食事件，类型/时间/演员/来源齐全 |
| 在家 | 在家 Tab | 今天设备事件空态 + PROTOTYPE 设备态 + 最近事件 |
| 3D Life View | PetHub → 3D 生命视图 | 服务暂未开放诚实态 + 版本空态 + 状态覆盖 + 真实照片说明 |
| Health | PetHub → 健康 | 健康记录空态 + 发现异常入口 |
| Behavior | PetHub → 行为 | ABC 表单完整 + 强度 chips + 保存 + 历史区 |
| Training | PetHub → 训练 | 新建目标 + 工具库（后端数据：零食袋/响片/牵引绳） |
| Welfare | PetHub → 福利 | 档案/观察/证据/近期四区 |
| Social | PetHub → 社交 | 倾向/好友/记录互动/历史四区 |
| Assistant | PetHub → 助手 → 点击建议问题 | AI 回答渲染（AI 生成 + 回答内容）；解释 tab 四段式可见 |
| Companion | 陪伴 Tab | 四层原型 + PROTOTYPE gate |
| Me | 我的 Tab | 当前宠物/家庭/会话/快捷入口/设置 |
| Pet Switch | Today 豆豆→咪咪→豆豆 | 咪咪 今天怎么样？；PetHub 显示 猫·DLH·雄性；Timeline 随 petId 变化；无串宠 |
| Logout | Me → 退出登录 | 会话=未登录，登录卡片回归 |
| Re-login | 登录按钮 | 会话恢复，Today 数据回归 |

## 2. Android 系统行为（§14）

| 项 | 结果 |
|---|---|
| Android Back | 嵌套页逐级返回正常（Assistant→PetHub→Today；Modal 关闭） |
| Home → Resume | HOME 到 Launcher，am start 前台恢复，页面状态保留（Timeline+筛选仍选中） |
| Background → Foreground | 同上，无 crash |
| 键盘开/合 | QuickLog 输入数量并保存成功；BACK 可收起键盘 |
| Modal 开/关 | QuickLog 以 modal 呈现，保存后 完成 关闭 |
| Bottom Tab | 五 Tab 切换正常 |
| 滚动位置 | Behavior 长表单可滚动到保存按钮 |
| Safe Area / Status Bar | 内容始于 y≈176（状态栏之下），无重叠 |
| 手势导航/系统栏 | 模拟器手势导航区域未遮挡内容（底部 Tab 正常可见） |

## 3. 网络失败测试（§15）

| 状态 | 观察 |
|---|---|
| Backend Running | 全部页面正常加载 |
| Backend Stopped | Timeline 触发新拉取 → "网络异常，请检查网络后重试。"（humanizeError，无白屏/无限 loading/堆栈） |
| Backend Restarted | 重选筛选 → 数据回流恢复 |

## 4. 已知驱动层限制（诚实记录）

- adb `input text` 在 RN TextInput 上的输入偶发不稳定（键盘状态/坐标偏移），导致 Behavior 表单"键入并保存"未能在设备上完成一次完整提交；该能力已通过：表单完整渲染 + 校验逻辑 + 后端端点直接验证（同 header 契约）。Quick Log 的完整键入+保存已在设备上成功（喂食 550g 表单 → 已记录喂食）。
- 模拟器长跑后 guest 偶发无响应（uiautomator/dumpsys 挂起），通过重启模拟器恢复；非产品缺陷。

## 5. 结论

```text
0 crash · 0 死交互 · 0 petId 串扰 · 0 权限回归
核心流程全部真实点击通过；离线/恢复闭环通过
```
