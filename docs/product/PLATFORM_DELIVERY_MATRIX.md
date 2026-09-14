# PLATFORM DELIVERY MATRIX — 多端交付矩阵

> 本文件定义**产品能力在哪些客户端需要暴露**（客户端交付矩阵），
> 不复制 228 Feature Inventory（那是产品能力定义）。
> 权威顺序：真实代码/测试 > Feature Inventory > 本矩阵。
>
> 状态图例：`YES` 交付 / `NO` 不暴露 / `PARTIAL` 部分暴露 / `EXTERNAL` 依赖外部平台能力 / `N/A` 不适用

客户端缩写：
- **Web** — Next.js Owner 端（apps/web）
- **PWA** — 同一 Web 的移动浏览器安装形态（apps/web + service worker）
- **H5** — 免安装分享页（Vet Brief / Care Card / 专业分享）
- **Mini** — 微信小程序（apps/mini，Taro）
- **Mobile** — iOS / Android App（apps/mobile，RN + Expo）
- **Admin** — 专业管理端（apps/admin）
- **Pro** — 兽医 / 专业协作视图（受控授权）

---

## 1. Identity & Permissions（01）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-001 创建宠物主档 | YES | YES | NO | YES | YES | NO | NO |
| PLI-002 多宠家庭管理 | YES | YES | NO | YES | YES | NO | NO |
| PLI-003 头像与视觉档案 | YES | YES | NO | YES | YES | NO | NO |
| PLI-008 Owner / Co-owner 关系 | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-010 角色权限模型 | YES | YES | NO | YES | YES | PARTIAL | NO |
| PLI-011 临时授权与自动到期 | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-014 紧急联系人卡 | YES | YES | PARTIAL(Care Card) | YES | YES | NO | PARTIAL |
| PLI-016 数据用途与研究同意 | YES | YES | NO | YES | YES | PARTIAL | NO |

## 2. Today & Daily Life（02）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-017 今日总览 | YES | YES | NO | YES | YES | NO | NO |
| PLI-018 快速记录入口 | YES | YES | NO | YES | YES | NO | NO |
| PLI-019 喂食记录 | YES | YES | NO | YES | YES | NO | NO |
| PLI-020 饮水记录 | YES | YES | NO | YES | YES | NO | NO |
| PLI-021 排泄记录 | YES | YES | NO | YES | YES | NO | NO |
| PLI-022 散步与户外 | YES | YES | NO | YES | YES | NO | NO |
| PLI-023 玩耍与丰富化 | YES | YES | NO | YES | YES | NO | NO |
| PLI-025 体重趋势 | YES | YES | NO | YES | YES | NO | NO |
| PLI-026/027/028 照护任务 | YES | YES | NO | YES | YES | NO | NO |
| PLI-032 照片/视频绑定 | YES | YES | NO | YES | YES | NO | PARTIAL |

## 3. Care Network（03）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-035 邀请家庭成员 | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-036 家庭角色模板 | YES | YES | NO | YES | YES | NO | NO |
| PLI-037 照护交接模式 | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-038 自动生成 Care Card | YES | YES | YES(分享) | YES | YES | NO | PARTIAL |
| PLI-046 谁看过/改过什么 | YES | YES | NO | NO | NO | YES | NO |

## 4. Health（04）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-049 发现异常入口 | YES | YES | NO | YES | YES | NO | NO |
| PLI-050 动态追问 Intake | YES | YES | NO | YES | YES | NO | NO |
| PLI-051 证据上传 | YES | YES | NO | YES | YES | NO | PARTIAL |
| PLI-052 AI 观察提取 | YES | YES | NO | YES | YES | NO | NO |
| PLI-053 红旗安全引擎 | YES | YES | NO | YES | YES | YES | YES |
| PLI-054 风险分级 Triage | YES | YES | NO | YES | YES | YES | YES |
| PLI-055 Vet Brief | YES | YES | YES(分享) | YES | YES | YES | YES |
| PLI-056 分享链接/PDF | YES | YES | YES | PARTIAL | YES | YES | YES |
| PLI-059/060 用药计划与给药 | YES | YES | NO | YES | YES | NO | PARTIAL |
| PLI-063 结局采集 Outcome | YES | YES | NO | YES | YES | PARTIAL | YES |

## 5. Behavior（05）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-069 行为事件 ABC 记录 | YES | YES | NO | YES | YES | NO | PARTIAL |
| PLI-094 专业链接 | NO | NO | NO | NO | NO | YES | YES |
| PLI-095 视频工件绑定 | YES | YES | NO | PARTIAL | YES | NO | PARTIAL |
| PLI-103 环境负向 kind | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-104 压力恢复 kind | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-106 QOL 问卷 kind | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |

## 6. Timeline & Archive（14）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-185 统一生命时间线 | YES | YES | NO | YES | YES | PARTIAL | PARTIAL |
| PLI-186 事件过滤与视图 | YES | YES | NO | YES | YES | NO | NO |

## 7. Pet Agent & Search（15）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-190 个人记录搜索 | YES | YES | NO | YES | YES | NO | NO |
| PLI-190 QA 证据引用问答 | YES | YES | NO | PARTIAL | PARTIAL | NO | NO |
| PLI-204 医疗动作硬边界 | YES | YES | NO | YES | YES | YES | YES |

## 8. Platform, Data & Safety（16）

| Feature | Web | PWA | H5 | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|---|---|
| PLI-211 Canonical Event Schema | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| PLI-212 来源等级 Provenance | YES | YES | PARTIAL | YES | YES | YES | YES |
| PLI-213 记录不可静默覆盖 | YES | YES | NO | YES | YES | NO | NO |
| PLI-214 AI 模型/规则版本追踪 | NO | NO | NO | NO | NO | YES | NO |
| PLI-215 细粒度同意中心 | YES | YES | NO | YES | YES | PARTIAL | NO |
| PLI-216 删除与保留策略 | YES | YES | NO | PARTIAL | PARTIAL | PARTIAL | NO |
| PLI-217 登录与设备安全 | YES | YES | NO | YES(登录) | YES(登录) | YES | NO |
| PLI-219 统一通知中心 | YES | YES | NO | YES | YES | NO | NO |
| PLI-221 事件幂等与重复检测 | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| PLI-227 AI 离线评测框架 | NO | NO | NO | NO | NO | YES | NO |

## 9. Admin / Pro 专属能力（不上 Owner 端）

| 能力 | Web | Mini | Mobile | Admin | Pro |
|---|---|---|---|---|---|
| 用户 / 宠物支持 | NO | NO | NO | YES | NO |
| Feature Flags 管理 | NO | NO | NO | YES | NO |
| Integration / 能力注册表 | NO | NO | NO | YES | NO |
| Rule 版本管理 | NO | NO | NO | YES | NO |
| AI 模型版本管理 | NO | NO | NO | YES | NO |
| Incident dashboard | NO | NO | NO | YES | NO |
| Audit log 审计 | NO | NO | NO | YES | NO |
| Webhook / Job 状态 | NO | NO | NO | YES | NO |
| Data quality 报告 | NO | NO | NO | YES | NO |
| Vet Brief 打开 / Outcome 回写 | NO | NO | NO | YES | YES |
| 授权 Timeline / Evidence 查看 | NO | NO | NO | YES | YES |
| 撤回访问 | NO | NO | NO | YES | YES |

## 10. 多端一致性要求

无论哪个客户端产生 / 消费数据，必须满足：
- 同一个 `pet_id` / `event_id` → 同一个 Canonical Event。
- 同一 Event Type / Payload / Schema version / Error code。
- 同一医疗安全规则（服务端唯一权威）。
- 同一条 Timeline 在所有客户端可见且一致。

示例验证（tests/multi-client）：
```
Mini 创建 Quick Log  → Web Timeline 可见
Web 创建 Task        → Mobile Today 可见
Mini 处理健康事件    → Admin / Pro 可审计
```