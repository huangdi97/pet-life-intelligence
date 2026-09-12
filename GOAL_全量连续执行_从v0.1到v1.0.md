# Pet Life Intelligence — 全量连续执行总 Goal

## 总原则

本文件不是要求“一口气堆 228 个页面”。正确顺序是：

1. **先执行 `GOAL_今晚从零到v0.1_RELEASE.md`，直到 v0.1 得到真实 Release 结论。**
2. 只有 v0.1 核心 Gate 已经 PASS 或仅有明确外部 BLOCKER 后，才继续 v0.2。
3. v0.2 收口后继续 v1.0。
4. Future 中依赖真实医院/保险/设备/支付/科研合作的能力，只能做到：
   - interface
   - adapter contract
   - feature flag
   - mock/sandbox
   - validation plan
   不能伪造真实生产接入。
5. 每一阶段结束都要重新做 regression、safety、migration、E2E 和 Release Audit。
6. 不要为了“228/228”破坏核心产品质量。

---

# Stage A — v0.1 / 50 P0

严格执行：
`GOAL_今晚从零到v0.1_RELEASE.md`

v0.1 功能：
- `PLI-001` [01 Identity & Permissions] 创建宠物主档
- `PLI-002` [01 Identity & Permissions] 多宠家庭管理
- `PLI-003` [01 Identity & Permissions] 头像与视觉档案
- `PLI-008` [01 Identity & Permissions] Owner / Co-owner关系
- `PLI-010` [01 Identity & Permissions] 角色权限模型
- `PLI-011` [01 Identity & Permissions] 临时权限与自动到期
- `PLI-014` [01 Identity & Permissions] 紧急联系人卡
- `PLI-016` [01 Identity & Permissions] 数据用途与研究同意
- `PLI-017` [02 Today & Daily Life] 今日总览
- `PLI-018` [02 Today & Daily Life] 快速记录入口
- `PLI-019` [02 Today & Daily Life] 喂食记录
- `PLI-020` [02 Today & Daily Life] 饮水记录
- `PLI-021` [02 Today & Daily Life] 排泄记录
- `PLI-022` [02 Today & Daily Life] 散步与户外活动
- `PLI-023` [02 Today & Daily Life] 玩耍与丰富化记录
- `PLI-025` [02 Today & Daily Life] 体重与体况趋势
- `PLI-026` [02 Today & Daily Life] 照护任务
- `PLI-027` [02 Today & Daily Life] 完成与责任人
- `PLI-028` [02 Today & Daily Life] 重复执行冲突提醒
- `PLI-032` [02 Today & Daily Life] 照片/视频绑定事件
- `PLI-035` [03 Care Network] 邀请家庭成员
- `PLI-036` [03 Care Network] 家庭角色模板
- `PLI-037` [03 Care Network] 照护交接模式
- `PLI-038` [03 Care Network] 自动生成Care Card
- `PLI-046` [03 Care Network] 谁看过/改过什么
- `PLI-049` [04 Health] 发现异常入口
- `PLI-050` [04 Health] 动态追问
- `PLI-051` [04 Health] 图片/视频/音频证据
- `PLI-052` [04 Health] 可观察事实提取
- `PLI-053` [04 Health] 红旗安全引擎
- `PLI-054` [04 Health] 风险分级
- `PLI-055` [04 Health] 就诊前摘要
- `PLI-056` [04 Health] 分享链接/PDF
- `PLI-059` [04 Health] 用药计划
- `PLI-060` [04 Health] 给药记录与遗漏提醒
- `PLI-063` [04 Health] 结局采集
- `PLI-069` [05 Behavior] 行为事件快速记录
- `PLI-185` [14 Life Timeline & Archive] 统一生命时间线
- `PLI-186` [14 Life Timeline & Archive] 事件过滤与视图
- `PLI-204` [15 Pet Agent & Search] 医疗动作硬边界
- `PLI-211` [16 Platform, Data & Safety] Canonical Pet Life Event Schema
- `PLI-212` [16 Platform, Data & Safety] 来源等级
- `PLI-213` [16 Platform, Data & Safety] 记录不可静默覆盖
- `PLI-214` [16 Platform, Data & Safety] 模型/规则版本追踪
- `PLI-215` [16 Platform, Data & Safety] 细粒度同意中心
- `PLI-216` [16 Platform, Data & Safety] 删除与保留策略
- `PLI-217` [16 Platform, Data & Safety] 登录与设备安全
- `PLI-219` [16 Platform, Data & Safety] 统一通知中心
- `PLI-221` [16 Platform, Data & Safety] 事件幂等与重复检测
- `PLI-227` [16 Platform, Data & Safety] AI离线评测框架

终点：
`PLI_V0_1_RELEASE_CANDIDATE_READY`
或诚实的 BLOCKED/NOT_READY。

---

# Stage B — v0.2 / 48 P1

## 核心目标

在 v0.1 事件、权限和安全底座上增加：
- 更成熟的 Identity / Pet ID
- 行为与训练个体化
- Personal Pet Search / RAG
- 轻量 Baseline
- Care Network 深化
- Pet Friend Graph 的安全初版
- 更多 Health follow-up
- 更完整的通知与报告

## 执行要求

- 每个 Feature 仍按 Feature ID 建 issue/commit。
- 不能绕开 canonical event。
- 新 AI 能力必须补 eval。
- Social 匹配不得输出“科学确定兼容度”。
- Behavior 不得自动诊断心理/医学疾病。
- Training 默认 reward-based；禁止危险惩罚式建议。
- Personal Search 必须附事件证据，不可凭空生成历史。

v0.2 功能：
- `PLI-004` [01 Identity & Permissions] 芯片号记录与验证
- `PLI-005` [01 Identity & Permissions] QR/NFC Care Card
- `PLI-013` [01 Identity & Permissions] 宠物状态生命周期
- `PLI-024` [02 Today & Daily Life] 睡眠/休息记录
- `PLI-029` [02 Today & Daily Life] 个体日常基线
- `PLI-031` [02 Today & Daily Life] 自由文本/语音日记
- `PLI-033` [02 Today & Daily Life] 每日AI摘要
- `PLI-039` [03 Care Network] 交接确认清单
- `PLI-040` [03 Care Network] 照护期日报
- `PLI-041` [03 Care Network] 照护结束总结
- `PLI-042` [03 Care Network] 任务责任矩阵
- `PLI-047` [03 Care Network] 按角色通知
- `PLI-057` [04 Health] 病历/处方/检验导入
- `PLI-058` [04 Health] 医疗结构化与来源分级
- `PLI-061` [04 Health] 恢复计划
- `PLI-062` [04 Health] 症状趋势复盘
- `PLI-064` [04 Health] 疫苗/驱虫/体检提醒
- `PLI-070` [05 Behavior] 前因-行为-后果结构
- `PLI-071` [05 Behavior] 行为视频绑定
- `PLI-073` [05 Behavior] 触发因素图谱
- `PLI-074` [05 Behavior] 行为模式与趋势
- `PLI-075` [05 Behavior] 吠叫/抓挠/破坏等事件模板
- `PLI-079` [05 Behavior] 偏好与厌恶档案
- `PLI-080` [05 Behavior] 环境上下文记录
- `PLI-084` [05 Behavior] 行为建议安全过滤
- `PLI-085` [06 Training] 训练目标创建
- `PLI-086` [06 Training] 目标分解
- `PLI-087` [06 Training] 训练会话记录
- `PLI-088` [06 Training] 技能掌握度
- `PLI-091` [06 Training] 奖励偏好库
- `PLI-092` [06 Training] 训练工具
- `PLI-100` [07 Welfare] 丰富化活动库
- `PLI-111` [08 Social & Pet Friends] 社交偏好档案
- `PLI-112` [08 Social & Pet Friends] 宠物好友关系
- `PLI-113` [08 Social & Pet Friends] 互动事件记录
- `PLI-163` [12 Nutrition & Commerce] 饮食档案
- `PLI-175` [13 Finance & Insurance] 养宠费用账本
- `PLI-187` [14 Life Timeline & Archive] 里程碑
- `PLI-188` [14 Life Timeline & Archive] 照片/视频/声音回忆
- `PLI-190` [14 Life Timeline & Archive] 时间线语义搜索
- `PLI-197` [15 Pet Agent & Search] 宠物个人问答
- `PLI-198` [15 Pet Agent & Search] 跨域语义搜索
- `PLI-199` [15 Pet Agent & Search] 为什么发生提示
- `PLI-200` [15 Pet Agent & Search] 低风险任务计划
- `PLI-205` [15 Pet Agent & Search] 结构化长期记忆
- `PLI-223` [16 Platform, Data & Safety] 专业内容版本管理
- `PLI-225` [16 Platform, Data & Safety] 隐私保护产品分析
- `PLI-228` [16 Platform, Data & Safety] 生产监控与事故响应

v0.2 Gate：
- v0.1 regression 全 PASS
- Training / Behavior 端到端
- Pet Search 有证据引用
- Baseline 至少有 deterministic 算法和测试
- Social privacy / block / report
- 无跨 Pet 泄漏
- AI hallucination / provenance eval

终点：
`PLI_V0_2_RELEASE_CANDIDATE_READY`

---

# Stage C — v1.0 / 88 P2

## 核心目标

把产品从家庭工具推进为跨域平台，但仍坚持“中立数据层”：

- Device abstraction
- Smart Home event adapters
- Welfare evidence
- Care Services
- Social graph 深化
- Training 深化
- Nutrition / Commerce constraints
- Finance / Insurance record layer
- 更完整 Agent
- Provider/professional interfaces
- export / portability
- admin / moderation / audit

## 外部集成原则

如果没有真实 API：
- 实现 adapter interface
- 提供 fake/sandbox provider
- contract test
- mock webhook
- feature flag off by default
- 写清 `EXTERNAL_INTEGRATION_BLOCKED`

禁止：
- 伪造 PETKIT / Tractive / 保险 / 医院真实连接
- 用手写假数据声称“真实集成成功”
- 自动支付/真实下单

v1.0 功能：
- `PLI-006` [01 Identity & Permissions] 身份去重与合并
- `PLI-009` [01 Identity & Permissions] 所有权转移流程
- `PLI-012` [01 Identity & Permissions] 字段级隐私控制
- `PLI-015` [01 Identity & Permissions] 宠物资料导出包
- `PLI-030` [02 Today & Daily Life] 异常日提示
- `PLI-034` [02 Today & Daily Life] 轻量连续照护反馈
- `PLI-043` [03 Care Network] 逾期升级提醒
- `PLI-044` [03 Care Network] 兽医/训练师/美容师关系
- `PLI-045` [03 Care Network] 专业记录签名来源
- `PLI-048` [03 Care Network] 紧急授权模式
- `PLI-065` [04 Health] 慢病模式
- `PLI-066` [04 Health] 老龄宠物基线
- `PLI-067` [04 Health] 标准术语映射
- `PLI-072` [05 Behavior] 可观察行为抽取
- `PLI-076` [05 Behavior] 回避/恐惧事件记录
- `PLI-077` [05 Behavior] 攻击相关安全记录
- `PLI-078` [05 Behavior] 独处行为档案
- `PLI-081` [05 Behavior] 行为咨询包
- `PLI-082` [05 Behavior] 行为干预计划记录
- `PLI-083` [05 Behavior] 行为干预结果
- `PLI-089` [06 Training] 环境泛化矩阵
- `PLI-090` [06 Training] 下一步训练建议
- `PLI-093` [06 Training] 家庭训练一致性
- `PLI-094` [06 Training] 训练师协作
- `PLI-095` [06 Training] 动作/会话视频复盘
- `PLI-096` [06 Training] 训练强度与健康约束
- `PLI-097` [06 Training] 标准课程模板
- `PLI-098` [06 Training] 训练成果证明
- `PLI-099` [07 Welfare] 五域福利档案
- `PLI-101` [07 Welfare] 个性化丰富化计划
- `PLI-102` [07 Welfare] 选择与退出记录
- `PLI-103` [07 Welfare] 环境负荷记录
- `PLI-104` [07 Welfare] 压力恢复时间
- `PLI-105` [07 Welfare] 低刺激风险提示
- `PLI-106` [07 Welfare] 老年生活质量问卷
- `PLI-108` [07 Welfare] 福利证据解释
- `PLI-114` [08 Social & Pet Friends] 互动后双向反馈
- `PLI-115` [08 Social & Pet Friends] 经验型好友匹配
- `PLI-116` [08 Social & Pet Friends] 社交安全筛选
- `PLI-117` [08 Social & Pet Friends] 社交基线
- `PLI-119` [08 Social & Pet Friends] 熟悉人关系
- `PLI-122` [08 Social & Pet Friends] 社交可见性控制
- `PLI-125` [09 Devices & Home Intelligence] 设备账户连接
- `PLI-126` [09 Devices & Home Intelligence] 设备与宠物绑定
- `PLI-127` [09 Devices & Home Intelligence] 统一事件转换
- `PLI-128` [09 Devices & Home Intelligence] 多宠个体归属
- `PLI-129` [09 Devices & Home Intelligence] 设备数据质量检测
- `PLI-130` [09 Devices & Home Intelligence] 家庭摄像头事件
- `PLI-131` [09 Devices & Home Intelligence] AI事件审核队列
- `PLI-132` [09 Devices & Home Intelligence] 家庭状态摘要
- `PLI-134` [09 Devices & Home Intelligence] 安全自动化规则
- `PLI-135` [09 Devices & Home Intelligence] 高风险动作需确认
- `PLI-139` [10 Care Services] 服务需求画像
- `PLI-140` [10 Care Services] 服务Care Card
- `PLI-141` [10 Care Services] 服务者匹配
- `PLI-142` [10 Care Services] 服务请求与预约
- `PLI-143` [10 Care Services] 服务前交接清单
- `PLI-144` [10 Care Services] 服务期间更新
- `PLI-145` [10 Care Services] 异常升级流程
- `PLI-146` [10 Care Services] 服务结束总结
- `PLI-148` [10 Care Services] 评价拆分
- `PLI-149` [10 Care Services] 服务者资质/身份
- `PLI-151` [10 Care Services] 专业服务记录回流
- `PLI-164` [12 Nutrition & Commerce] 食品实际使用
- `PLI-165` [12 Nutrition & Commerce] 能量/份量辅助
- `PLI-166` [12 Nutrition & Commerce] 商品约束过滤
- `PLI-167` [12 Nutrition & Commerce] 食品/用品使用结果
- `PLI-168` [12 Nutrition & Commerce] 玩具/丰富化偏好学习
- `PLI-172` [12 Nutrition & Commerce] 营养师/兽医计划
- `PLI-176` [13 Finance & Insurance] 家庭费用分摊
- `PLI-177` [13 Finance & Insurance] 年度预算与趋势
- `PLI-179` [13 Finance & Insurance] 保单档案
- `PLI-180` [13 Finance & Insurance] 理赔材料整理
- `PLI-181` [13 Finance & Insurance] 理赔状态跟踪
- `PLI-184` [13 Finance & Insurance] 费用/理赔导出
- `PLI-189` [14 Life Timeline & Archive] 年度回顾
- `PLI-191` [14 Life Timeline & Archive] 跨时期对比
- `PLI-201` [15 Pet Agent & Search] 跨域照护编排
- `PLI-202` [15 Pet Agent & Search] 预约类动作确认
- `PLI-206` [15 Pet Agent & Search] 事件驱动主动提醒
- `PLI-207` [15 Pet Agent & Search] 提醒降噪与合并
- `PLI-209` [15 Pet Agent & Search] Agent行动日志
- `PLI-210` [15 Pet Agent & Search] 沟通风格与复杂度
- `PLI-218` [16 Platform, Data & Safety] 有害内容安全
- `PLI-220` [16 Platform, Data & Safety] 核心Care Card离线可用
- `PLI-222` [16 Platform, Data & Safety] 跨来源宠物归一
- `PLI-224` [16 Platform, Data & Safety] 产品实验框架
- `PLI-226` [16 Platform, Data & Safety] 数据质量评分

v1.0 Gate：
- v0.1 + v0.2 regression
- provider adapter contract tests
- device event dedup / attribution
- social moderation
- welfare 不输出伪情绪真相
- commerce 与 medical recommendation 隔离
- finance 不执行未授权支付
- Agent action policy tests
- migration from v0.2 data
- full backup/restore drill
- local production-like compose / staging smoke

终点：
`PLI_V1_0_RELEASE_CANDIDATE_READY`
或诚实 BLOCKED。

---

# Stage D — Future / 42

Future 不是今晚“强行上线”的范围。

允许继续开发：
- 领养/救助模型与 workflow
- 高级 Life Archive
- Senior / Healthspan research
- 多组学接口
- 复杂服务生态
- 高级 Agent
- Research export

但必须满足：
- 不把研究能力宣传成临床已验证能力
- 不把模拟接口冒充真实合作
- 不创建无 Outcome 的 Digital Twin 宣传页来充数
- 任何生物医学预测都必须有独立 eval / validation design

Future 功能：
- `PLI-007` [01 Identity & Permissions] 生物特征辅助识别
- `PLI-068` [04 Health] 真实世界证据队列
- `PLI-107` [07 Welfare] 临终照护趋势视图
- `PLI-109` [07 Welfare] 多宠资源冲突
- `PLI-110` [07 Welfare] 福利咨询摘要
- `PLI-118` [08 Social & Pet Friends] 社交异常变化提醒
- `PLI-120` [08 Social & Pet Friends] 健康/照护同类群组
- `PLI-121` [08 Social & Pet Friends] 训练/成长小组
- `PLI-123` [08 Social & Pet Friends] 举报与安全治理
- `PLI-124` [08 Social & Pet Friends] 好友共同回忆
- `PLI-133` [09 Devices & Home Intelligence] 跨设备冲突解释
- `PLI-136` [09 Devices & Home Intelligence] 环境传感器
- `PLI-137` [09 Devices & Home Intelligence] 设备变更版本化
- `PLI-138` [09 Devices & Home Intelligence] 设备开发者接口
- `PLI-147` [10 Care Services] 服务偏好学习
- `PLI-150` [10 Care Services] 服务支付状态
- `PLI-152` [10 Care Services] 纠纷与事故记录
- `PLI-153` [11 Adoption & Rescue] 救助/收容档案导入
- `PLI-154` [11 Adoption & Rescue] 寄养观察记录
- `PLI-155` [11 Adoption & Rescue] 领养家庭画像
- `PLI-156` [11 Adoption & Rescue] 解释型领养匹配
- `PLI-157` [11 Adoption & Rescue] 见面/试养记录
- `PLI-158` [11 Adoption & Rescue] 领养后身份转移
- `PLI-159` [11 Adoption & Rescue] 30/90/180天适应跟踪
- `PLI-160` [11 Adoption & Rescue] 领养后支持计划
- `PLI-161` [11 Adoption & Rescue] 稳定/退养Outcome
- `PLI-162` [11 Adoption & Rescue] 机构端批量管理
- `PLI-169` [12 Nutrition & Commerce] 个性化商品推荐
- `PLI-170` [12 Nutrition & Commerce] 消耗品补货预测
- `PLI-171` [12 Nutrition & Commerce] 商品召回/风险通知
- `PLI-173` [12 Nutrition & Commerce] 推荐理由与商业披露
- `PLI-174` [12 Nutrition & Commerce] Pet Consumption Graph
- `PLI-178` [13 Finance & Insurance] 未来支出预测
- `PLI-182` [13 Finance & Insurance] 权益提醒
- `PLI-183` [13 Finance & Insurance] 支付授权边界
- `PLI-192` [14 Life Timeline & Archive] Life Archive
- `PLI-193` [14 Life Timeline & Archive] 纪念模式
- `PLI-194` [14 Life Timeline & Archive] 生命故事生成
- `PLI-195` [14 Life Timeline & Archive] 共同回忆授权
- `PLI-196` [14 Life Timeline & Archive] 长期档案导出
- `PLI-203` [15 Pet Agent & Search] 购买类动作确认
- `PLI-208` [15 Pet Agent & Search] 领域代理路由

---

# 全量最终审计

生成：
`FULL_PRODUCT_AUDIT.md`

至少包含：

1. 228 Feature 状态逐项：
   - DONE
   - PARTIAL
   - BLOCKED_EXTERNAL
   - BLOCKED_SAFETY
   - NOT_STARTED

2. 每阶段：
   - commit
   - migration
   - tests
   - E2E
   - screenshot/demo evidence（可选辅助）
   - blockers

3. 不得把 interface-only 的外部能力标 DONE。

4. 最终终点只能是：
   - `PLI_V1_0_RELEASE_CANDIDATE_READY_WITH_FUTURE_BACKLOG`
   - `PLI_V1_0_IMPLEMENTATION_COMPLETE_EXTERNAL_BLOCKERS`
   - `PLI_FULL_PRODUCT_NOT_RELEASE_READY`

## Agent 连续执行规则

只要不是以下情况，就继续自行处理，不要停下来问用户：
- 需要真实付费凭据；
- 需要不可逆生产操作；
- 需要用户法律/商业授权；
- 需求存在安全冲突且无法由现有文档裁决。

普通依赖错误、测试失败、类型错误、migration失败、端口冲突、路径错误、包版本冲突，都属于 Agent 应自行修复的工程任务。
