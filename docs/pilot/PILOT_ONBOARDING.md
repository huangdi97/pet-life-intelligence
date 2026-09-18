# PILOT_ONBOARDING — 试点入驻流程

> 目标：宠主 ≤5 分钟完成主要 onboarding；机构 1–3 天内完成商务确认→第一只真实 Pet→第一条协作记录。
> 原则：不要求一次填满所有信息；不确定字段允许未知；第一条真实 Event 尽快产生。

## 1. Owner Onboarding（宠主标准流程）

```
收到邀请码
  ↓
打开注册页（/register）→ 填昵称/邮箱/密码/邀请码（+role=owner）
  ↓
完成同意（PILOT_CONSENT 版本确认，设置页「数据同意」可复核）
  ↓
创建 Pet（/pets/new：名字/物种必填；品种/生日/体重可选或 UNKNOWN）
  ↓
完成基础档案（紧急联系卡可选，鼓励填写）
  ↓
第一次 Quick Log（首页 Today 快捷记录：喂食/饮水/排泄/散步/玩耍/体重）
  ↓
查看 Timeline（确认事件出现、时间线可读）
  ↓
理解 Today（了解今日概览与开放任务）
```

完成判据：
- 注册→第一条 Event 路径顺畅；
- 首次 Quick Log ≤ 30 秒完成；
- 24h 内产生 ≥3 个有效 Event（Activation 定义见 §4）。

## 2. Institution Onboarding（机构流程）

```
商务确认（机构是谁、谁拍板、谁日常使用）
  ↓
确定 Pilot 目标（见 §3 必答清单）
  ↓
确定机构负责人（contact 写入台账 ORG-XXX）
  ↓
账号/权限（邀请码 + role=vet|trainer|store|caregiver；授权走正式 Grant）
  ↓
产品演示（用 DEMO_SCRIPT 或真实流程走一遍；demo 数据不得计入真实指标）
  ↓
第一只真实 Pet（机构真实服务对象，不是演示宠）
  ↓
第一条真实协作记录（专业查看授权资料 / Vet Brief / 训练计划 / 服务记录）
```

## 3. 机构 onboarding 必答清单（每机构一份，存台账）

1. 本次 Pilot 想验证什么？（一个核心假设）
2. 谁是负责人？
3. 预计宠物数量？
4. 预计持续多久？
5. 什么叫成功？（事前定义，避免事后美化）
6. 哪些数据允许进入？
7. 哪些数据不得进入？（如病历全文、客户 PII、内部定价）

## 4. Activation 定义（正式口径，写死，不因样本调整）

- **Owner Activation**：创建 Pet **且** 24h 内产生 **≥3 个有效 Event**（有效 = 带 pet/actor/time/source，非 duplicate）。
- **Professional Activation**：实际查看一次真实授权资料（Grant 范围内）**或** 完成一次真实专业协作动作
  （Vet Brief 生成/打开、训练计划创建/跟进、服务记录）。
- 注册成功 ≠ 激活。

## 5. 第一条真实 Event 引导

- 首页 Today 已提供 6 类 Quick Log（喂食/饮水/排泄/散步/玩耍/体重）。
- 对不确定字段（品种/生日/体重）引导选择「未知」，不阻塞记录。
- 目标：新用户 session 内即产生 ≥1 条 Event。

## 6. Onboarding 观测指标（进周报）

- Time to First Log
- Time to Complete Log
- Log Abandon Rate
- 注册→Pet 创建转化
- Pet 创建→3 Events 转化（Activation Rate）
