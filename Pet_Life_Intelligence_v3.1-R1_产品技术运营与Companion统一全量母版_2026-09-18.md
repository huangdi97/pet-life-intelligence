**Pet Life Intelligence v3.1-R1**

**宠物生命智能平台 · 产品技术运营与 Companion 统一全量母版**

*Product · UX · Data · AI/Agent · Backend · Safety · Companion · Pilot · Validation · Roadmap*

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>文档定位<br />
本文件是 Pet Life Intelligence 当前完整上位设计母版（v3.1-R1）。它以 v3.0 为基线，完整保留 228 项 Feature Inventory、16 域、三角 MVP、健康/行为/照护/服务/设备/商业、数据库、API、AI/Agent、权限、安全、测试与 CI/CD 设计，并进一步整合 Stage F 真实公网验证、Stage G 真实 Pilot 运营体系，以及“远程监控 / 异地陪伴 / PLI Companion”候选设计。后续真实代码、数据库迁移、API 契约、测试报告、公网运行事实、真实用户/兽医/训练师反馈和 Outcome 仍高于本文件文字。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th>边界声明<br />
本项目与“宠物场所准入 / 宠物避雷 / 地图”完全独立。本母版不设计宠物友好地点、场所准入规则、禁宠地图或避雷路线。PLI Companion 仅讨论宠物自身的远程观察、陪伴、设备互动、福利保护和家庭/服务场景，不引入地点准入地图。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>v3.1-R1 关键修订<br />
</strong>1）纳入 Stage F 真实公网 Staging、远程 Auth / Safety / Storage / Privacy / Pilot / Backup / Playwright 证据；2）新增 Stage G 真实 Pilot 运营与产品验证框架；3）将“监控”明确为持续感知、个体基线、异常变化与数据质量体系；4）新增 PLI Companion（Remote Presence &amp; Interaction）候选层；5）明确宠物认知约束：不要求宠物理解 UI / 视频通话 / 抽象意图；6）新增 Interaction Welfare Guard、家庭摄像隐私、远程互动安全与实时设备架构；7）228 项 Feature Inventory 继续保持 canonical index，Companion 暂不自动扩编为 PLI-229+，需经 Stage G 真实证据后晋升。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **当前状态快照（2026-09-18）** | **证据/说明**                                                                  |
|--------------------------------|--------------------------------------------------------------------------------|
| Public Staging                 | 真实公网可用；远程 smoke 20/20 PASS                                            |
| Remote Auth                    | 15/15 PASS；Argon2id + rotating refresh token + reuse detection                |
| Medical Safety                 | 9/9 PASS                                                                       |
| Remote Storage                 | 9/9 PASS                                                                       |
| Remote Privacy                 | 8/8 + 7/7 ALL-PASS                                                             |
| Remote Pilot                   | 8/8 + 9/9 ALL-PASS                                                             |
| Backup / Restore               | 10/10；73 表 backup→restore→counts→恢复库 API smoke                            |
| Remote Browser E2E             | Playwright 12/12 PASS                                                          |
| Real AI                        | Provider architecture ready；若 /ai/status real:false，则仍为 EXTERNAL_BLOCKED |
| Production                     | CONFIG_READY；独立生产域名/DNS/正式地址仍以真实外部条件为准                    |
| Feature Policy                 | FEATURE FREEZE；下一阶段为 REAL PILOT OPERATIONS                               |

# 0. 文档治理、权威顺序与使用方式

| **层级**                 | **权威性** | **说明**                                                                                            |
|--------------------------|------------|-----------------------------------------------------------------------------------------------------|
| L0 运行事实              | 最高       | 真实生产/测试环境、数据库、日志、模型输出、监控、用户/兽医实际使用结果。                            |
| L1 代码与契约            | 很高       | Git仓库、schema migration、API schema、Feature Flag、测试与CI结果。                                 |
| L2 配套Feature Inventory | 高         | Pet_Life_Intelligence_v2.0_Feature_Inventory_228.xlsx：Feature ID、阶段、评分和功能清单的单一索引。 |
| L3 本母版                | 上位设计   | 解释产品定位、系统边界、架构、页面、数据、AI、安全、测试和路线。                                    |
| L4 早期研究稿            | 参考       | v1.0/v1.1/v1.2研究文档仅作为来源与论证，不再作为执行主线。                                          |

版本规则：任何功能范围变化都必须能回溯到 Feature ID；任何高风险能力变化必须同时更新安全规则、测试集和审计字段；任何数据字段变更必须通过版本化 schema/migration，而不是只改前端。本版新增的 PLI Companion 属于“候选横向能力层”，在 Stage G Feature Freeze 期间不直接扩充 228 Feature Inventory；只有在真实 Pilot 证明高频需求、福利可控、设备/隐私边界可落地后，才进入下一版正式 Feature ID 分配。

## 0.1 v3.1-R1 的新增治理规则

- L0 运行事实新增“真实 Pilot 行为、专业反馈、真实 Outcome、线上故障与监控”作为最高事实来源。

- Stage G 期间 FEATURE_FREEZE=true；只允许安全、隐私、可靠性、Pilot-blocking Bug、关键测量缺口和关键 UX 死路修复。

- 任何新增能力先进入 Discovery / Candidate，而不是直接进入 228 canonical Feature Inventory。

- Companion / Remote Presence 的设计必须同时满足动物福利、家庭隐私、设备安全、宠物认知负担和真实需求验证五个 Gate。

- 没有真实用户数据时，Retention、Vet Usefulness、Companion 需求强度、Outcome Closure 等必须标 NOT_YET_OBSERVED。

# 目录

- 1\. 执行摘要与最终产品定义

- 2\. 用户、角色与核心JTBD

- 3\. 生命周期与核心使用场景

- 4\. 研究证据与竞争格局结论

- 5\. 产品对象、16域与七层架构

- 6\. 16个功能域完整设计

- 7\. v0.1三角MVP与50项P0

- 8\. 信息架构、导航与页面设计

- 9\. 核心用户流程与状态机

- 10\. Pet Life Event Graph与数据模型

- 11\. 数据库、存储与互操作设计

- 12\. API、Webhook与外部集成

- 13\. AI/多模态/RAG/规则引擎设计

- 14\. Pet Agent与多Agent编排

- 15\. 权限、隐私、身份与同意模型

- 16\. 健康与高风险安全治理

- 17\. 前端、后端与基础设施技术架构

- 18\. 仓库、模块与编码规范

- 19\. 测试、AI评估与验收Gate

- 20\. 可观测性、分析与实验体系

- 21\. CI/CD、环境与发布策略

- 22\. 商业模式、运营与合作生态

- 23\. 路线图、风险与项目治理

- 24\. 当前工程运行基线与Stage F收口

- 25\. Stage G真实Pilot运营、验证与决策体系

- 26\. PLI Companion：远程存在、陪伴与互动候选层

- 27\. Companion Feature晋升、阶段Gate与vNext策略

- 附录F. Stage F远程证据与当前Blocker

- 附录G. Pilot指标、访谈与周报模板

- 附录H. PLI Companion候选能力矩阵

- 附录I. 新增术语

- 附录A. 228项Feature Inventory

- 附录B. 事件类型与Canonical Schema

- 附录C. API与Agent Tool示例

- 附录D. 术语表

- 附录E. Sources

# 1. 执行摘要与最终产品定义

Pet Life Intelligence（PLI）是围绕“同一只具体宠物”建立的长期数字生命操作层。它不是单一健康App、训练App、宠物社区、设备App或宠物商城；所有能力都以同一 Pet ID、同一条 Pet Timeline、同一套状态模型和关系图谱为中心。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>最终一句话定义<br />
</strong>让宠物一生中的重要事件、照护关系、行为、健康、训练、社交、设备、服务、消费与结果持续回到同一数字身份上，使系统随着时间越来越理解“这一只宠物”。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **问题**     | **冻结结论**                                                                               |
|--------------|--------------------------------------------------------------------------------------------|
| 长期核心资产 | 连续Pet Life Event Graph + Provenance + Outcome + Personal Baseline + Relationship Graph。 |
| 第一增长引擎 | Daily/Care：高频记录和家庭协作。                                                           |
| 第一专业价值 | Behavior/Health：把模糊问题变成结构化证据、行动与结局。                                    |
| 长期入口     | Pet Agent：自然语言搜索、计划和低风险跨域编排。                                            |
| 商业化原则   | 先解决任务，再产生交易；商业推荐不得反向改变健康/安全结论。                                |
| AI原则       | AI负责结构化、检索、解释、异常发现和编排；高风险规则、专业确认和用户授权不能被模型替代。   |

## 1.1 产品目标

- 把一只宠物分散在家庭成员、照片、设备、医院、训练师、服务商和购物记录中的信息统一起来。

- 把“今天发生了什么”沉淀为可查询、可验证、可学习的事件，而不是聊天记录。

- 把家庭共同养宠从“微信群沟通”升级成有责任、权限、任务、交接与结果的协作系统。

- 把行为和健康问题从模糊主观描述转成时间线、证据、上下文和可执行下一步。

- 在不强迫用户使用特定硬件/医院的前提下，逐步连接设备、兽医、服务、营养、保险和其他专业生态。

- 长期建立个体基线、数字生物标志物、健康寿命/老龄模型和真正有Outcome支撑的Pet Digital Twin研究能力。

## 1.2 非目标

| **不做**               | **原因**                                 |
|------------------------|------------------------------------------|
| 宠物地图/场所避雷      | 独立项目，数据与用户任务不同。           |
| 首版公开Feed/泛社区    | 会稀释高频照护与数据连续性。             |
| 首版全国Marketplace    | 服务供给、支付、履约、事故责任过重。     |
| 无证据“宠物情绪翻译”   | 科学泛化与可验证性不足。                 |
| AI自动诊断/改药/处方   | 高风险、责任不可接受。                   |
| 全套自研硬件           | 资本和供应链成本高，优先做跨品牌抽象层。 |
| 一开始做“数字孪生”营销 | 没有纵向Outcome时只是概念包装。          |

## 1.3 设计原则

| **原则**                                  | **含义**                                                         |
|-------------------------------------------|------------------------------------------------------------------|
| Pet-first                                 | 功能按宠物组织，而不是按业务部门组织。                           |
| Event-first                               | 任何重要操作必须形成标准事件；页面不是数据真相。                 |
| Outcome-first                             | 服务/训练/健康/商品都尽量闭环到结果。                            |
| Provenance-first                          | 主人、设备、AI、专业人士、实验室的事实层级必须分开。             |
| Permission-by-design                      | 所有权、照护权、临时授权和专业访问是产品核心，不是后补安全功能。 |
| Observation before inference              | 先保存可观察事实，再做AI推断。                                   |
| Personal baseline before population guess | 有历史时优先与“它自己”比较。                                     |
| Agent prepares, human authorizes          | Agent默认准备动作，高风险行动明确授权。                          |
| Evidence over engagement                  | 不为DAU/交易牺牲健康、安全或数据真实性。                         |

## 1.4 从“Pet Life OS”到“Pet Life Interface”的候选扩展

v3.0 的长期定义仍然成立：PLI 围绕同一 Pet ID、同一 Pet Timeline 和连续 Outcome 构建宠物数字生命操作层。v3.1-R1 增加一个经 Pilot 验证后才可能晋升的方向：除了记录和解释“这只宠物过去发生了什么”，系统还可以在主人不在现场时，以安全、低打扰的方式连接“这只宠物此刻正在发生什么”。因此长期候选定位可表达为 Pet Life Interface：把历史、当前状态、家庭协作、专业协作和远程陪伴连接到同一 Pet ID。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>重要边界<br />
</strong>PLI Companion 不是“宠物版视频通话”。多数宠物并不理解屏幕、按钮或抽象通信意图。产品必须尽量不要求宠物理解系统，而是让系统理解宠物：优先观察、熟悉声音、可预测的环境丰富化和自然行为响应；复杂主动交互仅作为可选训练能力。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. 用户、角色与核心JTBD

| **角色**          | **核心任务**                   | **痛点**                      | **PLI价值**                           |
|-------------------|--------------------------------|-------------------------------|---------------------------------------|
| 主照护人/Owner    | 管理日常、健康、训练和重要决策 | 信息散、容易忘、多人重复/遗漏 | 统一Today/Timeline/任务/授权/Agent。  |
| 共同养宠家人      | 完成喂养、遛狗、清理、给药     | 不知道别人做没做、责任不清    | 共享任务、去重、责任和审计。          |
| 临时照护者/Sitter | 短期安全照护                   | 不了解习惯、药物、禁忌        | 时间限定Care Card和Handoff。          |
| 训练师/行为师     | 理解行为上下文、制定训练       | 家庭记录不连续、训练泛化难    | 行为事件、训练会话、历史与Outcome。   |
| 兽医/诊所         | 快速理解主诉和历史             | 主人描述模糊、材料分散        | Vet Brief、结构化时间线、资料回流。   |
| 美容/门店/寄养    | 提供服务并识别基础异常         | 交接信息不完整、责任边界模糊  | 最小权限Care Card、服务记录/Outcome。 |
| 救助/领养组织     | 维持身份、行为/健康历史        | 换机构/换主人信息断裂         | Portable Pet ID与Transition Record。  |

## 2.1 核心JTBD

| **情境**                   | **用户想做什么**                               | **成功标准**                           |
|----------------------------|------------------------------------------------|----------------------------------------|
| 当我和家人共同照顾宠物时   | 我想知道今天谁做过什么、还有什么没做           | 避免漏做/重复并形成连续记录。          |
| 当宠物突然表现异常时       | 我想快速记录事实、判断紧急程度并整理给专业人士 | 避免恐慌或遗漏关键信息。               |
| 当我训练或处理行为问题时   | 我想知道它在什么条件下成功/失败                | 建立针对这只宠物的训练策略。           |
| 当我要把宠物交给别人照顾时 | 我想安全、最小化地分享必要信息                 | 不用每次重新解释，并在结束后自动撤权。 |
| 当我想回顾过去时           | 我想问“上次发生什么时候/之后怎么样”            | 从真实Timeline获得答案而非凭记忆。     |
| 当我购买/使用服务或产品时  | 我想知道它是否真的适合并产生效果               | 让消费结果反哺个体模型。               |

## 2.2 新增候选JTBD：离家状态确认与远程陪伴

- 当我上班、上学、出差或旅行时，我想确认宠物现在是否安全、在做什么，而不是只看一条模糊的设备告警。

- 当我想念宠物或短暂无聊时，我希望可以进行一次低打扰、短时、可结束的陪伴，而不是无限制骚扰宠物。

- 当宠物在寄养、保姆、医院或其他受控照护环境中时，我希望在授权窗口内了解状态并获得结构化更新。

- 当设备、主人记录和专业记录出现冲突时，我希望系统保留来源并提示确认，而不是自动制造一个“唯一真相”。

# 3. 生命周期与核心使用场景

| **生命周期**      | **主要需求**                           | **重点模块**                                   |
|-------------------|----------------------------------------|------------------------------------------------|
| 进入家庭/领养初期 | 建档、角色、基础健康、适应和日常建立   | Identity、Care、Daily、Behavior、Adoption。    |
| 幼宠/训练期       | 习惯、社交、训练、疫苗/驱虫、成长记录  | Training、Behavior、Health、Social、Timeline。 |
| 成年稳定期        | 高频照护、设备、朋友、服务、消费       | Daily、Devices、Social、Services、Commerce。   |
| 慢病/康复期       | 连续监测、用药、复诊、依从与Outcome    | Health、Devices、Care、Insurance。             |
| 老龄期            | 活动/睡眠/认知/疼痛/生活质量和多人照护 | Healthspan、Welfare、Care Network、Baseline。  |
| 生命末期/离世后   | 生活质量决策、纪念、数据继承/删除      | Welfare、Life Archive、Consent。               |

## 3.1 远程状态与陪伴场景（候选）

| **场景**          | **触发者**      | **核心动作**                     | **系统边界**                                 |
|-------------------|-----------------|----------------------------------|----------------------------------------------|
| 主人离家查看      | Owner           | 打开实时状态/短时视频            | 默认不保存连续录像；访问受权限与审计约束     |
| 主人主动陪伴      | Owner           | 语音、短时视频、低风险丰富化     | Interaction Welfare Guard 控制频率/时长/刺激 |
| 宠物触发互动      | Pet/Device      | 触碰按钮、设备前停留等触发通知   | 仅报告可观察触发，不表述“它想你了”           |
| AI建议互动        | System          | 基于休息结束、活动、历史响应建议 | 只能建议，不推断孤独/抑郁等心理诊断          |
| 寄养/服务远程查看 | Owner + Service | 受控时间窗口查看状态/服务更新    | 服务方授权、最小权限、全审计                 |
| 住院远程陪伴      | Owner + Vet     | 按医院政策进行状态查看或短时互动 | 医院可完全禁用；临床优先                     |
| 家庭共同陪伴      | Multiple Owners | 多人进入同一 Companion Session   | 需防多人重复控制和刺激冲突                   |

# 4. 研究证据与竞争格局结论

本节只保留会影响设计的研究结论，完整来源见附录E。

| **证据/市场方向**                            | **设计结论**                                           | **参考**             |
|----------------------------------------------|--------------------------------------------------------|----------------------|
| AI问诊已拥挤                                 | 不做聊天问诊壳子；做事件采集、证据和Outcome闭环。      | \[1\]\[3\]\[5\]\[6\] |
| 家庭IoT正在进入个体基线                      | 跨设备事件抽象和Personal Baseline是中期核心。          | \[10\]\[11\]         |
| 通用视觉“情绪识别”受背景影响明显             | 不输出伪精确情绪真相；优先可观察行为/疼痛/压力证据。   | \[12\]\[13\]         |
| 影像AI成熟但数据/验证门槛高                  | 首版不自训医学影像模型，优先对接专业产品/医院。        | \[8\]\[9\]           |
| 训练与照护协作需求已被市场验证               | Daily/Care/Training必须比低频健康功能更早构建留存。    | \[75\]\[92\]         |
| 宠物社交存在真实需求但兼容度难凭静态属性预测 | Social采用安全筛选+真实互动反馈学习。                  | \[78\]\[79\]         |
| 犬衰老、微生物组、认知、步态研究快速发展     | 老龄/Healthspan是长期第二主线，不抢占MVP。             | \[36\]-\[49\]        |
| 兽医数据标准化正在推进                       | Canonical Schema + VetSCT/SNOMED mapping从一开始预留。 | \[53\]-\[56\]        |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>战略白区<br />
</strong>大型硬件、医院、保险、零售平台都拥有某一段数据，但“跨品牌、跨医院、跨服务、跨时间、由宠主控制的中立Pet层”仍是最值得争取的位置。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 5. 产品对象、16域与七层架构

| **核心对象**       | **职责**                    | **关键字段示例**                                                           |
|--------------------|-----------------------------|----------------------------------------------------------------------------|
| Pet Identity       | 同一只宠物的长期主键        | pet_id、species、name、birth_date_estimate、lifecycle_state、identifiers。 |
| Pet Timeline       | 所有重要事件按时间组织      | event_id、type、occurred_at、actor、source、artifacts。                    |
| Pet State          | 当前状态与基线              | latest observations、baseline windows、anomalies、confidence。             |
| Relationship Graph | 人与宠物/宠物/组织/设备关系 | relationship_type、valid_from/to、permissions、strength/evidence。         |

| **系统层**                 | **核心职责**                    | **首版状态**           |
|----------------------------|---------------------------------|------------------------|
| 1 Identity & Permissions   | 身份、家庭、角色、授权、审计    | P0                     |
| 2 Event & Timeline Fabric  | Event/Task/Artifact/Outcome统一 | P0                     |
| 3 State & Baseline Engine  | 状态、趋势、变化点、基线        | v0.2逐步               |
| 4 Behavior Learning Engine | ABC、训练、偏好和上下文         | P0记录，v0.2学习       |
| 5 Relationship Graph       | 家庭、专业、好友、设备/服务关系 | P0家庭；其余后续       |
| 6 Service & Commerce Layer | 服务/产品/保险及Outcome         | v1.0+                  |
| 7 Agent Orchestrator       | 搜索、解释、计划、编排          | v0.1健康受限；v0.2扩展 |

## 5.1 16域之上的两个横向能力层

v3.1-R1 不改变既有 16 个业务域，而是在其上明确两个横向层：A）Monitoring & Home Intelligence：由 Devices / Home Intelligence 主承载，但横跨 Daily、Health、Behavior、Welfare 和 Agent；B）PLI Companion：候选层，横跨 Today、Devices、Social、Care、Welfare、Permissions 和 Agent。

| **横向层**                     | **核心问题**                                         | **写入什么**                                            | **不做什么**                             |
|--------------------------------|------------------------------------------------------|---------------------------------------------------------|------------------------------------------|
| Monitoring & Home Intelligence | 宠物当前发生了什么？与自己的历史基线相比有何变化？   | Canonical Event、设备质量、候选事件、确认结果、Baseline | 不把坏设备数据直接解释成疾病             |
| PLI Companion（Candidate）     | 主人不在现场时如何安全地观察、陪伴并形成可验证互动？ | Interaction Session、可观察响应、设备命令、福利停止信号 | 不要求宠物理解“视频通话”；不进行心理读心 |

# 6. 16个功能域完整设计

## 01. 身份与授权

让同一只宠物跨家庭、设备、机构持续存在。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>所有权与照护权分离；生物识别只能辅助；转移与紧急授权可审计。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                       |
|----------|----------|----------------------------------------------------------------------------------------------------|
| v0.1     | 8        | 创建宠物主档、多宠家庭管理、头像与视觉档案、Owner / Co-owner关系、角色权限模型、临时权限与自动到期 |
| v0.2     | 3        | 芯片号记录与验证、QR/NFC Care Card、宠物状态生命周期                                               |
| v1.0     | 4        | 身份去重与合并、所有权转移流程、字段级隐私控制、宠物资料导出包                                     |
| Future   | 1        | 生物特征辅助识别                                                                                   |

| **ID**  | **功能**             | **模块**    | **AI/逻辑**  | **Event**            | **Score** |
|---------|----------------------|-------------|--------------|----------------------|-----------|
| PLI-002 | 多宠家庭管理         | Pet ID      | 无/规则      | PetLinkedToHousehold | 4.47      |
| PLI-001 | 创建宠物主档         | Pet ID      | 无/规则      | PetCreated           | 4.03      |
| PLI-008 | Owner / Co-owner关系 | Ownership   | 无/规则      | RelationshipCreated  | 3.96      |
| PLI-010 | 角色权限模型         | Permissions | 无/规则      | GrantChanged         | 3.96      |
| PLI-005 | QR/NFC Care Card     | Pet ID      | 无/规则      | AccessTokenIssued    | 3.76      |
| PLI-011 | 临时权限与自动到期   | Permissions | 无/规则      | GrantExpired         | 3.61      |
| PLI-003 | 头像与视觉档案       | Pet ID      | 视觉质量检测 | PetMediaAdded        | 3.55      |

域级指标：Pet创建完成率、重复档案率、Grant错误率、权限撤销SLA。

## 02. Today / Daily Life

建立每日高频使用和连续生活事件。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>记录快、冲突可见、设备/人工统一Event。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                         |
|----------|----------|----------------------------------------------------------------------|
| v0.1     | 12       | 今日总览、快速记录入口、喂食记录、饮水记录、排泄记录、散步与户外活动 |
| v0.2     | 4        | 睡眠/休息记录、个体日常基线、自由文本/语音日记、每日AI摘要           |
| v1.0     | 2        | 异常日提示、轻量连续照护反馈                                         |
| Future   | 0        | —                                                                    |

| **ID**  | **功能**       | **模块** | **AI/逻辑**   | **Event**          | **Score** |
|---------|----------------|----------|---------------|--------------------|-----------|
| PLI-017 | 今日总览       | Today    | 无/规则       | DailySummaryViewed | 4.62      |
| PLI-019 | 喂食记录       | Feeding  | 无/规则       | MealEvent          | 4.62      |
| PLI-018 | 快速记录入口   | Today    | 无/规则       | LifeEventCreated   | 4.47      |
| PLI-027 | 完成与责任人   | Tasks    | 无/规则       | CareTaskCompleted  | 4.47      |
| PLI-029 | 个体日常基线   | Routine  | 时间序列/基线 | BaselineUpdated    | 4.39      |
| PLI-026 | 照护任务       | Tasks    | 无/规则       | CareTaskCreated    | 4.27      |
| PLI-025 | 体重与体况趋势 | Weight   | 趋势检测      | WeightObservation  | 4.11      |

域级指标：日/周有效事件天数、Quick Log耗时、重复事件拦截率。

## 03. Care Network

把多人养宠升级为有角色、责任、交接和临时权限的协作。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>最小权限、到期撤销、任务责任可追溯。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                 |
|----------|----------|------------------------------------------------------------------------------|
| v0.1     | 5        | 邀请家庭成员、家庭角色模板、照护交接模式、自动生成Care Card、谁看过/改过什么 |
| v0.2     | 5        | 交接确认清单、照护期日报、照护结束总结、任务责任矩阵、按角色通知             |
| v1.0     | 4        | 逾期升级提醒、兽医/训练师/美容师关系、专业记录签名来源、紧急授权模式         |
| Future   | 0        | —                                                                            |

| **ID**  | **功能**          | **模块**       | **AI/逻辑**   | **Event**               | **Score** |
|---------|-------------------|----------------|---------------|-------------------------|-----------|
| PLI-040 | 照护期日报        | Handoff        | 无/规则       | CareShiftReport         | 4.25      |
| PLI-035 | 邀请家庭成员      | Household      | 无/规则       | CaregiverInvited        | 3.96      |
| PLI-037 | 照护交接模式      | Handoff        | 无/规则       | CareHandoffStarted      | 3.74      |
| PLI-038 | 自动生成Care Card | Handoff        | 摘要/字段选择 | CareCardGenerated       | 3.74      |
| PLI-042 | 任务责任矩阵      | Responsibility | 无/规则       | CareResponsibilitySet   | 3.69      |
| PLI-043 | 逾期升级提醒      | Responsibility | 规则          | CareTaskEscalated       | 3.61      |
| PLI-045 | 专业记录签名来源  | Professionals  | 无/规则       | ProfessionalObservation | 3.59      |

域级指标：多人协作率、交接完成率、临时权限到期成功率。

## 04. Health

把异常变成证据、分诊、专业协作和Outcome。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>Observation first；红旗独立LLM；AI不能自动改药。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                         |
|----------|----------|--------------------------------------------------------------------------------------|
| v0.1     | 11       | 发现异常入口、动态追问、图片/视频/音频证据、可观察事实提取、红旗安全引擎、风险分级   |
| v0.2     | 5        | 病历/处方/检验导入、医疗结构化与来源分级、恢复计划、症状趋势复盘、疫苗/驱虫/体检提醒 |
| v1.0     | 3        | 慢病模式、老龄宠物基线、标准术语映射                                                 |
| Future   | 1        | 真实世界证据队列                                                                     |

| **ID**  | **功能**           | **模块**   | **AI/逻辑**   | **Event**              | **Score** |
|---------|--------------------|------------|---------------|------------------------|-----------|
| PLI-060 | 给药记录与遗漏提醒 | Medication | 规则          | MedicationAdministered | 4.04      |
| PLI-063 | 结局采集           | Outcome    | 无/规则       | HealthOutcome          | 4.04      |
| PLI-062 | 症状趋势复盘       | Recovery   | 趋势分析      | RecoveryObservation    | 4.03      |
| PLI-065 | 慢病模式           | Chronic    | 专病规则/趋势 | ChronicCareEvent       | 3.96      |
| PLI-055 | 就诊前摘要         | Vet Brief  | 结构化摘要    | VetBriefGenerated      | 3.89      |
| PLI-061 | 恢复计划           | Recovery   | 摘要/任务编排 | RecoveryPlanCreated    | 3.89      |
| PLI-066 | 老龄宠物基线       | Senior     | 多模态趋势    | SeniorBaselineUpdated  | 3.88      |

域级指标：健康事件闭环率、红旗漏报、Vet Brief专业评分、Outcome回流率。

## 05. Behavior

把行为变成可观察、可累计、可复盘的数据。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>优先ABC与上下文，避免人格化标签。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                             |
|----------|----------|----------------------------------------------------------------------------------------------------------|
| v0.1     | 1        | 行为事件快速记录                                                                                         |
| v0.2     | 8        | 前因-行为-后果结构、行为视频绑定、触发因素图谱、行为模式与趋势、吠叫/抓挠/破坏等事件模板、偏好与厌恶档案 |
| v1.0     | 7        | 可观察行为抽取、回避/恐惧事件记录、攻击相关安全记录、独处行为档案、行为咨询包、行为干预计划记录          |
| Future   | 0        | —                                                                                                        |

| **ID**  | **功能**           | **模块**       | **AI/逻辑** | **Event**              | **Score** |
|---------|--------------------|----------------|-------------|------------------------|-----------|
| PLI-069 | 行为事件快速记录   | Behavior Event | 无/规则     | BehaviorEvent          | 4.03      |
| PLI-070 | 前因-行为-后果结构 | ABC            | 无/规则     | ABCObservation         | 4.03      |
| PLI-073 | 触发因素图谱       | Triggers       | 关联分析    | BehaviorTriggerUpdated | 4.03      |
| PLI-079 | 偏好与厌恶档案     | Preference     | 偏好学习    | PreferenceUpdated      | 3.82      |
| PLI-083 | 行为干预结果       | Outcome        | 效果分析    | BehaviorOutcome        | 3.81      |
| PLI-074 | 行为模式与趋势     | Patterns       | 趋势分析    | BehaviorTrendUpdated   | 3.75      |
| PLI-078 | 独处行为档案       | Separation     | 视频/音频   | SeparationObservation  | 3.66      |

域级指标：行为事件完整率、上下文字段覆盖、重复触发模式发现率。

## 06. Training

建立个体技能学习和泛化模型。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>记录环境/干扰/奖励/反应，而非只记“完成课程”。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                    |
|----------|----------|-------------------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                               |
| v0.2     | 6        | 训练目标创建、目标分解、训练会话记录、技能掌握度、奖励偏好库、训练工具                          |
| v1.0     | 8        | 环境泛化矩阵、下一步训练建议、家庭训练一致性、训练师协作、动作/会话视频复盘、训练强度与健康约束 |
| Future   | 0        | —                                                                                               |

| **ID**  | **功能**       | **模块**       | **AI/逻辑** | **Event**              | **Score** |
|---------|----------------|----------------|-------------|------------------------|-----------|
| PLI-087 | 训练会话记录   | Session        | 无/规则     | TrainingSession        | 4.18      |
| PLI-088 | 技能掌握度     | Progress       | 统计        | SkillProgressUpdated   | 4.1       |
| PLI-085 | 训练目标创建   | Goals          | 无/规则     | TrainingGoalCreated    | 3.98      |
| PLI-089 | 环境泛化矩阵   | Generalization | 无/规则     | SkillContextUpdated    | 3.88      |
| PLI-090 | 下一步训练建议 | Adaptive       | 个性化计划  | TrainingRecommendation | 3.88      |
| PLI-086 | 目标分解       | Curriculum     | 计划生成    | TrainingPlanCreated    | 3.83      |
| PLI-094 | 训练师协作     | Trainer        | 无/规则     | TrainerPlanShared      | 3.81      |

域级指标：训练会话完成率、技能泛化率、环境分层成功率。

## 07. Welfare

评估生活质量、环境丰富化和恢复，不等同疾病。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>不做开心指数；用证据和趋势。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                               |
|----------|----------|--------------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                          |
| v0.2     | 1        | 丰富化活动库                                                                               |
| v1.0     | 8        | 五域福利档案、个性化丰富化计划、选择与退出记录、环境负荷记录、压力恢复时间、低刺激风险提示 |
| Future   | 3        | 临终照护趋势视图、多宠资源冲突、福利咨询摘要                                               |

| **ID**  | **功能**         | **模块**       | **AI/逻辑** | **Event**                | **Score** |
|---------|------------------|----------------|-------------|--------------------------|-----------|
| PLI-100 | 丰富化活动库     | Enrichment     | 无/规则     | EnrichmentActivityLogged | 3.7       |
| PLI-101 | 个性化丰富化计划 | Enrichment     | 推荐        | EnrichmentPlanCreated    | 3.67      |
| PLI-106 | 老年生活质量问卷 | Senior QoL     | 无/规则     | QualityOfLifeAssessment  | 3.67      |
| PLI-099 | 五域福利档案     | Framework      | 无/规则     | WelfareProfileUpdated    | 3.66      |
| PLI-108 | 福利证据解释     | Explainability | 解释        | ExplanationViewed        | 3.46      |
| PLI-103 | 环境负荷记录     | Environment    | 无/规则     | EnvironmentObservation   | 3.38      |
| PLI-110 | 福利咨询摘要     | Professional   | 摘要        | WelfareBriefGenerated    | 3.31      |

域级指标：数据覆盖度、趋势可解释率、建议完成率；不使用“开心准确率”。

## 08. Social / Pet Friends

建立真实关系图谱和Social Baseline。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>安全筛选+真实互动学习；不做伪精确兼容度。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                       |
|----------|----------|------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                  |
| v0.2     | 3        | 社交偏好档案、宠物好友关系、互动事件记录                                           |
| v1.0     | 6        | 互动后双向反馈、经验型好友匹配、社交安全筛选、社交基线、熟悉人关系、社交可见性控制 |
| Future   | 5        | 社交异常变化提醒、健康/照护同类群组、训练/成长小组、举报与安全治理、好友共同回忆   |

| **ID**  | **功能**       | **模块**    | **AI/逻辑** | **Event**                   | **Score** |
|---------|----------------|-------------|-------------|-----------------------------|-----------|
| PLI-112 | 宠物好友关系   | Graph       | 无/规则     | PetRelationshipCreated      | 3.68      |
| PLI-113 | 互动事件记录   | Interaction | 无/规则     | SocialInteraction           | 3.68      |
| PLI-111 | 社交偏好档案   | Profile     | 无/规则     | SocialProfileUpdated        | 3.53      |
| PLI-114 | 互动后双向反馈 | Feedback    | 无/规则     | InteractionFeedback         | 3.53      |
| PLI-117 | 社交基线       | Baseline    | 趋势分析    | SocialBaselineUpdated       | 3.45      |
| PLI-115 | 经验型好友匹配 | Learning    | 推荐/排序   | FriendRecommendation        | 3.38      |
| PLI-119 | 熟悉人关系     | Human Graph | 无/规则     | HumanPetRelationshipUpdated | 3.38      |

域级指标：真实互动回流率、安全事件率、关系稳定度。

## 09. Devices / Home Intelligence

把第三方硬件转换成统一事件。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>先质量和个体归属，后异常解释。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                               |
|----------|----------|--------------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                          |
| v0.2     | 0        | —                                                                                          |
| v1.0     | 10       | 设备账户连接、设备与宠物绑定、统一事件转换、多宠个体归属、设备数据质量检测、家庭摄像头事件 |
| Future   | 4        | 跨设备冲突解释、环境传感器、设备变更版本化、设备开发者接口                                 |

| **ID**  | **功能**         | **模块**      | **AI/逻辑**   | **Event**             | **Score** |
|---------|------------------|---------------|---------------|-----------------------|-----------|
| PLI-132 | 家庭状态摘要     | Home Agent    | 摘要/异常检测 | HomeSummaryGenerated  | 4.47      |
| PLI-127 | 统一事件转换     | Normalization | 无/规则       | DeviceEventNormalized | 4.46      |
| PLI-131 | AI事件审核队列   | Review        | 无/规则       | EventReviewed         | 4.25      |
| PLI-129 | 设备数据质量检测 | Quality       | 异常检测      | DeviceQualityIssue    | 4.17      |
| PLI-128 | 多宠个体归属     | Identity      | 身份归因      | EventAttribution      | 4.1       |
| PLI-125 | 设备账户连接     | Device Hub    | 无/规则       | DeviceConnected       | 3.95      |
| PLI-130 | 家庭摄像头事件   | Camera        | CV/音频       | CameraCandidateEvent  | 3.82      |

域级指标：绑定成功率、数据新鲜度、归属准确率、重复事件率。

## 09A. Monitoring / Home Intelligence 横向细化

现有 PLI-125~PLI-135 已覆盖设备账户连接、设备-宠物绑定、统一事件转换、多宠归属、设备质量检测、家庭摄像头候选事件、AI 审核队列、家庭状态摘要、安全自动化和高风险动作确认。v3.1-R1 将其明确为完整的“持续感知→质量控制→候选事件→主人确认→Canonical Event→个体基线→跨域变化信号”链路。

| **层**        | **输入**                                     | **处理**                             | **输出**                                |
|---------------|----------------------------------------------|--------------------------------------|-----------------------------------------|
| Device/Camera | 摄像头、喂食器、饮水机、猫砂盆、项圈、体重秤 | Adapter + Device Capability Registry | 原始设备事件                            |
| Quality       | 断连、遮挡、漂移、缺测、多宠混淆             | 质量检测 / Attribution confidence    | DeviceQualityIssue                      |
| Candidate     | 叫声、进食、呕吐、排泄、玩耍、活动等         | CV/Audio/Rule/AI                     | CameraCandidateEvent                    |
| Review        | 主人确认/纠正                                | Human-in-the-loop                    | EventReviewed                           |
| Normalization | 多厂商格式                                   | Canonical Event mapping              | Meal/Drink/Litter/Activity/Sleep/...    |
| Baseline      | 连续历史                                     | 个体基线/趋势                        | Personal Baseline                       |
| Signal        | 跨域共变                                     | 异常变化提示                         | Observation / Change Signal，不直接诊断 |

## 09B. PLI Companion（Candidate，不进入当前228执行范围）

PLI Companion 是远程存在、陪伴与互动的候选横向能力层。它不是摄像头 App，也不是宠物版视频通话；其产品目标是让主人在不同地点以低认知负担、低干扰、可审计、可停止的方式进入宠物“此刻的生活”，并把互动结果回写到同一 Pet Timeline。

| **交互层级**        | **宠物需要理解的复杂度** | **代表能力**                      | **默认优先级**             |
|---------------------|--------------------------|-----------------------------------|----------------------------|
| Observe             | 0                        | 实时/近实时查看、状态摘要         | 最高                       |
| Presence            | 极低                     | 熟悉声音、主人短时语音/视频存在   | 高                         |
| Enrichment          | 低/本能反应              | 零食、玩具、简单 cue、环境丰富化  | 中；受福利Guard约束        |
| Learned Interaction | 需要条件学习             | 大按钮/触发区域、固定动作触发互动 | 低；仅适合部分个体且需训练 |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>认知原则<br />
</strong>宠物不是低配人类。产品不得假设宠物理解“主人在屏幕里”“按钮=打电话”“通知=意图”。任何主动互动必须建立在可观察行为、条件学习或简单刺激-反应之上；所有心理状态表述必须降级为可验证行为描述。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 10. Care Services

让寄养/遛狗/训练/美容等服务真正理解这只宠物。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>服务前交接、服务中记录、服务后Outcome。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                          |
|----------|----------|---------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                     |
| v0.2     | 0        | —                                                                                     |
| v1.0     | 11       | 服务需求画像、服务Care Card、服务者匹配、服务请求与预约、服务前交接清单、服务期间更新 |
| Future   | 3        | 服务偏好学习、服务支付状态、纠纷与事故记录                                            |

| **ID**  | **功能**         | **模块**        | **AI/逻辑**   | **Event**                 | **Score** |
|---------|------------------|-----------------|---------------|---------------------------|-----------|
| PLI-144 | 服务期间更新     | During          | 无/规则       | ServiceCareUpdate         | 4.18      |
| PLI-143 | 服务前交接清单   | Pre-service     | 无/规则       | ServiceHandoffCompleted   | 3.96      |
| PLI-146 | 服务结束总结     | After           | 摘要          | ServiceOutcome            | 3.96      |
| PLI-139 | 服务需求画像     | Service Profile | 字段选择/摘要 | ServiceNeedProfile        | 3.89      |
| PLI-151 | 专业服务记录回流 | Professional    | 无/规则       | ProfessionalServiceRecord | 3.89      |
| PLI-141 | 服务者匹配       | Matching        | 排序/匹配     | ServiceRecommendation     | 3.88      |
| PLI-140 | 服务Care Card    | Care Card       | 无/规则       | ServiceCareCardIssued     | 3.82      |

域级指标：Care Card使用率、服务Outcome回流率、事故率、复购率。

## 11. Adoption / Rescue

让宠物在机构/家庭变化时身份和历史不断裂。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>转移要有证据；匹配以稳定Outcome验证。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                 |
|----------|----------|----------------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                            |
| v0.2     | 0        | —                                                                                            |
| v1.0     | 0        | —                                                                                            |
| Future   | 10       | 救助/收容档案导入、寄养观察记录、领养家庭画像、解释型领养匹配、见面/试养记录、领养后身份转移 |

| **ID**  | **功能**            | **模块**     | **AI/逻辑** | **Event**              | **Score** |
|---------|---------------------|--------------|-------------|------------------------|-----------|
| PLI-154 | 寄养观察记录        | Foster       | 无/规则     | FosterObservation      | 3.81      |
| PLI-159 | 30/90/180天适应跟踪 | Transition   | 无/规则     | AdoptionFollowup       | 3.66      |
| PLI-161 | 稳定/退养Outcome    | Outcome      | 无/规则     | AdoptionOutcome        | 3.6       |
| PLI-157 | 见面/试养记录       | Meet         | 无/规则     | AdoptionTrialEvent     | 3.59      |
| PLI-153 | 救助/收容档案导入   | Intake       | 无/规则     | RescueIntake           | 3.44      |
| PLI-156 | 解释型领养匹配      | Matching     | 排序/匹配   | AdoptionRecommendation | 3.44      |
| PLI-162 | 机构端批量管理      | Organization | 无/规则     | OrgWorkflowEvent       | 3.4       |

域级指标：转移档案完整率、30/90/180日随访率、稳定留养率。

## 12. Nutrition / Commerce

从“卖东西”升级成需求—使用—反应—结果。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>健康约束优先商业推荐，合作关系披露。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                       |
|----------|----------|----------------------------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                                  |
| v0.2     | 1        | 饮食档案                                                                                           |
| v1.0     | 6        | 食品实际使用、能量/份量辅助、商品约束过滤、食品/用品使用结果、玩具/丰富化偏好学习、营养师/兽医计划 |
| Future   | 5        | 个性化商品推荐、消耗品补货预测、商品召回/风险通知、推荐理由与商业披露、Pet Consumption Graph       |

| **ID**  | **功能**              | **模块**          | **AI/逻辑** | **Event**               | **Score** |
|---------|-----------------------|-------------------|-------------|-------------------------|-----------|
| PLI-163 | 饮食档案              | Nutrition Profile | 无/规则     | NutritionProfileUpdated | 4.4       |
| PLI-167 | 食品/用品使用结果     | Outcome           | 无/规则     | ProductOutcome          | 4.33      |
| PLI-164 | 食品实际使用          | Food Log          | 无/规则     | ProductUseEvent         | 3.97      |
| PLI-166 | 商品约束过滤          | Compatibility     | 规则        | ProductEligibilityCheck | 3.91      |
| PLI-168 | 玩具/丰富化偏好学习   | Preference        | 偏好学习    | PreferenceUpdated       | 3.89      |
| PLI-174 | Pet Consumption Graph | Graph             | 无/规则     | ConsumptionGraphUpdated | 3.8       |
| PLI-170 | 消耗品补货预测        | Subscriptions     | 预测        | ReorderPrediction       | 3.77      |

域级指标：实际使用回流率、推荐约束命中、商业披露覆盖。

## 13. Finance / Insurance

费用、权益、理赔材料编排。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>不自动支付、不替保险公司作赔付决定。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                      |
|----------|----------|-----------------------------------------------------------------------------------|
| v0.1     | 0        | —                                                                                 |
| v0.2     | 1        | 养宠费用账本                                                                      |
| v1.0     | 6        | 家庭费用分摊、年度预算与趋势、保单档案、理赔材料整理、理赔状态跟踪、费用/理赔导出 |
| Future   | 3        | 未来支出预测、权益提醒、支付授权边界                                              |

| **ID**  | **功能**       | **模块**  | **AI/逻辑** | **Event**             | **Score** |
|---------|----------------|-----------|-------------|-----------------------|-----------|
| PLI-175 | 养宠费用账本   | Ledger    | 无/规则     | ExpenseRecorded       | 3.63      |
| PLI-180 | 理赔材料整理   | Claims    | 文档整理    | ClaimPackageGenerated | 3.6       |
| PLI-177 | 年度预算与趋势 | Budget    | 预测/统计   | BudgetUpdated         | 3.4       |
| PLI-182 | 权益提醒       | Benefits  | 规则        | BenefitReminder       | 3.28      |
| PLI-181 | 理赔状态跟踪   | Claims    | 无/规则     | ClaimStatusUpdated    | 3.26      |
| PLI-176 | 家庭费用分摊   | Split     | 无/规则     | ExpenseSplit          | 3.13      |
| PLI-179 | 保单档案       | Insurance | 无/规则     | InsurancePolicyAdded  | 3.12      |

域级指标：费用覆盖度、理赔包完整率、权益利用率。

## 14. Life Timeline / Archive

长期记忆、成长、年度回顾和纪念。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>不虚构宠物内心；主人控制纪念模式。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                     |
|----------|----------|------------------------------------------------------------------|
| v0.1     | 2        | 统一生命时间线、事件过滤与视图                                   |
| v0.2     | 3        | 里程碑、照片/视频/声音回忆、时间线语义搜索                       |
| v1.0     | 2        | 年度回顾、跨时期对比                                             |
| Future   | 5        | Life Archive、纪念模式、生命故事生成、共同回忆授权、长期档案导出 |

| **ID**  | **功能**           | **模块**   | **AI/逻辑** | **Event**           | **Score** |
|---------|--------------------|------------|-------------|---------------------|-----------|
| PLI-185 | 统一生命时间线     | Timeline   | 无/规则     | TimelineViewed      | 4.32      |
| PLI-190 | 时间线语义搜索     | Search     | RAG/检索    | LifeSearch          | 3.95      |
| PLI-188 | 照片/视频/声音回忆 | Memories   | 无/规则     | MemoryArtifactAdded | 3.88      |
| PLI-186 | 事件过滤与视图     | Timeline   | 无/规则     | TimelineFiltered    | 3.83      |
| PLI-191 | 跨时期对比         | Compare    | 统计        | PeriodCompared      | 3.6       |
| PLI-187 | 里程碑             | Milestones | 无/规则     | MilestoneCreated    | 3.53      |
| PLI-192 | Life Archive       | Archive    | 无/规则     | LifeArchiveUpdated  | 3.44      |

域级指标：Timeline查询率、年度回顾保存率、导出成功率。

## 15. Pet Agent / Search

自然语言进入同一只宠物的真实历史与任务。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>回答必须引用内部事件；高风险动作明确确认。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                    |
|----------|----------|-------------------------------------------------------------------------------------------------|
| v0.1     | 1        | 医疗动作硬边界                                                                                  |
| v0.2     | 5        | 宠物个人问答、跨域语义搜索、为什么发生提示、低风险任务计划、结构化长期记忆                      |
| v1.0     | 6        | 跨域照护编排、预约类动作确认、事件驱动主动提醒、提醒降噪与合并、Agent行动日志、沟通风格与复杂度 |
| Future   | 2        | 购买类动作确认、领域代理路由                                                                    |

| **ID**  | **功能**         | **模块**      | **AI/逻辑** | **Event**            | **Score** |
|---------|------------------|---------------|-------------|----------------------|-----------|
| PLI-206 | 事件驱动主动提醒 | Proactive     | 规则+排序   | ProactiveAlert       | 4.18      |
| PLI-198 | 跨域语义搜索     | Search        | 检索/排序   | SearchQuery          | 4.17      |
| PLI-197 | 宠物个人问答     | Ask           | RAG         | AgentQuery           | 4.1       |
| PLI-205 | 结构化长期记忆   | Memory        | 记忆/RAG    | MemoryFactReferenced | 4.03      |
| PLI-201 | 跨域照护编排     | Orchestration | Agent编排   | WorkflowCreated      | 3.88      |
| PLI-207 | 提醒降噪与合并   | Proactive     | 排序/聚合   | AlertBundled         | 3.69      |
| PLI-200 | 低风险任务计划   | Plan          | 规划        | AgentPlanCreated     | 3.68      |

域级指标：有证据回答率、任务完成率、高风险确认率、幻觉率。

## 16. Platform / Data / Safety

统一数据、版本、安全、可观测和AI评估。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>硬规则<br />
</strong>Provenance、Consent、Audit、Versioning为P0。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **阶段** | **数量** | **代表功能**                                                                                                   |
|----------|----------|----------------------------------------------------------------------------------------------------------------|
| v0.1     | 10       | Canonical Pet Life Event Schema、来源等级、记录不可静默覆盖、模型/规则版本追踪、细粒度同意中心、删除与保留策略 |
| v0.2     | 3        | 专业内容版本管理、隐私保护产品分析、生产监控与事故响应                                                         |
| v1.0     | 5        | 有害内容安全、核心Care Card离线可用、跨来源宠物归一、产品实验框架、数据质量评分                                |
| Future   | 0        | —                                                                                                              |

| **ID**  | **功能**                        | **模块**      | **AI/逻辑** | **Event**              | **Score** |
|---------|---------------------------------|---------------|-------------|------------------------|-----------|
| PLI-211 | Canonical Pet Life Event Schema | Event Graph   | 无/规则     | SchemaEvent            | 4.39      |
| PLI-212 | 来源等级                        | Provenance    | 无/规则     | ProvenanceAttached     | 4.32      |
| PLI-219 | 统一通知中心                    | Notifications | 无/规则     | NotificationCreated    | 4.12      |
| PLI-221 | 事件幂等与重复检测              | Reliability   | 规则/去重   | DuplicateEventDetected | 3.95      |
| PLI-226 | 数据质量评分                    | Quality       | 质量模型    | DataQualityScored      | 3.58      |
| PLI-213 | 记录不可静默覆盖                | Versioning    | 无/规则     | RecordVersioned        | 3.52      |
| PLI-222 | 跨来源宠物归一                  | Identity      | 实体解析    | ExternalIdentityMapped | 3.51      |

域级指标：Event schema合规率、审计完整率、模型/规则版本可追溯率。

# 7. v0.1 三角MVP与50项P0

v0.1不追求覆盖所有域，而是验证“高频日常+家庭协作”“行为/健康专业价值”“长期事件连续性”三件事，同时建立不可后补的数据/权限/安全底座。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>三角MVP<br />
</strong>A. Identity + Timeline：让同一只宠物长期存在；B. Daily + Care：让用户每天有理由使用；C. Behavior + Health：让AI和专业协作产生实际价值。Platform/Data/Safety横跨三角。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 身份与授权

| **ID**  | **功能**             | **模块**    | **AI/逻辑**  | **事件**                | **Done Definition**                                             |
|---------|----------------------|-------------|--------------|-------------------------|-----------------------------------------------------------------|
| PLI-001 | 创建宠物主档         | Pet ID      | 无/规则      | PetCreated              | 主路径完成；权限/重复/失败有状态；写入PetCreated。              |
| PLI-002 | 多宠家庭管理         | Pet ID      | 无/规则      | PetLinkedToHousehold    | 主路径完成；权限/重复/失败有状态；写入PetLinkedToHousehold。    |
| PLI-003 | 头像与视觉档案       | Pet ID      | 视觉质量检测 | PetMediaAdded           | 主路径完成；权限/重复/失败有状态；写入PetMediaAdded。           |
| PLI-008 | Owner / Co-owner关系 | Ownership   | 无/规则      | RelationshipCreated     | 主路径完成；权限/重复/失败有状态；写入RelationshipCreated。     |
| PLI-010 | 角色权限模型         | Permissions | 无/规则      | GrantChanged            | 主路径完成；权限/重复/失败有状态；写入GrantChanged。            |
| PLI-011 | 临时权限与自动到期   | Permissions | 无/规则      | GrantExpired            | 主路径完成；权限/重复/失败有状态；写入GrantExpired。            |
| PLI-014 | 紧急联系人卡         | Emergency   | 无/规则      | EmergencyProfileUpdated | 主路径完成；权限/重复/失败有状态；写入EmergencyProfileUpdated。 |
| PLI-016 | 数据用途与研究同意   | Consent     | 无/规则      | ConsentChanged          | 主路径完成；权限/重复/失败有状态；写入ConsentChanged。          |

## Today / Daily Life

| **ID**  | **功能**          | **模块** | **AI/逻辑**    | **事件**             | **Done Definition**                                          |
|---------|-------------------|----------|----------------|----------------------|--------------------------------------------------------------|
| PLI-017 | 今日总览          | Today    | 无/规则        | DailySummaryViewed   | 主路径完成；权限/重复/失败有状态；写入DailySummaryViewed。   |
| PLI-018 | 快速记录入口      | Today    | 无/规则        | LifeEventCreated     | 主路径完成；权限/重复/失败有状态；写入LifeEventCreated。     |
| PLI-019 | 喂食记录          | Feeding  | 无/规则        | MealEvent            | 主路径完成；权限/重复/失败有状态；写入MealEvent。            |
| PLI-020 | 饮水记录          | Water    | 无/规则        | DrinkEvent           | 主路径完成；权限/重复/失败有状态；写入DrinkEvent。           |
| PLI-021 | 排泄记录          | Toilet   | 可选图像结构化 | EliminationEvent     | 主路径完成；权限/重复/失败有状态；写入EliminationEvent。     |
| PLI-022 | 散步与户外活动    | Walk     | 无/规则        | WalkEvent            | 主路径完成；权限/重复/失败有状态；写入WalkEvent。            |
| PLI-023 | 玩耍与丰富化记录  | Play     | 无/规则        | PlayEvent            | 主路径完成；权限/重复/失败有状态；写入PlayEvent。            |
| PLI-025 | 体重与体况趋势    | Weight   | 趋势检测       | WeightObservation    | 主路径完成；权限/重复/失败有状态；写入WeightObservation。    |
| PLI-026 | 照护任务          | Tasks    | 无/规则        | CareTaskCreated      | 主路径完成；权限/重复/失败有状态；写入CareTaskCreated。      |
| PLI-027 | 完成与责任人      | Tasks    | 无/规则        | CareTaskCompleted    | 主路径完成；权限/重复/失败有状态；写入CareTaskCompleted。    |
| PLI-028 | 重复执行冲突提醒  | Tasks    | 规则/冲突检测  | CareConflictDetected | 主路径完成；权限/重复/失败有状态；写入CareConflictDetected。 |
| PLI-032 | 照片/视频绑定事件 | Media    | 媒体分类/质量  | ArtifactLinked       | 主路径完成；权限/重复/失败有状态；写入ArtifactLinked。       |

## Care Network

| **ID**  | **功能**          | **模块**  | **AI/逻辑**   | **事件**           | **Done Definition**                                        |
|---------|-------------------|-----------|---------------|--------------------|------------------------------------------------------------|
| PLI-035 | 邀请家庭成员      | Household | 无/规则       | CaregiverInvited   | 主路径完成；权限/重复/失败有状态；写入CaregiverInvited。   |
| PLI-036 | 家庭角色模板      | Household | 无/规则       | GrantChanged       | 主路径完成；权限/重复/失败有状态；写入GrantChanged。       |
| PLI-037 | 照护交接模式      | Handoff   | 无/规则       | CareHandoffStarted | 主路径完成；权限/重复/失败有状态；写入CareHandoffStarted。 |
| PLI-038 | 自动生成Care Card | Handoff   | 摘要/字段选择 | CareCardGenerated  | 主路径完成；权限/重复/失败有状态；写入CareCardGenerated。  |
| PLI-046 | 谁看过/改过什么   | Audit     | 无/规则       | AuditEvent         | 主路径完成；权限/重复/失败有状态；写入AuditEvent。         |

## Health

| **ID**  | **功能**           | **模块**     | **AI/逻辑** | **事件**               | **Done Definition**                                            |
|---------|--------------------|--------------|-------------|------------------------|----------------------------------------------------------------|
| PLI-049 | 发现异常入口       | Health Event | 无/规则     | HealthEventOpened      | 主路径完成；权限/重复/失败有状态；写入HealthEventOpened。      |
| PLI-050 | 动态追问           | Health Event | LLM+规则    | ClinicalIntakeStep     | 主路径完成；权限/重复/失败有状态；写入ClinicalIntakeStep。     |
| PLI-051 | 图片/视频/音频证据 | Evidence     | 无/规则     | ClinicalArtifactAdded  | 主路径完成；权限/重复/失败有状态；写入ClinicalArtifactAdded。  |
| PLI-052 | 可观察事实提取     | Evidence     | 多模态抽取  | AIObservation          | 主路径完成；权限/重复/失败有状态；写入AIObservation。          |
| PLI-053 | 红旗安全引擎       | Safety       | 规则引擎    | RedFlagTriggered       | 主路径完成；权限/重复/失败有状态；写入RedFlagTriggered。       |
| PLI-054 | 风险分级           | Triage       | 规则+推理   | TriageAssigned         | 主路径完成；权限/重复/失败有状态；写入TriageAssigned。         |
| PLI-055 | 就诊前摘要         | Vet Brief    | 结构化摘要  | VetBriefGenerated      | 主路径完成；权限/重复/失败有状态；写入VetBriefGenerated。      |
| PLI-056 | 分享链接/PDF       | Vet Brief    | 无/规则     | VetBriefShared         | 主路径完成；权限/重复/失败有状态；写入VetBriefShared。         |
| PLI-059 | 用药计划           | Medication   | 无/规则     | MedicationPlanCreated  | 主路径完成；权限/重复/失败有状态；写入MedicationPlanCreated。  |
| PLI-060 | 给药记录与遗漏提醒 | Medication   | 规则        | MedicationAdministered | 主路径完成；权限/重复/失败有状态；写入MedicationAdministered。 |
| PLI-063 | 结局采集           | Outcome      | 无/规则     | HealthOutcome          | 主路径完成；权限/重复/失败有状态；写入HealthOutcome。          |

## Behavior

| **ID**  | **功能**         | **模块**       | **AI/逻辑** | **事件**      | **Done Definition**                                   |
|---------|------------------|----------------|-------------|---------------|-------------------------------------------------------|
| PLI-069 | 行为事件快速记录 | Behavior Event | 无/规则     | BehaviorEvent | 主路径完成；权限/重复/失败有状态；写入BehaviorEvent。 |

## Life Timeline / Archive

| **ID**  | **功能**       | **模块** | **AI/逻辑** | **事件**         | **Done Definition**                                      |
|---------|----------------|----------|-------------|------------------|----------------------------------------------------------|
| PLI-185 | 统一生命时间线 | Timeline | 无/规则     | TimelineViewed   | 主路径完成；权限/重复/失败有状态；写入TimelineViewed。   |
| PLI-186 | 事件过滤与视图 | Timeline | 无/规则     | TimelineFiltered | 主路径完成；权限/重复/失败有状态；写入TimelineFiltered。 |

## Pet Agent / Search

| **ID**  | **功能**       | **模块** | **AI/逻辑** | **事件**            | **Done Definition**                                         |
|---------|----------------|----------|-------------|---------------------|-------------------------------------------------------------|
| PLI-204 | 医疗动作硬边界 | Actions  | 安全策略    | SafetyPolicyApplied | 主路径完成；权限/重复/失败有状态；写入SafetyPolicyApplied。 |

## Platform / Data / Safety

| **ID**  | **功能**                        | **模块**      | **AI/逻辑** | **事件**               | **Done Definition**                                            |
|---------|---------------------------------|---------------|-------------|------------------------|----------------------------------------------------------------|
| PLI-211 | Canonical Pet Life Event Schema | Event Graph   | 无/规则     | SchemaEvent            | 主路径完成；权限/重复/失败有状态；写入SchemaEvent。            |
| PLI-212 | 来源等级                        | Provenance    | 无/规则     | ProvenanceAttached     | 主路径完成；权限/重复/失败有状态；写入ProvenanceAttached。     |
| PLI-213 | 记录不可静默覆盖                | Versioning    | 无/规则     | RecordVersioned        | 主路径完成；权限/重复/失败有状态；写入RecordVersioned。        |
| PLI-214 | 模型/规则版本追踪               | AI Provenance | 无/规则     | AIInferenceLogged      | 主路径完成；权限/重复/失败有状态；写入AIInferenceLogged。      |
| PLI-215 | 细粒度同意中心                  | Consent       | 无/规则     | ConsentChanged         | 主路径完成；权限/重复/失败有状态；写入ConsentChanged。         |
| PLI-216 | 删除与保留策略                  | Deletion      | 无/规则     | DeletionRequested      | 主路径完成；权限/重复/失败有状态；写入DeletionRequested。      |
| PLI-217 | 登录与设备安全                  | Security      | 无/规则     | SecurityEvent          | 主路径完成；权限/重复/失败有状态；写入SecurityEvent。          |
| PLI-219 | 统一通知中心                    | Notifications | 无/规则     | NotificationCreated    | 主路径完成；权限/重复/失败有状态；写入NotificationCreated。    |
| PLI-221 | 事件幂等与重复检测              | Reliability   | 规则/去重   | DuplicateEventDetected | 主路径完成；权限/重复/失败有状态；写入DuplicateEventDetected。 |
| PLI-227 | AI离线评测框架                  | Evaluation    | 无/规则     | ModelEvaluationRun     | 主路径完成；权限/重复/失败有状态；写入ModelEvaluationRun。     |

# 8. 信息架构、导航与页面设计

## 8.1 v0.1 一级导航

| **入口** | **职责**                                     | **不应该承载**             |
|----------|----------------------------------------------|----------------------------|
| Today    | 今日状态、快速记录、任务、异常入口           | 长列表设置、复杂历史分析。 |
| Timeline | 连续事件、筛选、回顾、证据                   | 编辑所有档案字段。         |
| Pet      | 宠物主档、家庭关系、Care Card、健康/行为摘要 | 商城/广告。                |
| More     | 设置、权限、通知、导出、实验性功能           | 首版主要任务。             |

## 8.2 v0.1 14个核心Surface

| **页面**                | **Primary Job**       | **核心组件**                       | **Event**                       | **Edge Cases**           |
|-------------------------|-----------------------|------------------------------------|---------------------------------|--------------------------|
| Onboarding / Create Pet | 2分钟创建Pet ID和家庭 | 基础档案、头像、家庭、同意         | PetCreated, RelationshipCreated | 重复宠物、年龄未知、多宠 |
| Today                   | 看今天完成/未完成     | 今日卡片、任务、快速记录、异常入口 | Daily events                    | 多人重复、离线           |
| Quick Log               | 10秒记录事件          | 事件模板、时间、数量、Actor、备注  | LifeEventCreated                | 补录、误点、重复         |
| Timeline                | 查看真实历史          | 事件流、筛选、媒体、来源           | TimelineViewed                  | 跨时区、修改历史         |
| Care Network            | 管理共同照护          | 成员、角色、临时权限、审计         | GrantChanged                    | 到期、越权               |
| Tasks                   | 可追责照护任务        | 重复任务、Assignee、完成状态       | CareTask\*                      | 重复喂药、并发           |
| Care Handoff / Card     | 临时照护交接          | 起止时间、最小信息、联系人         | CareHandoff\*                   | 紧急访问、过期           |
| Behavior Event          | 记录具体行为          | 前因/行为/后果、对象、视频         | BehaviorEvent                   | 攻击/伤害、视频隐私      |
| Health Event            | 从异常到行动          | 动态采集、证据、红旗、分级         | HealthEvent\*                   | 急诊、模型不确定         |
| Vet Brief               | 专业前摘要            | 主诉、时间线、证据、药物、既往史   | VetBriefGenerated               | 错误事实、撤销分享       |
| Medication              | 用药计划与执行        | 频次、责任人、完成、提醒           | Medication\*                    | 剂量误录、重复给药       |
| Outcome / Follow-up     | 把事件闭环            | 恢复/未改善/复发/转诊              | HealthOutcome                   | 失访、未确诊             |
| Notifications           | 统一提醒              | 严重度、角色、已读、合并           | NotificationCreated             | 提醒轰炸/急诊优先        |
| Settings / Privacy      | 用户掌控数据          | 同意、导出、删除、会话安全         | ConsentChanged                  | 撤回后的下游数据         |

## 8.3 UI/UX原则

- 默认“宠物上下文”始终清楚：多宠家庭任何页面都显示当前Pet，避免写错对象。

- 重要记录只需1-2步；高级字段可渐进展开。

- 任何AI推断必须能点开“为什么/数据来自哪里/是否专业确认”。

- Health与Safety使用明确状态语言：Monitor / Vet Soon / Urgent / Emergency，避免模糊色彩营销。

- 商业推荐与健康结论视觉上分区，并显示赞助/佣金关系。

- 多人协作时优先显示“谁做过什么”，而不是只显示最终状态。

- 多宠、儿童、老年照护者需考虑大字号、低认知负担和误操作恢复。

## 8.4 Monitoring / Companion 候选入口

不新增第六个一级 Tab。优先在 Today 中以“当前状态卡”承载高频入口，避免 16 域和横向能力把导航变成后台系统。

| **Surface**              | **Primary Job**           | **候选组件**                                            | **关键边界**                           |
|--------------------------|---------------------------|---------------------------------------------------------|----------------------------------------|
| Today 当前状态卡         | 快速知道宠物当前/最近状态 | 在线/离线、最近活动、设备质量、\[看看它\]、\[陪它一下\] | 状态必须注明数据新鲜度和来源           |
| Companion Room           | 一次短时远程陪伴          | Live/Audio、Talk、Treat/Toy（若设备支持）、结束按钮     | 默认短 session；显著显示隐私与设备状态 |
| Interaction History      | 回顾互动结果              | 时长、动作、可观察响应、主人反馈                        | 不显示伪精确“情绪分”                   |
| Device Hub               | 管理设备能力与权限        | 绑定、健康、能力、固件/Provider、隐私模式               | 家庭设备默认最小权限                   |
| Care/Service Remote View | 寄养/照护期间查看         | 时间窗、Service Update、必要 Live                       | 服务方可限制；审计全部访问             |

# 9. 核心用户流程与状态机

## 创建宠物

登录 → 创建Pet → 基础档案 → 家庭 → 同意 → Today

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>允许不确定年龄/品种；重复档案后续合并。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 每日共同照护

Today → 任务/Quick Log → Actor → 冲突检测 → Timeline

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>记录≤10秒；重复喂食/用药可拦截。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 临时照护交接

建立Handoff → 起止时间/角色 → Care Card → 日报 → 结束自动撤权

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>最小权限；到期自动失效。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 行为事件

记录行为 → ABC/对象/环境 → 媒体 → Timeline → 后续训练/专业支持

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>不先贴诊断/人格标签。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 健康事件

异常 → 动态追问 → 原始证据 → AI观察 → 红旗 → Triage → Vet Brief → 就诊回流 → Outcome

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>红旗优先；AI观察和专业结论分层。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 用药

创建/导入计划 → Assignee → 提醒 → 给药 → 去重 → 疗程结束

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>Agent不能自动改剂量。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 未来宠物好友

安全资料 → 建立候选 → 真实互动 → 双方反馈 → Relationship更新

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>关系分数来源于互动证据，不用静态伪精确。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 未来服务

选择需求 → 生成Care Card → 服务记录 → 异常升级 → 服务Outcome

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>关键Gate<br />
</strong>服务商只看到授权必要信息。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 9.1 Remote Presence / Interaction 状态机（Candidate）

远程互动必须被建模为可结束的 Interaction Session，而不是无限制 Camera Stream。

| **触发模式**    | **流程**                                                               | **注意**                             |
|-----------------|------------------------------------------------------------------------|--------------------------------------|
| Owner Initiated | Owner→查看当前状态→选择 Observe/Presence/Enrichment→Session→结束→Event | 最常见；不要求宠物主动理解           |
| Pet Initiated   | 设备可观察触发→通知主人→主人决定是否响应→Session                       | 只报告“触发/停留/触碰”，不写“想你了” |
| AI Suggested    | 跨域状态→Interaction Opportunity→主人确认→Session                      | 建议必须可解释；不做心理诊断         |
| Scheduled       | 主人设置时间窗→设备检查环境/福利状态→提示→主人确认                     | 默认不自动强制互动                   |
| Care/Hospital   | 机构策略+Grant→有限窗口→Remote View/Session→Audit                      | 机构拥有更高安全/隐私控制权          |

# 10. Pet Life Event Graph与数据模型

页面和功能是可变化的，Event Graph才是长期稳定的业务事实层。任何新能力在开发前必须定义：Event、Actor、Pet、Source、Artifact、State Change、Outcome、Permission。

| **实体**     | **关键字段**                                                            | **职责**                             |
|--------------|-------------------------------------------------------------------------|--------------------------------------|
| Pet          | pet_id, species, name, birth_date/estimate, sex, lifecycle_state        | 长期主体。                           |
| Actor        | actor_id, actor_type, role, organization_id                             | 主人、家人、专业人士、设备、系统。   |
| LifeEvent    | event_id, pet_id, type, occurred_at, recorded_at, actor_id, source_type | 统一时间线事实。                     |
| Observation  | observation_id, event_id, code, value, unit, confidence                 | 体重、行为、设备、AI观察等。         |
| Task         | task_id, pet_id, type, due_at, assignee, status, recurrence             | 照护/训练/药物/复诊。                |
| Relationship | from_entity, to_entity, type, valid_from/to, evidence                   | 家庭、朋友、设备、专业关系。         |
| Artifact     | artifact_id, event_id, uri, media_type, sha256, owner, consent_scope    | 照片、视频、病历、报告。             |
| Outcome      | outcome_id, target_event, status, measured_at, evidence                 | 恢复、训练结果、服务适应、产品结果。 |
| Grant        | grant_id, subject, resource_scope, permissions, valid_to                | 访问与临时授权。                     |
| Inference    | inference_id, input_refs, model/rule_version, output, confidence        | AI推断单独保存，不覆盖事实。         |

## 10.1 Event Envelope

{  
"event_id": "evt\_...",  
"pet_id": "pet\_...",  
"type": "meal.recorded",  
"occurred_at": "2026-09-13T07:42:00+08:00",  
"recorded_at": "...",  
"actor": {"id":"usr\_...","role":"family"},  
"source": {"type":"owner_reported","device_id":null},  
"payload": {...},  
"artifacts": \[\],  
"provenance": {"app_version":"...","schema_version":"1.0"},  
"visibility": "household",  
"supersedes_event_id": null  
}

## 10.2 Provenance等级

| **来源**               | **示例**                | **默认可信定位**            |
|------------------------|-------------------------|-----------------------------|
| owner_reported         | 主人描述“抓耳3天”       | 事实陈述但可能主观。        |
| device_derived         | 智能项圈活动/睡眠       | 需设备质量与归属置信度。    |
| AI_inferred            | 视觉提取“可见红肿”      | 推断，必须引用输入和版本。  |
| professional_confirmed | 兽医诊断/训练师专业评估 | 高可信，但仍保留机构/时间。 |
| lab_confirmed          | 实验室结果              | 高可信结构化证据。          |
| system_calculated      | 趋势、统计、任务状态    | 可复算，保留算法版本。      |

## 10.3 Companion候选事件对象

| **Candidate Event**      | **最小字段**                                                        | **说明**                                 |
|--------------------------|---------------------------------------------------------------------|------------------------------------------|
| RemoteInteractionSession | session_id, pet_id, actor_id, device_id, started_at, ended_at, mode | 一次远程互动主对象                       |
| InteractionAction        | session_id, action_type, actor, timestamp, device_command_id        | talk/treat/toy/video/robot 等动作        |
| PetResponseObservation   | session_id, observable_behavior, timestamp, source, confidence      | 只记录转头、靠近、离开、玩耍等可观察行为 |
| InteractionOpportunity   | pet_id, evidence_refs, reason, expires_at                           | 系统建议“适合互动”的可解释证据           |
| PetInitiatedTrigger      | device_id, trigger_type, timestamp, confidence                      | 按钮触发、设备前停留等；不等同主观意图   |
| InteractionWelfareSignal | session_id, signal_type, severity, action                           | 回避、过度刺激、频率过高、零食额度等     |
| InteractionFeedback      | session_id, owner_feedback, optional professional_feedback          | 用于长期个体偏好学习                     |

以上对象在 Stage G 期间仅作为候选 schema 设计，不要求当前生产数据库落地。若进入 vNext，应通过正式 migration、Event Schema version 和 API contract 引入。

# 11. 数据库、存储与互操作设计

## 11.1 推荐存储分层

| **层**     | **推荐**                 | **主要内容**                                              | **原则**                   |
|------------|--------------------------|-----------------------------------------------------------|----------------------------|
| 事务数据库 | PostgreSQL               | Pet、Actor、Event索引、Task、Relationship、Grant、Outcome | 强一致、版本化migration。  |
| 对象存储   | S3兼容/云OSS             | 照片、视频、病历、音频、导出包                            | 加密、hash、生命周期策略。 |
| 缓存/任务  | Redis                    | session、rate limit、短期任务状态                         | 不能作为唯一事实来源。     |
| 向量/检索  | pgvector起步             | Pet历史语义检索、RAG chunk                                | 先简单，量大再独立向量库。 |
| 分析仓/湖  | 后期ClickHouse/warehouse | 事件分析、模型训练导出                                    | 与在线事务隔离。           |

## 11.2 多租户与数据隔离

- Household是主要协作边界，但Pet可跨Household/Organization建立受限关系；不能用household_id替代pet_id。

- 专业机构数据访问通过Grant/Encounter授权，不默认获得全部历史。

- 敏感Artifact（家庭视频、医疗资料）独立权限，不仅依赖父Event。

- 删除策略区分“撤回可见/停止处理”“软删除/恢复期”“不可逆销毁”；审计日志与法定/安全留存单独处理。

## 11.3 互操作与术语

内部使用Canonical Schema，外部通过Adapter映射。兽医术语优先预留VetSCT/SNOMED映射；保留原始文本和本地代码。FHIR可借鉴资源化设计，但不假设当前兽医行业已经形成全球统一FHIR生态。\[53\]-\[56\]

| **Adapter**        | **方向**                     | **首版策略**                      |
|--------------------|------------------------------|-----------------------------------|
| HIS/PIMS           | 病例、诊断、处方、预约       | 先PDF/Share Link；合作后API。     |
| Device             | 喂食、饮水、猫砂、活动、睡眠 | 统一转为Canonical Event。         |
| Insurance          | 保单、理赔材料、状态         | 只做资料包/状态，不替代承保判断。 |
| Nutrition/Commerce | 约束、订单、使用Outcome      | 商业事件和健康事实分层。          |
| Export             | JSON/PDF/ZIP + manifest/hash | 用户可携带和审计。                |

## 11.4 实时媒体与家庭隐私存储策略

- 默认不保存整段家庭连续录像；优先 Live Stream + 事件级短片 + 用户主动保存。

- 实时流和持久化媒体采用不同权限与 retention；Live access 不等于 download access。

- 家庭成员在家、隐私模式、物理遮挡、房间级设备开关应可阻止远程查看。

- 服务方/寄养/医院场景采用时间窗 Grant；过期自动撤权。

- 任何远程查看、麦克风、设备控制动作都必须进入高价值 Audit。

# 12. API、Webhook与外部集成

## 12.1 API风格

- REST/JSON作为v0.1默认；事件写入保持幂等。

- 所有写操作携带request_id/idempotency_key。

- 时间统一存UTC并保留原始时区；前端按用户/事件时区渲染。

- 分页使用cursor；敏感资源返回最小字段；错误码可机器处理。

- API contract通过OpenAPI版本化，禁止只靠前端约定。

| **资源组**     | **代表端点**                                                 | **说明**                |
|----------------|--------------------------------------------------------------|-------------------------|
| Auth/Household | POST /auth/session; GET /households/:id                      | 登录、家庭上下文。      |
| Pets           | POST /pets; GET/PATCH /pets/:id                              | Pet主档。               |
| Events         | POST /pets/:id/events; GET /pets/:id/timeline                | 统一Event写入/读取。    |
| Tasks          | POST /pets/:id/tasks; POST /tasks/:id/complete               | 照护任务。              |
| Care           | POST /pets/:id/handoffs; POST /grants                        | 交接与授权。            |
| Behavior       | POST /pets/:id/behavior-events                               | ABC/行为记录。          |
| Health         | POST /pets/:id/health-events; POST /health-events/:id/triage | 健康事件。              |
| Artifacts      | POST /artifacts/presign; GET /artifacts/:id                  | 上传与受控访问。        |
| Search/Agent   | POST /pets/:id/search; POST /pets/:id/agent                  | 个人历史检索/任务编排。 |
| Audit/Export   | GET /audit; POST /pets/:id/export                            | 审计与数据携带。        |

## 12.2 Webhook

| **事件**            | **用途**              | **要求**                     |
|---------------------|-----------------------|------------------------------|
| event.created       | 设备/外部系统事件接入 | 签名、重放保护、幂等。       |
| grant.revoked       | 立即撤销外部访问      | 高优先级、失败重试。         |
| health.red_flag     | 安全升级              | 内部事件，默认不暴露第三方。 |
| service.completed   | 服务Outcome回流       | 关联service_event_id。       |
| device.disconnected | 数据新鲜度下降        | 不能直接解释为健康异常。     |

## 12.3 Companion / Device 实时接口（候选）

| **接口层**          | **建议技术**                  | **职责**                                        |
|---------------------|-------------------------------|-------------------------------------------------|
| Media Session       | WebRTC / vendor SDK           | 低延迟视频/音频，不作为事实通道                 |
| Control Channel     | WebSocket / MQTT / vendor API | talk/treat/toy/robot 等设备命令                 |
| Device Adapter      | Provider interface            | 统一第三方设备能力与错误语义                    |
| Capability Registry | Server-side registry          | 声明 camera/audio/treat/toy/robot/sensor 等能力 |
| Event API           | Canonical API                 | 只将验证后的互动/观察写入 Timeline              |
| Audit API           | Append-only audit             | 谁何时查看、说话、控制了什么设备                |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>架构原则<br />
</strong>实时媒体不是核心事实通道。即使 WebRTC 断线，Pet Timeline、Care、Health 和安全规则仍应可独立运行。设备命令必须有 idempotency、超时、ack、失败状态和高风险确认策略。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 13. AI / 多模态 / RAG / 规则引擎设计

AI架构必须是“多组件 + 可审计”的，而不是一个通用LLM包办所有决策。

| **组件**               | **职责**                     | **v0.1**                            | **后续**             |
|------------------------|------------------------------|-------------------------------------|----------------------|
| LLM Reasoner           | 追问、摘要、解释、结构化     | 健康动态采集、Vet Brief、文本结构化 | 跨域Agent。          |
| Personal RAG           | 检索这只宠物真实历史         | 仅受限查询/引用                     | v0.2语义Pet Search。 |
| Vision/Audio Extractor | 提取可观察事实/质量          | 健康证据辅助                        | 行为/步态/音频扩展。 |
| Rule Engine            | 红旗、安全、重复给药、权限   | P0核心                              | 持续版本化。         |
| Baseline Engine        | 个体统计与变化点             | 预埋数据                            | v0.2上线。           |
| Recommendation Engine  | 训练/服务/商品排序           | 不做                                | v0.2-v1.0。          |
| Safety Verifier        | 输出检查、风险升级、禁止动作 | P0核心                              | 模型独立验证。       |

## 13.1 RAG数据边界

- Personal RAG只检索当前用户有权限的Pet/Artifact/Event；检索层也必须执行Grant，不依赖生成层“自觉”。

- 临床/知识RAG与个人历史RAG分库/分namespace，答案必须区分“你家宠物历史”与“通用知识”。

- 任何引用医疗知识应保存source_id/version/date；过期知识可以被替换但历史输出仍可审计。

- 不把用户聊天直接当事实；只有显式确认/结构化Event才进入长期Pet Timeline。

## 13.2 模型路由

| **任务**       | **模型/策略**                        | **失败降级**             |
|----------------|--------------------------------------|--------------------------|
| 字段结构化     | 小模型/低成本LLM + schema validation | 规则模板/人工确认。      |
| 健康动态追问   | 高质量LLM + rule constraints         | 固定安全问卷。           |
| 图片可观察事实 | 通用VLM/专用模型（后续）             | 提示用户补拍/无法判断。  |
| 个人历史问答   | RAG + 引用Event ID                   | 返回检索结果，不做推断。 |
| 红旗           | 确定性规则 + Safety verifier         | 直接升级，不依赖LLM。    |
| 摘要           | LLM + evidence grounding             | 模板化摘要。             |

## 13.3 AI输出Schema

{  
"observations": \[{"label":"...","evidence_refs":\["art\_..."\],"confidence":0.0}\],  
"questions": \[...\],  
"risk_level": "monitor\|vet_soon\|urgent\|emergency",  
"rule_hits": \["RF\_..."\],  
"uncertainties": \[...\],  
"recommended_next_actions": \[...\],  
"model_version": "...",  
"knowledge_version": "..."  
}

## 13.4 Companion AI：观察优先，不做“读心”

- 允许：识别可观察行为候选，例如转头、站起、靠近、离开、玩耍、进食、叫声、休息状态。

- 允许：基于历史数据总结某种互动后的可观察响应模式，并显示证据和不确定性。

- 允许：在休息结束、主人长时间离家、设备前出现等事实基础上建议“是否现在互动”。

- 禁止：把单次行为直接翻译为“孤独、想主人、抑郁、开心、爱你”等确定心理结论。

- 禁止：用一个静态“情绪分/智商分/亲密度分”替代真实行为历史。

- 跨域变化只有在活动、食欲、睡眠、社交响应等多域共同变化时，才可提示“值得观察”，仍不直接诊断。

# 14. Pet Agent与多Agent编排

首版不需要“多Agent炫技”。Agent采用单一Orchestrator + 明确Tool Registry；只有当不同专业域出现独立权限/验证/生命周期时，才拆成子Agent。

| **Agent/能力**              | **职责**                          | **工具权限**                   |
|-----------------------------|-----------------------------------|--------------------------------|
| Pet Orchestrator            | 理解用户意图、选择工具、汇总结果  | 只调用当前用户有权工具。       |
| Life Search                 | 检索Pet历史并引用Event            | read-only。                    |
| Care Planner                | 生成日常/交接/旅行照护计划        | 可创建draft task，提交需确认。 |
| Health Intake               | 健康追问、结构化、Vet Brief       | 只能建议/分诊；无处方工具。    |
| Training Planner（v0.2）    | 根据技能历史生成训练计划          | draft plan；高风险训练禁止。   |
| Service Coordinator（v1.0） | 准备服务需求、Care Card、候选排序 | 预约/支付需显式确认。          |

## 14.1 Agent动作分级

| **级别**           | **示例**                             | **默认行为**                                |
|--------------------|--------------------------------------|---------------------------------------------|
| L0 Read            | 查上次腹泻/上次寄养                  | 可直接执行并引用证据。                      |
| L1 Draft           | 起草Care Plan/训练计划               | 可生成草稿。                                |
| L2 Low-risk Write  | 创建普通提醒/日常任务                | 可在用户偏好允许时执行，需可撤销。          |
| L3 External Commit | 预约、下单、发送给第三方             | 执行前确认。                                |
| L4 High-risk       | 付款、改药、所有权转移、紧急照护决定 | 必须显式确认/专业授权；部分动作永不自动化。 |

## 14.2 Agent 在远程互动中的动作权限

| **动作**                | **默认级别** | **规则**                               |
|-------------------------|--------------|----------------------------------------|
| 查看设备状态            | 低           | 受 Household / Device Grant 约束       |
| 建议互动时间            | 低           | 可解释、可关闭、不可推断心理疾病       |
| 开启实时视频/音频       | 中           | 必须用户主动确认；隐私模式可硬阻断     |
| 播放主人语音            | 中           | 音量/频率/时长限制                     |
| 投喂零食                | 高           | 受日额度、冷却、饮食计划和多人去重限制 |
| 控制玩具/机器人         | 高           | 设备安全策略、速度/区域/时长限制       |
| 与医疗/用药相关设备动作 | 极高         | 默认禁止 Agent 自动执行                |

# 15. 权限、隐私、身份与同意模型

RBAC只解决“角色”，ABAC解决“这只宠物/这段时间/这类数据/这个目的”。产品应采用RBAC + ABAC混合。

| **角色**            | **默认范围**        | **可做**                   | **不能默认做**             |
|---------------------|---------------------|----------------------------|----------------------------|
| Owner               | Pet全部             | 管理家庭、授权、导出、转移 | 跳过高风险确认。           |
| Co-owner            | 大部分照护          | 记录、任务、查看多数历史   | 单方转移所有权（可配置）。 |
| Family              | 日常照护            | 记录、任务、有限资料       | 读取全部医疗/敏感视频。    |
| Temporary Caregiver | Handoff时间窗       | Care Card、任务、异常上报  | 时间窗外访问。             |
| Vet/Professional    | Encounter/Grant范围 | 查看授权历史、写专业记录   | 读取无关家庭媒体。         |
| Service Provider    | 服务期间最小信息    | 服务记录/Outcome           | 长期持有完整档案。         |

## 15.1 Consent对象

- 医疗资料访问

- 家庭视频/音频

- AI模型处理

- 数据用于模型改进/研究

- 向第三方服务商共享

- 跨境/云区域

- 公开社交资料

- Life Archive纪念模式

## 15.2 审计要求

至少记录：谁、何时、通过什么设备/会话、访问/修改/导出了什么、基于哪个Grant、动作结果、IP/客户端、重要AI版本。高风险Audit日志只能追加，不允许普通业务管理员直接修改。

## 15.3 家庭摄像头、麦克风与远程陪伴隐私模型

- 家庭摄像头与麦克风属于高敏感家庭环境数据，不得沿用普通设备事件的宽松权限。

- 默认采用显式授权、时间窗、设备级 Grant、家庭成员可见性控制和 append-only Audit。

- 提供 Camera Privacy Mode / Quiet Mode；条件允许时支持物理遮挡或硬件状态可见性。

- Guest / Caregiver 不得因为能查看 Care Card 自动获得家庭实时视频权限。

- 家庭有人在场时，可由家庭策略自动禁用远程视频/麦克风。

- 默认不将连续家庭录像用于模型训练；Pilot Consent 不等于 Research Consent。

# 16. 健康与高风险安全治理

健康是全平台中风险最高的一域，必须采用“产品安全层 + 规则层 + AI层 + 专业协作层”。

| **层**         | **职责**                 | **例子**                                 |
|----------------|--------------------------|------------------------------------------|
| Product UX     | 明确不确定性和行动优先级 | “建议24h内咨询兽医”而不是“90%耳炎”。     |
| Red Flag Rules | 确定性高风险升级         | 呼吸困难、持续抽搐、严重出血、猫无尿等。 |
| AI Intake      | 动态收集/结构化/摘要     | 症状时间、照片、既往史。                 |
| Professional   | 诊断、处方、治疗         | 兽医最终判断。                           |
| Outcome        | 恢复/复发/转诊           | 用于验证产品和模型。                     |

## 16.1 高风险禁止

- 不自动给出具体处方药剂量变更。

- 不把图片模型结果呈现为确定诊断。

- 不因商业合作降低就医紧急度。

- 不把“未发现红旗”等同“没有疾病”。

- 不让Agent在未确认情况下购买药物/支付/取消急诊安排。

## 16.2 临床验证指标

| **指标**              | **说明**                                 |
|-----------------------|------------------------------------------|
| Under-triage          | 真正紧急事件被降级，最高优先级安全指标。 |
| Over-triage           | 过度升级，影响体验和资源。               |
| Red-flag sensitivity  | 规则测试集中的召回。                     |
| Hallucination rate    | 摘要/解释中出现无证据事实的比例。        |
| Evidence completeness | Vet Brief关键字段覆盖。                  |
| Vet usefulness        | 兽医是否认为减少重复询问且不增加风险。   |

## 16.3 Interaction Welfare Guard（候选高风险安全层）

远程互动的安全目标不是“让主人随时控制宠物”，而是让主人能够接近宠物，同时帮助判断什么时候应该互动、什么时候应该停止。

| **风险**       | **Guard**                                | **默认行为**                   |
|----------------|------------------------------------------|--------------------------------|
| 频繁打扰休息   | 休息状态 + session cooldown              | 提示稍后；连续不响应时停止建议 |
| 过度远程投喂   | 单次/日额度 + 饮食计划 + 多人去重        | 超限阻断或改为语音/玩耍        |
| 声音刺激过强   | 最大音量 + 单次时长 + 冷却               | 设备端硬限制优先               |
| 玩具长时间追逐 | 单 session 时长 + cooldown               | 到时自动结束                   |
| 明显回避/逃离  | 可观察回避信号                           | 建议结束，不继续追踪刺激       |
| 机器人碰撞     | obstacle/cliff/safe-speed/forbidden-zone | 设备级 fail-safe               |
| 激光类设备     | 高风险默认关闭                           | 若未来支持，需严格设备安全验证 |
| 多人同时控制   | session ownership + command arbitration  | 同一时刻只有一个控制上下文     |

# 17. 前端、后端与基础设施技术架构

## 17.1 建议技术栈（可替换，但边界应保持）

| **层**         | **建议**                               | **理由**                                    |
|----------------|----------------------------------------|---------------------------------------------|
| Mobile         | Flutter 或 React Native（二选一）      | 快速覆盖iOS/Android；业务逻辑尽量服务端化。 |
| Web/Admin      | Next.js/React                          | 专业端、运营后台、调试与分享链接。          |
| API Backend    | FastAPI（Python）或 NestJS             | AI-heavy场景Python更顺；团队JS强可NestJS。  |
| DB             | PostgreSQL + pgvector                  | 事务、关系和RAG起步统一。                   |
| Cache/Queue    | Redis + durable worker/Temporal/Celery | 任务、重试、rate limit；关键流程需持久化。  |
| Object Storage | S3兼容                                 | 媒体、文档、导出包。                        |
| AI Service     | 独立AI gateway                         | 模型路由、预算、审计、fallback。            |
| Observability  | OpenTelemetry + logs/metrics/traces    | 跨API/AI/worker追踪。                       |
| Deployment     | Docker；初期单区域云托管               | 避免过早微服务/K8s。                        |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>架构取舍<br />
</strong>v0.1推荐“模块化单体 + 独立AI Gateway + Worker”，不是一开始拆十几个微服务。先把Event、权限、事务和审计做对，规模上来再拆。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 17.2 后端模块边界

| **模块**      | **核心职责**          |
|---------------|-----------------------|
| identity      | 账号/会话             |
| household     | 家庭与成员            |
| pets          | Pet主档               |
| events        | 统一Event写入/校验    |
| timeline      | 查询/聚合             |
| tasks         | 任务/重复/完成        |
| care          | Handoff/Care Card     |
| behavior      | 行为事件              |
| health        | 健康事件/分诊/Outcome |
| artifacts     | 媒体/文档             |
| permissions   | Grant/ABAC            |
| notifications | 提醒                  |
| search        | Pet RAG索引           |
| ai_gateway    | 模型/规则/输出验证    |
| audit         | 不可变审计            |
| integrations  | 设备/HIS/外部Adapter  |
| analytics     | 指标事件              |

## 17.3 同步与离线

- Quick Log支持弱网/离线草稿；服务端以event_id+idempotency_key去重。

- 冲突解决优先保留双方事件，不静默覆盖；需要合并时产生supersedes/retracted关系。

- 媒体上传使用presigned URL并支持断点/失败重试；Event可先建pending artifact。

- 多端实时可用WebSocket/SSE做Today/Task更新，但不是核心事实通道。

## 17.4 Companion Candidate 技术分层

| **模块**            | **职责**                                                      |
|---------------------|---------------------------------------------------------------|
| realtime_gateway    | WebRTC session/signaling、实时连接状态；不承担核心事实存储    |
| device_gateway      | 第三方设备 Adapter、命令、ack、capability、rate limit         |
| interaction_service | Session 生命周期、动作记录、宠物响应观察、Outcome             |
| welfare_guard       | 互动频率、时长、零食、回避信号等规则层                        |
| presence_ai         | Interaction Opportunity、行为候选、个体响应模式；不做心理诊断 |
| audit               | 实时查看和设备控制 append-only 审计                           |
| timeline            | 将确认后的 Interaction Event 进入同一 Pet Timeline            |

早期不建议自研硬件；继续采用 hardware-agnostic 策略。优先通过 Capability Registry + Provider Adapter 接入已有摄像头、喂食器、猫砂盆、项圈、玩具或机器人。只有真实 Pilot 证明特定交互能力有持续价值且供应链/安全可控时，才讨论专用硬件。

# 18. 仓库、模块与编码规范

pet-life-intelligence/  
apps/  
mobile/  
web/  
admin/  
services/  
api/  
worker/  
ai-gateway/  
packages/  
domain-schema/  
api-client/  
ui-kit/  
rules/  
observability/  
data/  
migrations/  
seed/  
evals/  
docs/  
product/  
architecture/  
api/  
safety/  
tests/  
unit/  
integration/  
contract/  
e2e/  
ai-evals/  
safety/  
infra/  
docker/  
environments/  
scripts/

## 18.1 编码规则

- Feature实现的PR/issue标题包含PLI-xxx Feature ID。

- 所有Event type和payload schema集中在domain-schema，不允许前端私自发明字段。

- 高风险规则有唯一Rule ID、版本、测试案例和变更记录。

- AI prompt/JSON schema/模型配置版本化，不散落在业务代码中。

- 所有数据库迁移可回滚或有明确forward-fix策略；禁止直接改生产表。

- 业务时间使用timezone-aware datetime；金额/剂量/单位使用明确类型，不用裸float。

- 日志禁止记录完整敏感病历/媒体正文；用ID引用。

# 19. 测试、AI评估与验收Gate

| **测试层**  | **范围**                             | **v0.1要求**            |
|-------------|--------------------------------------|-------------------------|
| Unit        | 规则、Schema、权限、转换             | 核心domain覆盖。        |
| Integration | DB、对象存储、队列、AI Gateway       | 关键写路径全部覆盖。    |
| Contract    | OpenAPI/Event schema/Adapter         | 每次变更CI校验。        |
| E2E         | 14个核心Surface主流程                | P0主路径+关键失败路径。 |
| Safety      | 红旗、给药去重、权限、Agent禁止动作  | 必须阻断发布。          |
| AI Eval     | 结构化、摘要、grounding、幻觉、拒答  | 固定gold set + 回归。   |
| Load        | Timeline、事件写入、媒体上传         | 按试点规模留余量。      |
| Security    | 越权、token、上传、注入、RAG数据泄露 | 发布前基线。            |

## 19.1 v0.1 Release Gates

| **Gate**      | **建议阈值/要求**                     | **Blocker?**        |
|---------------|---------------------------------------|---------------------|
| G1 Pet创建    | ≥80%完成后记录至少1条真实Event        | Yes if catastrophic |
| G2 Event质量  | 关键字段/来源/权限100%通过schema      | Yes                 |
| G3 7日连续性  | 试点宠物≥3天产生有效Event             | Product gate        |
| G4 Care协作   | 多人家庭产生真实协作记录              | Product gate        |
| G5 Health闭环 | Intake→Triage→Vet Brief→Outcome能走通 | Yes                 |
| G6 Safety     | 红旗under-triage达到预设极低/零容忍   | Yes                 |
| G7 AI追溯     | 关键输出100%引用输入/版本             | Yes                 |
| G8 Privacy    | 越权/撤权/导出/删除测试通过           | Yes                 |

## 19.2 Monitoring / Companion 验收矩阵（候选）

| **测试域**      | **必须覆盖**                                                           |
|-----------------|------------------------------------------------------------------------|
| Device Contract | 能力发现、断连、重连、坏数据、重复事件、Provider 错误                  |
| Realtime        | 连接/断线/重连、超时、弱网、权限变化、session 结束                     |
| Privacy         | 跨家庭 IDOR、设备 Grant、时间窗、Privacy Mode、Audit                   |
| Command Safety  | idempotency、重复命令、多人冲突、ack、失败恢复                         |
| Welfare         | 休息打扰、连续不响应、过量零食、长时互动、回避停止                     |
| AI              | 行为候选 grounding、不确定性、错误心理推断、Opportunity explainability |
| Data            | Interaction Session→Timeline→Baseline 一致性                           |
| Multi-client    | Web/Mini/Mobile 同一 Pet/Session/权限语义一致                          |

# 20. 可观测性、分析与实验体系

| **层**       | **关键指标**                                                                        |
|--------------|-------------------------------------------------------------------------------------|
| Product      | Active Pets with Continuous Evidence Chain、事件天数、家庭协作率、健康/行为闭环率。 |
| Data Quality | Event缺失率、重复率、source未知率、设备数据新鲜度、Artifact失败率。                 |
| AI           | 调用量、延迟、成本、schema通过率、grounding、幻觉、fallback、拒答。                 |
| Safety       | 红旗命中、under/over-triage、重复给药拦截、越权尝试。                               |
| Infra        | API p95、错误率、队列积压、DB连接、存储失败、Webhook重试。                          |

北极星不采用聊天次数或页面PV，而采用“每月拥有高质量连续证据链的活跃宠物数”。该指标要求Event具备pet/actor/time/source，且在窗口内形成足够连续性。

## 20.1 实验原则

- 安全/医疗红旗不做A/B弱化实验。

- 商业推荐实验不能改变临床建议排序。

- Onboarding、Today布局、提醒频次、记录模板可实验。

- AI模型A/B必须先离线eval，再灰度；保留按模型版本切片指标。

## 20.2 Monitoring / Companion 指标候选

| **层**            | **指标**                                                                           |
|-------------------|------------------------------------------------------------------------------------|
| Device            | online rate、data freshness、quality issues、attribution confidence                |
| Monitoring        | camera candidate→review rate、confirmed event rate、false-positive correction      |
| Companion Product | sessions/pet/week、owner-initiated rate、session completion、repeat usage          |
| Pet Response      | observable orientation/approach/play/avoidance rate；不命名情绪分                  |
| Welfare           | forced stop、cooldown block、treat-limit block、avoidance stop                     |
| Privacy           | unauthorized attempts、revoked access、privacy mode usage                          |
| Reliability       | realtime connect success、command ack、device latency                              |
| Discovery         | owner monitoring frequency、existing camera/device penetration、willingness-to-use |

# 21. CI/CD、环境与发布策略

| **环境** | **用途**                 | **数据**                         |
|----------|--------------------------|----------------------------------|
| local    | 开发/单元测试            | seed/fake，不用真实敏感数据。    |
| dev      | 共享开发                 | 合成/脱敏。                      |
| staging  | E2E/安全/回归/试点前验证 | 脱敏或明确同意的测试账号。       |
| pilot    | 小规模真实试点           | 独立Feature Flags/审计。         |
| prod     | 正式                     | 最小权限、备份、监控、变更控制。 |

## 21.1 发布流水线

lint/typecheck → unit → schema/contract → integration → AI eval → safety suite → build → staging E2E → manual high-risk approval → canary/feature flag → production → post-deploy smoke

- 数据库migration与应用部署分离评估；危险migration必须先backfill再切读写。

- Rule/Prompt/Model变更可以独立版本化发布，但同样通过safety/eval gate。

- P0功能默认Feature Flag，试点期间按家庭/用户白名单。

- 发布失败优先关闭Feature Flag或回滚应用；Event schema要向后兼容。

## 21.2 Feature Flag 与阶段控制新增规则

- Stage G 默认 FEATURE_FREEZE=true；Companion 所有候选能力默认不存在于 Production Feature Flag。

- 若进入 vNext，Camera/Audio/Treat/Toy/Robot 必须拆为独立 capability flag，不得一个总开关一次放开所有动作。

- 实时设备高风险能力应支持按家庭、设备 Provider、Pilot cohort 灰度。

- 任何福利/隐私/设备安全 incident 可以通过 Feature Flag 立即关闭对应能力，而不影响 Timeline / Care / Health 基础产品。

# 22. 商业模式、运营与合作生态

| **阶段** | **主要收入**                                     | **前提**                 |
|----------|--------------------------------------------------|--------------------------|
| v0.x     | 订阅可暂缓/轻会员；重点验证留存与专业价值        | 先有连续使用和可信数据。 |
| v1.0     | Premium家庭协作/AI、服务佣金、专业合作           | 不能让佣金改变安全建议。 |
| v1.x     | 设备/营养/保险/服务生态、B2B工具                 | 跨域Outcome和API稳定。   |
| 长期     | 研究合作、老龄/专病、数据服务（严格同意/去标识） | 伦理/同意/数据治理成熟。 |

## 22.1 合作优先级

| **合作方**        | **先合作什么**                   | **暂时不做**        |
|-------------------|----------------------------------|---------------------|
| 独立宠物医院/兽医 | Vet Brief试点、资料回流、Outcome | 替换HIS。           |
| 训练师/行为师     | 行为记录/训练计划反馈            | 让AI替代专业评估。  |
| 设备厂商          | 事件API/数据导入                 | 定制硬件。          |
| 寄养/保姆/美容    | Care Card与服务Outcome           | 首版重交易平台。    |
| 保险              | 理赔材料结构化                   | 承保/赔付自动决策。 |
| 营养/品牌         | 健康约束下的产品使用Outcome      | 广告驱动健康结论。  |
| 救助/领养         | Portable Pet ID与随访            | 只做流量曝光。      |

## 22.2 Companion 的商业化原则（候选）

- 远程陪伴若被验证，可成为 Premium / Device ecosystem 的高频价值层，但不能以制造宠主焦虑驱动订阅。

- 设备厂商合作优先接入 Event/Outcome 和可审计能力，而不是只做导流或贴牌。

- 寄养/医院的 Remote View 可以作为服务增值，但访问控制权必须属于机构策略和用户授权，而不是平台强制。

- Treat / Toy / Nutrition 商业推荐不得绕过饮食、健康和 Welfare Guard。

- Companion 是否商业化必须先证明高频真实需求、福利可控、隐私可接受、设备兼容和可持续成本。

# 23. 路线图、风险与项目治理

| **阶段**      | **目标**                      | **主要交付**                                                       | **Exit Gate**                                        |
|---------------|-------------------------------|--------------------------------------------------------------------|------------------------------------------------------|
| 0-3个月 v0.1  | 三角MVP可真实使用             | 50 P0、14 Surface、Event Graph、权限、安全、Health闭环             | 试点家庭和专业端可完整跑通。                         |
| 3-6个月 v0.2  | 个体化学习                    | Training、Behavior模式、Pet Search、Care Handoff深化、基础Baseline | 能回答关于这只宠物的真实历史并给出可追溯个体化计划。 |
| 6-12个月 v1.0 | 跨域平台                      | 设备层、服务、Welfare、Social、营养/保险连接                       | 至少一个设备和一个服务/专业合作形成Outcome回流。     |
| 12-24个月     | 专病/老龄与商业闭环           | CKD/OA候选、Senior、保险/营养、专业API                             | 前瞻验证和商业化不破坏安全。                         |
| 24-36个月+    | Pet Life Intelligence深层能力 | 多组学接口、Healthspan、复杂Agent、研究型Digital Twin              | 多年纵向Outcome足够支撑预测研究。                    |

## 23.1 Top风险登记

| **风险**     | **等级** | **表现**                      | **控制**                                       |
|--------------|----------|-------------------------------|------------------------------------------------|
| 范围失控     | 高       | 228项被理解为“都要首版做”     | 以Stage/Feature ID严格冻结；v0.1只50项。       |
| AI伪科学     | 高       | 情绪/兼容度/疾病输出过度确定  | Observation first、置信/不确定、专业确认。     |
| 数据碎片     | 高       | 每个模块各存一套JSON          | Canonical Event Graph和schema review。         |
| 权限事故     | 高       | 临时照护/专业人士看到过多数据 | ABAC、到期Grant、audit、敏感Artifact独立权限。 |
| 健康安全     | 极高     | 漏急诊/错误用药               | Red Flag独立、Safety suite、禁止自动改药。     |
| 低频留存     | 高       | 只在生病时打开                | Today/Daily/Care为首版高频主轴。               |
| 设备锁定     | 中       | 依赖单一厂商                  | Device abstraction layer。                     |
| 商业利益冲突 | 高       | 带货影响健康建议              | 推荐与临床分区、披露、规则隔离。               |
| Agent越权    | 高       | 自动支付/预约/转移/医疗       | 动作分级和explicit approval。                  |
| 缺乏Outcome  | 高       | 数据多但不能验证是否有效      | 每个关键域设计Outcome回流。                    |

## 23.2 项目决策Gate

- 任何新增域级功能先回答：是否增加高频、专业价值、数据复利或商业闭环？至少命中一项。

- 任何AI能力先回答：有没有可验证输入/输出？失败时安全降级是什么？

- 任何第三方集成先回答：是否能回流Event/Outcome？只导流不回流的数据价值有限。

- 任何商业化先回答：是否可能扭曲健康/福利/安全结论？如果可能，必须架构隔离。

- 任何“数字孪生/预测”宣传先回答：是否有真实纵向Outcome与外部验证？没有则只标研究方向。

## 23.3 2026-09-18 后续路线修订

| **阶段**               | **当前目标**          | **主要交付**                                                | **Gate**                        |
|------------------------|-----------------------|-------------------------------------------------------------|---------------------------------|
| Stage F（已完成核心）  | 真实公网验证          | Public Staging、Remote E2E、安全/隐私/备份、真实 Pilot 通路 | 真实公网证据而非 localhost      |
| Stage G（当前）        | 真实 Pilot Operations | 3–10机构、50–200宠物、2–4周、真实行为/反馈/Outcome          | GO / ITERATE / PIVOT            |
| vNext Discovery        | 决定下一增长主线      | Daily/Care、Health/Vet、Monitoring、Companion 等证据比较    | 必须由真实数据驱动              |
| Companion Candidate    | 若证据成立再正式立项  | Remote Presence、Enrichment、Welfare Guard、Device Adapter  | 需求+福利+隐私+技术+成本 五Gate |
| Independent Production | 正式生产切换          | 独立域名/DNS/DB/Redis/Storage/监控/备份                     | 不能用 Staging 冒充 Production  |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Feature Inventory 规则<br />
</strong>当前 228 项仍是唯一 canonical Feature Index。Companion 不直接分配 PLI-229+。Stage G 完成后，如果 Remote Monitoring / Companion 获得足够证据，先生成 vNext Candidate List，再进行正式 Feature ID、Stage、Priority、Risk、Done Definition 和测试 Gate 设计。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 24. 当前工程运行基线与Stage F收口

本节记录截至 2026-09-18 的运行事实快照，用于避免后续 Agent 继续把项目误判为“仍处于本地开发”。这些状态低于未来新的 L0 事实；任何最新 repo report / staging / production 运行结果都可覆盖本节。

| **验证项**       | **当前证据**                                                  |
|------------------|---------------------------------------------------------------|
| 远程全链路 smoke | 20/20 PASS：注册→登录→主流程→跨用户拒绝→数据持久化            |
| 远程 Auth        | 15/15 PASS：Argon2id、refresh 轮换、复用检测、限流、删号等    |
| 远程医疗安全     | 9/9 PASS：红旗、owner 弱化、injection、单调升级、免责声明等   |
| 远程存储         | 9/9 PASS：上传/下载/跨用户 IDOR 403/MIME/签名                 |
| 远程隐私         | 8/8 + 7/7 ALL-PASS：分享/导出/consent/删除 + share-revoke     |
| 远程 Pilot       | 8/8 + 9/9 ALL-PASS：邀请码全链路 + PILOT_MODE 闸门            |
| 备份/恢复        | 10/10 exit 0：73 表→pg_dump→恢复→counts 一致→恢复库 API smoke |
| 远程 Playwright  | 12/12 PASS                                                    |
| Monitoring       | 已观察真实流量变化与时间桶增长，证明指标端点不是静态装饰      |
| 质量门禁         | pytest 267、ruff clean、typecheck 0；以最新 repo 为准         |

## 24.1 Stage F 暴露并修复的真实部署问题

1.  web/admin 镜像缺 NEXT_PUBLIC_API_URL 构建 ARG，导致 bundle 烙入 localhost:8800，公网浏览器 API 全断。

2.  seed 清理顺序遗漏 auth/pilot 表，外键引用 users，导致服务器有会话时 seed 崩溃。

3.  健康页 window.location.href 未感知 basePath，公网路径部署时健康详情流 404。

4.  PWA basePath 缺口：动态 manifest 路由、service worker v2 scope 派生和 API 永不缓存修正。

## 24.2 当前仍需诚实标记的外部条件

- Git remote URL：仓库已准备，需真实 remote 才能 push。

- Real AI Provider API Key：代码 REAL_PROVIDER_READY，但若 /ai/status real:false 则不得称 AI_REAL。

- SMTP：代码/模板可准备，正式发信取决于真实凭据。

- 独立 Production 域名 + DNS：Public Staging 可用不等于独立 Production。

- 微信/Apple/Google/HarmonyOS：账号、主体、备案、签名属于外部平台条件。

# 25. Stage G真实Pilot运营、验证与决策体系

Stage G 的任务不再是扩功能，而是验证：谁真正需要 PLI、为什么回来、哪些能力创造价值、哪些功能应该删除、下一版应该做什么。

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Stage G 总原则<br />
</strong>FEATURE_FREEZE=true。真实用户行为 &gt; 设计假设；真实专业反馈 &gt; 内部判断；真实 Outcome &gt; AI Demo；真实留存 &gt; 页面数量。</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 25.1 第一轮Pilot规模

- 3–10 家真实机构。

- 50–200 只真实宠物。

- 2–4 周真实使用。

- 优先覆盖宠物医院/诊所、训练师/行为师、宠物店/综合服务门店、寄养/保姆和少量直接宠主。

## 25.2 Pilot 数据真实性

- DEMO / SYNTHETIC / INTERNAL / PILOT_REAL 必须明确区分。

- demo pet、seed、测试账号、AI 模拟用户不得进入真实 Retention / Outcome / Vet Usefulness。

- 没有真实数据时写 NOT_YET_OBSERVED，不得补造数字。

## 25.3 核心Pilot指标

| **维度**          | **核心指标**                                                          |
|-------------------|-----------------------------------------------------------------------|
| Activation        | Invite→Register→Pet Created→First Event→3 Events                      |
| Continuity        | 3-day / 7-day / 14-day evidence                                       |
| Daily             | Events/Active Pet/Day、Quick Log、Active Days                         |
| Care              | Multi-member、Task completion、Handoff、duplicate prevention          |
| Health            | Health Events、Vet Brief、professional use、Outcome closure           |
| Behavior/Training | Behavior Event→Plan→Follow-up→Outcome                                 |
| AI                | calls、success、fallback、schema fail、latency、cost、unsafe feedback |
| Support           | P0/P1/P2/P3 bug、incident、support burden                             |
| Commercial        | willingness-to-pay、institution pilot/pay intent                      |
| North Star        | Active Pets with Continuous Evidence Chain                            |

## 25.4 关键产品问题

5.  用户为什么回来？

6.  最强高频入口是 Today / Quick Log / Care / Monitoring / Search / Companion 中的哪一个？

7.  最强专业价值是 Vet Brief / Health Closure / Behavior / Care Collaboration 中的哪一个？

8.  哪类机构最愿意持续使用？

9.  哪类客户最可能付费？

10. Pet Timeline 是否真正形成数据复利？

## 25.5 GO / ITERATE / PIVOT

| **结论** | **含义**                                         |
|----------|--------------------------------------------------|
| GO       | 核心价值成立，可扩大 Pilot                       |
| ITERATE  | 核心价值成立，但存在明确可修复问题               |
| PIVOT    | 核心使用行为没有出现，需要重新考虑入口或目标用户 |

## 25.6 Companion / Device Discovery 在Stage G中的位置

Companion 目前只做 Product Discovery：调查主人离家后是否真的高频查看宠物、是否使用摄像头、是否远程说话/投喂/玩耍、宠物的可观察响应、隐私和福利担忧，以及当前持有的 camera / feeder / litter box / collar / tracker / scale。Stage G 禁止因单条反馈立即开发 Companion。

# 26. PLI Companion：远程存在、陪伴与互动候选层

PLI Companion 的目标不是让宠物像人一样使用通信产品，而是让主人在异地时，通过安全的感知和简单刺激进入宠物当前生活，同时让系统以可观察行为而非主观拟人化解释互动。

## 26.1 顶层产品原则

- Zero-cognition first：尽量不要求宠物学习任何抽象界面。

- Observation first：先记录发生了什么，再谈解释。

- Species / individual adaptive：猫、狗及个体差异不能共用同一交互假设。

- Short, reversible sessions：远程互动默认短时、随时可结束。

- Welfare before engagement：主人“想互动”不等于宠物“应该被打扰”。

- Evidence before emotion：行为证据优先于“开心/孤独/想你”等拟人化标签。

- Hardware agnostic：先接入第三方设备，不以自研硬件作为产品前提。

## 26.2 四级交互模型

| **级别**            | **定义**           | **示例**                     | **风险**               |
|---------------------|--------------------|------------------------------|------------------------|
| Observe             | 宠物无任何认知要求 | 实时查看、最近活动、设备摘要 | 隐私、误判、过度查看   |
| Presence            | 熟悉感官刺激       | 主人声音、短时视频存在       | 音量、频率、个体不响应 |
| Enrichment          | 本能/简单训练反应  | 零食、玩具、简单cue          | 过量、刺激、设备安全   |
| Learned Interaction | 条件学习后主动触发 | 大按钮、固定区域触发主人互动 | 错误意图解读、训练门槛 |

## 26.3 启动模式

- Owner Initiated：主人想宠物时主动查看/互动。

- Pet Initiated：设备检测到明确触发（按钮/停留/触碰）后通知主人，不推断“想你”。

- AI Suggested：基于可解释状态建议互动时机，不能诊断孤独/抑郁。

- Scheduled：主人设置时间窗，系统先检查设备和福利条件。

- Family Companion：多名家庭成员可共同进入，但同一控制上下文需仲裁。

- Care/Hospital：服务/医院策略优先，按时间窗和权限开放。

## 26.4 个体响应学习

长期可以学习“这只宠物对哪些互动方式更常出现接近、定向、玩耍或回避”，但输出必须是证据型描述。例如“过去30次主人语音中，22次在15秒内出现定向或接近行为”，而不是“它最爱听你的声音”。

## 26.5 Interaction Welfare Guard

Welfare Guard 是 Companion 的独立安全层，优先于增长与互动次数。它必须能够阻止或建议停止休息打扰、连续无响应、过量零食、过长玩耍、明显回避、多人冲突和不安全机器人控制。

## 26.6 物种与个体差异

| **维度** | **狗**                   | **猫**                         | **产品含义**                 |
|----------|--------------------------|--------------------------------|------------------------------|
| 熟悉声音 | 常可能形成cue/奖励关联   | 个体差异大，可能回应也可能忽略 | 不能以不回应推断负面情绪     |
| 屏幕视觉 | 部分个体可关注           | 部分个体关注运动图像           | 视频不是核心依赖             |
| 按钮训练 | 部分犬容易形成条件学习   | 部分猫可学习但不应默认         | Pet Initiated 为可选高级模式 |
| 玩耍     | 训练/追逐/寻回可较结构化 | 猎捕式/短时刺激更常见          | 交互策略必须分物种与个体     |
| 社交需求 | 个体差异极大             | 个体差异极大                   | 不建立统一“孤独阈值”         |

## 26.7 技术与隐私

- WebRTC 处理实时音视频；Canonical Event API 负责事实和 Timeline。

- 设备控制采用 Capability Registry + Provider Adapter + command idempotency / ack / timeout。

- 家庭摄像默认不保存连续流，按事件短片或用户主动保存。

- Privacy Mode、时间窗 Grant、家庭成员在场策略和 append-only Audit 必须优先设计。

- 高风险设备动作永远不能由 Agent 无确认自动执行。

# 27. Companion Feature晋升、阶段Gate与vNext策略

Companion 当前是设计候选，不是当前 228 Feature 的强制实施范围。正式进入 vNext 前必须通过以下 Gate。

| **Gate**   | **必须回答的问题**                         | **示例证据**                       |
|------------|--------------------------------------------|------------------------------------|
| Demand     | 用户是否已经存在高频远程查看/陪伴行为？    | 访谈+真实设备使用+Pilot日志        |
| Retention  | 它是否可能比现有 Today/Care 更高频？       | cohort/usage comparison            |
| Cognition  | 是否无需宠物理解复杂抽象关系？             | 行为观察/训练门槛                  |
| Welfare    | 能否避免打扰、过量、回避和设备伤害？       | Guard规则+专业审查+试验            |
| Privacy    | 家庭摄像/麦克风权限是否可接受？            | consent+privacy test+user feedback |
| Technology | 设备/实时链路是否稳定、可抽象？            | adapter/contract/reliability       |
| Economics  | 设备、带宽、AI成本是否可持续？             | cost/pet/month                     |
| Outcome    | 互动是否产生可解释、可学习的长期数据价值？ | Interaction→Baseline/Change Signal |

## 27.1 候选能力ID（非Canonical）

| **Candidate ID** | **能力**                             | **当前状态**           |
|------------------|--------------------------------------|------------------------|
| COMP-C01         | Remote Observe / Live Status         | Discovery              |
| COMP-C02         | Remote Audio Presence                | Discovery              |
| COMP-C03         | Video Presence                       | Discovery              |
| COMP-C04         | Remote Treat with Nutrition Guard    | Discovery              |
| COMP-C05         | Remote Toy / Enrichment              | Discovery              |
| COMP-C06         | Pet Initiated Trigger                | Discovery              |
| COMP-C07         | Interaction Opportunity Detection    | Discovery              |
| COMP-C08         | Interaction Session Timeline         | Design Ready           |
| COMP-C09         | Pet Response Observation             | Design Ready           |
| COMP-C10         | Interaction Welfare Guard            | Design Ready           |
| COMP-C11         | Camera Privacy Mode                  | Design Ready           |
| COMP-C12         | Family Companion Session             | Discovery              |
| COMP-C13         | Care Service Remote View             | Discovery              |
| COMP-C14         | Hospital Remote Presence             | Discovery              |
| COMP-C15         | Device Capability Registry           | Architecture Ready     |
| COMP-C16         | Realtime Gateway / WebRTC            | Architecture Candidate |
| COMP-C17         | Device Command Gateway               | Architecture Candidate |
| COMP-C18         | Interaction Baseline / Change Signal | Future Research        |

只有 Stage G 证据足够后，以上 Candidate 才可转化为正式 PLI Feature ID、Stage、Priority、AI/Risk、Event、Done Definition 和测试 Gate。

# 附录A：228项Feature Inventory

Feature ID和Stage应与配套XLSX一致。若本附录与XLSX冲突，以XLSX中最新Feature ID/Stage为准。

## 身份与授权

| **ID**  | **Feature**          | **Stage** | **Priority** | **AI?** | **Event**               |
|---------|----------------------|-----------|--------------|---------|-------------------------|
| PLI-001 | 创建宠物主档         | v0.1      | P0           | 否      | PetCreated              |
| PLI-002 | 多宠家庭管理         | v0.1      | P0           | 否      | PetLinkedToHousehold    |
| PLI-003 | 头像与视觉档案       | v0.1      | P0           | 是      | PetMediaAdded           |
| PLI-004 | 芯片号记录与验证     | v0.2      | P1           | 否      | IdentifierAdded         |
| PLI-005 | QR/NFC Care Card     | v0.2      | P1           | 否      | AccessTokenIssued       |
| PLI-006 | 身份去重与合并       | v1.0      | P2           | 是      | PetMerged               |
| PLI-007 | 生物特征辅助识别     | Future    | Future       | 是      | IdentityCheck           |
| PLI-008 | Owner / Co-owner关系 | v0.1      | P0           | 否      | RelationshipCreated     |
| PLI-009 | 所有权转移流程       | v1.0      | P2           | 否      | OwnershipTransferred    |
| PLI-010 | 角色权限模型         | v0.1      | P0           | 否      | GrantChanged            |
| PLI-011 | 临时权限与自动到期   | v0.1      | P0           | 否      | GrantExpired            |
| PLI-012 | 字段级隐私控制       | v1.0      | P2           | 否      | PrivacyPolicyChanged    |
| PLI-013 | 宠物状态生命周期     | v0.2      | P1           | 否      | PetLifecycleChanged     |
| PLI-014 | 紧急联系人卡         | v0.1      | P0           | 否      | EmergencyProfileUpdated |
| PLI-015 | 宠物资料导出包       | v1.0      | P2           | 否      | DataExported            |
| PLI-016 | 数据用途与研究同意   | v0.1      | P0           | 否      | ConsentChanged          |

## Today / Daily Life

| **ID**  | **Feature**       | **Stage** | **Priority** | **AI?**  | **Event**             |
|---------|-------------------|-----------|--------------|----------|-----------------------|
| PLI-017 | 今日总览          | v0.1      | P0           | 否       | DailySummaryViewed    |
| PLI-018 | 快速记录入口      | v0.1      | P0           | 否       | LifeEventCreated      |
| PLI-019 | 喂食记录          | v0.1      | P0           | 否       | MealEvent             |
| PLI-020 | 饮水记录          | v0.1      | P0           | 否       | DrinkEvent            |
| PLI-021 | 排泄记录          | v0.1      | P0           | 是       | EliminationEvent      |
| PLI-022 | 散步与户外活动    | v0.1      | P0           | 否       | WalkEvent             |
| PLI-023 | 玩耍与丰富化记录  | v0.1      | P0           | 否       | PlayEvent             |
| PLI-024 | 睡眠/休息记录     | v0.2      | P1           | 否       | SleepEvent            |
| PLI-025 | 体重与体况趋势    | v0.1      | P0           | 是       | WeightObservation     |
| PLI-026 | 照护任务          | v0.1      | P0           | 否       | CareTaskCreated       |
| PLI-027 | 完成与责任人      | v0.1      | P0           | 否       | CareTaskCompleted     |
| PLI-028 | 重复执行冲突提醒  | v0.1      | P0           | 规则为主 | CareConflictDetected  |
| PLI-029 | 个体日常基线      | v0.2      | P1           | 是       | BaselineUpdated       |
| PLI-030 | 异常日提示        | v1.0      | P2           | 是       | BaselineDeviation     |
| PLI-031 | 自由文本/语音日记 | v0.2      | P1           | 是       | OwnerNote             |
| PLI-032 | 照片/视频绑定事件 | v0.1      | P0           | 是       | ArtifactLinked        |
| PLI-033 | 每日AI摘要        | v0.2      | P1           | 是       | DailySummaryGenerated |
| PLI-034 | 轻量连续照护反馈  | v1.0      | P2           | 否       | AdherenceUpdated      |

## Care Network

| **ID**  | **Feature**            | **Stage** | **Priority** | **AI?**  | **Event**                 |
|---------|------------------------|-----------|--------------|----------|---------------------------|
| PLI-035 | 邀请家庭成员           | v0.1      | P0           | 否       | CaregiverInvited          |
| PLI-036 | 家庭角色模板           | v0.1      | P0           | 否       | GrantChanged              |
| PLI-037 | 照护交接模式           | v0.1      | P0           | 否       | CareHandoffStarted        |
| PLI-038 | 自动生成Care Card      | v0.1      | P0           | 是       | CareCardGenerated         |
| PLI-039 | 交接确认清单           | v0.2      | P1           | 否       | HandoffChecklistCompleted |
| PLI-040 | 照护期日报             | v0.2      | P1           | 否       | CareShiftReport           |
| PLI-041 | 照护结束总结           | v0.2      | P1           | 是       | CareHandoffEnded          |
| PLI-042 | 任务责任矩阵           | v0.2      | P1           | 否       | CareResponsibilitySet     |
| PLI-043 | 逾期升级提醒           | v1.0      | P2           | 规则为主 | CareTaskEscalated         |
| PLI-044 | 兽医/训练师/美容师关系 | v1.0      | P2           | 否       | ProfessionalLinked        |
| PLI-045 | 专业记录签名来源       | v1.0      | P2           | 否       | ProfessionalObservation   |
| PLI-046 | 谁看过/改过什么        | v0.1      | P0           | 否       | AuditEvent                |
| PLI-047 | 按角色通知             | v0.2      | P1           | 否       | NotificationPolicyChanged |
| PLI-048 | 紧急授权模式           | v1.0      | P2           | 否       | EmergencyAccessGranted    |

## Health

| **ID**  | **Feature**          | **Stage** | **Priority** | **AI?**  | **Event**              |
|---------|----------------------|-----------|--------------|----------|------------------------|
| PLI-049 | 发现异常入口         | v0.1      | P0           | 否       | HealthEventOpened      |
| PLI-050 | 动态追问             | v0.1      | P0           | 是       | ClinicalIntakeStep     |
| PLI-051 | 图片/视频/音频证据   | v0.1      | P0           | 否       | ClinicalArtifactAdded  |
| PLI-052 | 可观察事实提取       | v0.1      | P0           | 是       | AIObservation          |
| PLI-053 | 红旗安全引擎         | v0.1      | P0           | 规则为主 | RedFlagTriggered       |
| PLI-054 | 风险分级             | v0.1      | P0           | 规则为主 | TriageAssigned         |
| PLI-055 | 就诊前摘要           | v0.1      | P0           | 是       | VetBriefGenerated      |
| PLI-056 | 分享链接/PDF         | v0.1      | P0           | 否       | VetBriefShared         |
| PLI-057 | 病历/处方/检验导入   | v0.2      | P1           | 是       | MedicalRecordImported  |
| PLI-058 | 医疗结构化与来源分级 | v0.2      | P1           | 是       | ClinicalFactAdded      |
| PLI-059 | 用药计划             | v0.1      | P0           | 否       | MedicationPlanCreated  |
| PLI-060 | 给药记录与遗漏提醒   | v0.1      | P0           | 规则为主 | MedicationAdministered |
| PLI-061 | 恢复计划             | v0.2      | P1           | 是       | RecoveryPlanCreated    |
| PLI-062 | 症状趋势复盘         | v0.2      | P1           | 是       | RecoveryObservation    |
| PLI-063 | 结局采集             | v0.1      | P0           | 否       | HealthOutcome          |
| PLI-064 | 疫苗/驱虫/体检提醒   | v0.2      | P1           | 否       | PreventiveCareDue      |
| PLI-065 | 慢病模式             | v1.0      | P2           | 是       | ChronicCareEvent       |
| PLI-066 | 老龄宠物基线         | v1.0      | P2           | 是       | SeniorBaselineUpdated  |
| PLI-067 | 标准术语映射         | v1.0      | P2           | 是       | TerminologyMapped      |
| PLI-068 | 真实世界证据队列     | Future    | Future       | 否       | ResearchRecordEnrolled |

## Behavior

| **ID**  | **Feature**              | **Stage** | **Priority** | **AI?**  | **Event**              |
|---------|--------------------------|-----------|--------------|----------|------------------------|
| PLI-069 | 行为事件快速记录         | v0.1      | P0           | 否       | BehaviorEvent          |
| PLI-070 | 前因-行为-后果结构       | v0.2      | P1           | 否       | ABCObservation         |
| PLI-071 | 行为视频绑定             | v0.2      | P1           | 否       | BehaviorArtifactAdded  |
| PLI-072 | 可观察行为抽取           | v1.0      | P2           | 是       | AIBehaviorObservation  |
| PLI-073 | 触发因素图谱             | v0.2      | P1           | 是       | BehaviorTriggerUpdated |
| PLI-074 | 行为模式与趋势           | v0.2      | P1           | 是       | BehaviorTrendUpdated   |
| PLI-075 | 吠叫/抓挠/破坏等事件模板 | v0.2      | P1           | 否       | BehaviorEvent          |
| PLI-076 | 回避/恐惧事件记录        | v1.0      | P2           | 否       | StressBehaviorEvent    |
| PLI-077 | 攻击相关安全记录         | v1.0      | P2           | 规则为主 | AggressionEvent        |
| PLI-078 | 独处行为档案             | v1.0      | P2           | 是       | SeparationObservation  |
| PLI-079 | 偏好与厌恶档案           | v0.2      | P1           | 是       | PreferenceUpdated      |
| PLI-080 | 环境上下文记录           | v0.2      | P1           | 否       | ContextEvent           |
| PLI-081 | 行为咨询包               | v1.0      | P2           | 是       | BehaviorBriefGenerated |
| PLI-082 | 行为干预计划记录         | v1.0      | P2           | 否       | BehaviorPlanCreated    |
| PLI-083 | 行为干预结果             | v1.0      | P2           | 是       | BehaviorOutcome        |
| PLI-084 | 行为建议安全过滤         | v0.2      | P1           | 规则为主 | SafetyPolicyApplied    |

## Training

| **ID**  | **Feature**        | **Stage** | **Priority** | **AI?**  | **Event**               |
|---------|--------------------|-----------|--------------|----------|-------------------------|
| PLI-085 | 训练目标创建       | v0.2      | P1           | 否       | TrainingGoalCreated     |
| PLI-086 | 目标分解           | v0.2      | P1           | 是       | TrainingPlanCreated     |
| PLI-087 | 训练会话记录       | v0.2      | P1           | 否       | TrainingSession         |
| PLI-088 | 技能掌握度         | v0.2      | P1           | 是       | SkillProgressUpdated    |
| PLI-089 | 环境泛化矩阵       | v1.0      | P2           | 否       | SkillContextUpdated     |
| PLI-090 | 下一步训练建议     | v1.0      | P2           | 是       | TrainingRecommendation  |
| PLI-091 | 奖励偏好库         | v0.2      | P1           | 是       | RewardPreferenceUpdated |
| PLI-092 | 训练工具           | v0.2      | P1           | 否       | TrainingToolUsed        |
| PLI-093 | 家庭训练一致性     | v1.0      | P2           | 否       | TrainingProtocolUpdated |
| PLI-094 | 训练师协作         | v1.0      | P2           | 否       | TrainerPlanShared       |
| PLI-095 | 动作/会话视频复盘  | v1.0      | P2           | 是       | TrainingArtifactAdded   |
| PLI-096 | 训练强度与健康约束 | v1.0      | P2           | 规则为主 | TrainingSafetyCheck     |
| PLI-097 | 标准课程模板       | v1.0      | P2           | 否       | TrainingProgramAssigned |
| PLI-098 | 训练成果证明       | v1.0      | P2           | 是       | TrainingReportGenerated |

## Welfare

| **ID**  | **Feature**      | **Stage** | **Priority** | **AI?**  | **Event**                |
|---------|------------------|-----------|--------------|----------|--------------------------|
| PLI-099 | 五域福利档案     | v1.0      | P2           | 否       | WelfareProfileUpdated    |
| PLI-100 | 丰富化活动库     | v0.2      | P1           | 否       | EnrichmentActivityLogged |
| PLI-101 | 个性化丰富化计划 | v1.0      | P2           | 是       | EnrichmentPlanCreated    |
| PLI-102 | 选择与退出记录   | v1.0      | P2           | 否       | AgencyObservation        |
| PLI-103 | 环境负荷记录     | v1.0      | P2           | 否       | EnvironmentObservation   |
| PLI-104 | 压力恢复时间     | v1.0      | P2           | 是       | RecoveryTimeObservation  |
| PLI-105 | 低刺激风险提示   | v1.0      | P2           | 规则为主 | WelfareRiskSignal        |
| PLI-106 | 老年生活质量问卷 | v1.0      | P2           | 否       | QualityOfLifeAssessment  |
| PLI-107 | 临终照护趋势视图 | Future    | Future       | 是       | PalliativeObservation    |
| PLI-108 | 福利证据解释     | v1.0      | P2           | 是       | ExplanationViewed        |
| PLI-109 | 多宠资源冲突     | Future    | Future       | 是       | ResourceConflictObserved |
| PLI-110 | 福利咨询摘要     | Future    | Future       | 是       | WelfareBriefGenerated    |

## Social / Pet Friends

| **ID**  | **Feature**       | **Stage** | **Priority** | **AI?**  | **Event**                   |
|---------|-------------------|-----------|--------------|----------|-----------------------------|
| PLI-111 | 社交偏好档案      | v0.2      | P1           | 否       | SocialProfileUpdated        |
| PLI-112 | 宠物好友关系      | v0.2      | P1           | 否       | PetRelationshipCreated      |
| PLI-113 | 互动事件记录      | v0.2      | P1           | 否       | SocialInteraction           |
| PLI-114 | 互动后双向反馈    | v1.0      | P2           | 否       | InteractionFeedback         |
| PLI-115 | 经验型好友匹配    | v1.0      | P2           | 是       | FriendRecommendation        |
| PLI-116 | 社交安全筛选      | v1.0      | P2           | 规则为主 | SocialSafetyCheck           |
| PLI-117 | 社交基线          | v1.0      | P2           | 是       | SocialBaselineUpdated       |
| PLI-118 | 社交异常变化提醒  | Future    | Future       | 是       | SocialChangeSignal          |
| PLI-119 | 熟悉人关系        | v1.0      | P2           | 否       | HumanPetRelationshipUpdated |
| PLI-120 | 健康/照护同类群组 | Future    | Future       | 否       | CohortJoined                |
| PLI-121 | 训练/成长小组     | Future    | Future       | 否       | GroupJoined                 |
| PLI-122 | 社交可见性控制    | v1.0      | P2           | 否       | SocialPrivacyChanged        |
| PLI-123 | 举报与安全治理    | Future    | Future       | 是       | ReportSubmitted             |
| PLI-124 | 好友共同回忆      | Future    | Future       | 否       | SharedMemoryCreated         |

## Devices / Home Intelligence

| **ID**  | **Feature**      | **Stage** | **Priority** | **AI?**  | **Event**                |
|---------|------------------|-----------|--------------|----------|--------------------------|
| PLI-125 | 设备账户连接     | v1.0      | P2           | 否       | DeviceConnected          |
| PLI-126 | 设备与宠物绑定   | v1.0      | P2           | 否       | DevicePetLinked          |
| PLI-127 | 统一事件转换     | v1.0      | P2           | 否       | DeviceEventNormalized    |
| PLI-128 | 多宠个体归属     | v1.0      | P2           | 是       | EventAttribution         |
| PLI-129 | 设备数据质量检测 | v1.0      | P2           | 是       | DeviceQualityIssue       |
| PLI-130 | 家庭摄像头事件   | v1.0      | P2           | 是       | CameraCandidateEvent     |
| PLI-131 | AI事件审核队列   | v1.0      | P2           | 否       | EventReviewed            |
| PLI-132 | 家庭状态摘要     | v1.0      | P2           | 是       | HomeSummaryGenerated     |
| PLI-133 | 跨设备冲突解释   | Future    | Future       | 是       | EvidenceConflictDetected |
| PLI-134 | 安全自动化规则   | v1.0      | P2           | 规则为主 | AutomationExecuted       |
| PLI-135 | 高风险动作需确认 | v1.0      | P2           | 是       | ActionApprovalRequired   |
| PLI-136 | 环境传感器       | Future    | Future       | 否       | EnvironmentObservation   |
| PLI-137 | 设备变更版本化   | Future    | Future       | 否       | DeviceVersionRecorded    |
| PLI-138 | 设备开发者接口   | Future    | Future       | 否       | IntegrationRegistered    |

## Care Services

| **ID**  | **Feature**      | **Stage** | **Priority** | **AI?**  | **Event**                  |
|---------|------------------|-----------|--------------|----------|----------------------------|
| PLI-139 | 服务需求画像     | v1.0      | P2           | 是       | ServiceNeedProfile         |
| PLI-140 | 服务Care Card    | v1.0      | P2           | 否       | ServiceCareCardIssued      |
| PLI-141 | 服务者匹配       | v1.0      | P2           | 是       | ServiceRecommendation      |
| PLI-142 | 服务请求与预约   | v1.0      | P2           | 否       | ServiceBookingCreated      |
| PLI-143 | 服务前交接清单   | v1.0      | P2           | 否       | ServiceHandoffCompleted    |
| PLI-144 | 服务期间更新     | v1.0      | P2           | 否       | ServiceCareUpdate          |
| PLI-145 | 异常升级流程     | v1.0      | P2           | 规则为主 | ServiceIncidentEscalated   |
| PLI-146 | 服务结束总结     | v1.0      | P2           | 是       | ServiceOutcome             |
| PLI-147 | 服务偏好学习     | Future    | Future       | 是       | ServicePreferenceUpdated   |
| PLI-148 | 评价拆分         | v1.0      | P2           | 否       | ServiceReview              |
| PLI-149 | 服务者资质/身份  | v1.0      | P2           | 否       | ProviderCredentialVerified |
| PLI-150 | 服务支付状态     | Future    | Future       | 否       | ServicePaymentEvent        |
| PLI-151 | 专业服务记录回流 | v1.0      | P2           | 否       | ProfessionalServiceRecord  |
| PLI-152 | 纠纷与事故记录   | Future    | Future       | 否       | ServiceDisputeOpened       |

## Adoption / Rescue

| **ID**  | **Feature**         | **Stage** | **Priority** | **AI?** | **Event**              |
|---------|---------------------|-----------|--------------|---------|------------------------|
| PLI-153 | 救助/收容档案导入   | Future    | Future       | 否      | RescueIntake           |
| PLI-154 | 寄养观察记录        | Future    | Future       | 否      | FosterObservation      |
| PLI-155 | 领养家庭画像        | Future    | Future       | 否      | AdopterProfileCreated  |
| PLI-156 | 解释型领养匹配      | Future    | Future       | 是      | AdoptionRecommendation |
| PLI-157 | 见面/试养记录       | Future    | Future       | 否      | AdoptionTrialEvent     |
| PLI-158 | 领养后身份转移      | Future    | Future       | 否      | OwnershipTransferred   |
| PLI-159 | 30/90/180天适应跟踪 | Future    | Future       | 否      | AdoptionFollowup       |
| PLI-160 | 领养后支持计划      | Future    | Future       | 是      | AdoptionCarePlan       |
| PLI-161 | 稳定/退养Outcome    | Future    | Future       | 否      | AdoptionOutcome        |
| PLI-162 | 机构端批量管理      | Future    | Future       | 否      | OrgWorkflowEvent       |

## Nutrition / Commerce

| **ID**  | **Feature**           | **Stage** | **Priority** | **AI?**  | **Event**                       |
|---------|-----------------------|-----------|--------------|----------|---------------------------------|
| PLI-163 | 饮食档案              | v0.2      | P1           | 否       | NutritionProfileUpdated         |
| PLI-164 | 食品实际使用          | v1.0      | P2           | 否       | ProductUseEvent                 |
| PLI-165 | 能量/份量辅助         | v1.0      | P2           | 规则为主 | NutritionRecommendation         |
| PLI-166 | 商品约束过滤          | v1.0      | P2           | 规则为主 | ProductEligibilityCheck         |
| PLI-167 | 食品/用品使用结果     | v1.0      | P2           | 否       | ProductOutcome                  |
| PLI-168 | 玩具/丰富化偏好学习   | v1.0      | P2           | 是       | PreferenceUpdated               |
| PLI-169 | 个性化商品推荐        | Future    | Future       | 是       | ProductRecommendation           |
| PLI-170 | 消耗品补货预测        | Future    | Future       | 是       | ReorderPrediction               |
| PLI-171 | 商品召回/风险通知     | Future    | Future       | 是       | ProductSafetyAlert              |
| PLI-172 | 营养师/兽医计划       | v1.0      | P2           | 否       | ProfessionalNutritionPlan       |
| PLI-173 | 推荐理由与商业披露    | Future    | Future       | 是       | RecommendationExplanationViewed |
| PLI-174 | Pet Consumption Graph | Future    | Future       | 否       | ConsumptionGraphUpdated         |

## Finance / Insurance

| **ID**  | **Feature**    | **Stage** | **Priority** | **AI?**  | **Event**             |
|---------|----------------|-----------|--------------|----------|-----------------------|
| PLI-175 | 养宠费用账本   | v0.2      | P1           | 否       | ExpenseRecorded       |
| PLI-176 | 家庭费用分摊   | v1.0      | P2           | 否       | ExpenseSplit          |
| PLI-177 | 年度预算与趋势 | v1.0      | P2           | 是       | BudgetUpdated         |
| PLI-178 | 未来支出预测   | Future    | Future       | 是       | CostForecastGenerated |
| PLI-179 | 保单档案       | v1.0      | P2           | 否       | InsurancePolicyAdded  |
| PLI-180 | 理赔材料整理   | v1.0      | P2           | 是       | ClaimPackageGenerated |
| PLI-181 | 理赔状态跟踪   | v1.0      | P2           | 否       | ClaimStatusUpdated    |
| PLI-182 | 权益提醒       | Future    | Future       | 规则为主 | BenefitReminder       |
| PLI-183 | 支付授权边界   | Future    | Future       | 否       | PaymentApproval       |
| PLI-184 | 费用/理赔导出  | v1.0      | P2           | 否       | FinanceExported       |

## Life Timeline / Archive

| **ID**  | **Feature**        | **Stage** | **Priority** | **AI?** | **Event**             |
|---------|--------------------|-----------|--------------|---------|-----------------------|
| PLI-185 | 统一生命时间线     | v0.1      | P0           | 否      | TimelineViewed        |
| PLI-186 | 事件过滤与视图     | v0.1      | P0           | 否      | TimelineFiltered      |
| PLI-187 | 里程碑             | v0.2      | P1           | 否      | MilestoneCreated      |
| PLI-188 | 照片/视频/声音回忆 | v0.2      | P1           | 否      | MemoryArtifactAdded   |
| PLI-189 | 年度回顾           | v1.0      | P2           | 是      | AnnualReviewGenerated |
| PLI-190 | 时间线语义搜索     | v0.2      | P1           | 是      | LifeSearch            |
| PLI-191 | 跨时期对比         | v1.0      | P2           | 是      | PeriodCompared        |
| PLI-192 | Life Archive       | Future    | Future       | 否      | LifeArchiveUpdated    |
| PLI-193 | 纪念模式           | Future    | Future       | 否      | MemorialModeEnabled   |
| PLI-194 | 生命故事生成       | Future    | Future       | 是      | LifeStoryGenerated    |
| PLI-195 | 共同回忆授权       | Future    | Future       | 否      | SharedMemoryApproved  |
| PLI-196 | 长期档案导出       | Future    | Future       | 否      | LifeArchiveExported   |

## Pet Agent / Search

| **ID**  | **Feature**      | **Stage** | **Priority** | **AI?** | **Event**                      |
|---------|------------------|-----------|--------------|---------|--------------------------------|
| PLI-197 | 宠物个人问答     | v0.2      | P1           | 是      | AgentQuery                     |
| PLI-198 | 跨域语义搜索     | v0.2      | P1           | 是      | SearchQuery                    |
| PLI-199 | 为什么发生提示   | v0.2      | P1           | 是      | ExplanationGenerated           |
| PLI-200 | 低风险任务计划   | v0.2      | P1           | 是      | AgentPlanCreated               |
| PLI-201 | 跨域照护编排     | v1.0      | P2           | 是      | WorkflowCreated                |
| PLI-202 | 预约类动作确认   | v1.0      | P2           | 是      | ActionApprovalRequested        |
| PLI-203 | 购买类动作确认   | Future    | Future       | 是      | ActionApprovalRequested        |
| PLI-204 | 医疗动作硬边界   | v0.1      | P0           | 是      | SafetyPolicyApplied            |
| PLI-205 | 结构化长期记忆   | v0.2      | P1           | 是      | MemoryFactReferenced           |
| PLI-206 | 事件驱动主动提醒 | v1.0      | P2           | 是      | ProactiveAlert                 |
| PLI-207 | 提醒降噪与合并   | v1.0      | P2           | 是      | AlertBundled                   |
| PLI-208 | 领域代理路由     | Future    | Future       | 是      | AgentRouted                    |
| PLI-209 | Agent行动日志    | v1.0      | P2           | 否      | AgentAuditEvent                |
| PLI-210 | 沟通风格与复杂度 | v1.0      | P2           | 是      | CommunicationPreferenceChanged |

## Platform / Data / Safety

| **ID**  | **Feature**                     | **Stage** | **Priority** | **AI?**  | **Event**               |
|---------|---------------------------------|-----------|--------------|----------|-------------------------|
| PLI-211 | Canonical Pet Life Event Schema | v0.1      | P0           | 否       | SchemaEvent             |
| PLI-212 | 来源等级                        | v0.1      | P0           | 否       | ProvenanceAttached      |
| PLI-213 | 记录不可静默覆盖                | v0.1      | P0           | 否       | RecordVersioned         |
| PLI-214 | 模型/规则版本追踪               | v0.1      | P0           | 否       | AIInferenceLogged       |
| PLI-215 | 细粒度同意中心                  | v0.1      | P0           | 否       | ConsentChanged          |
| PLI-216 | 删除与保留策略                  | v0.1      | P0           | 否       | DeletionRequested       |
| PLI-217 | 登录与设备安全                  | v0.1      | P0           | 否       | SecurityEvent           |
| PLI-218 | 有害内容安全                    | v1.0      | P2           | 是       | SafetyModerationEvent   |
| PLI-219 | 统一通知中心                    | v0.1      | P0           | 否       | NotificationCreated     |
| PLI-220 | 核心Care Card离线可用           | v1.0      | P2           | 否       | OfflineBundleUpdated    |
| PLI-221 | 事件幂等与重复检测              | v0.1      | P0           | 规则为主 | DuplicateEventDetected  |
| PLI-222 | 跨来源宠物归一                  | v1.0      | P2           | 是       | ExternalIdentityMapped  |
| PLI-223 | 专业内容版本管理                | v0.2      | P1           | 否       | ContentVersionPublished |
| PLI-224 | 产品实验框架                    | v1.0      | P2           | 否       | ExperimentAssigned      |
| PLI-225 | 隐私保护产品分析                | v0.2      | P1           | 否       | AnalyticsEvent          |
| PLI-226 | 数据质量评分                    | v1.0      | P2           | 是       | DataQualityScored       |
| PLI-227 | AI离线评测框架                  | v0.1      | P0           | 否       | ModelEvaluationRun      |
| PLI-228 | 生产监控与事故响应              | v0.2      | P1           | 否       | IncidentOpened          |

# 附录B：事件类型与Canonical Schema建议

| **Namespace** | **示例**                                                                                           |
|---------------|----------------------------------------------------------------------------------------------------|
| identity.\*   | pet.created / identifier.added / pet.merged / ownership.transfer                                   |
| care.\*       | task.created / task.completed / handoff.started / handoff.ended / grant.changed                    |
| daily.\*      | meal / drink / walk / litter / sleep / play / weight                                               |
| behavior.\*   | behavior.observed / trigger.logged / incident.logged                                               |
| training.\*   | goal.created / session.completed / skill.progress                                                  |
| health.\*     | health_event.opened / observation.added / triage.assigned / vet_brief.generated / outcome.recorded |
| medication.\* | plan.created / dose.recorded / dose.missed / course.completed                                      |
| social.\*     | relationship.created / interaction.recorded / relationship.changed                                 |
| device.\*     | device.bound / reading.ingested / quality.changed / disconnected                                   |
| service.\*    | service.requested / care_update / incident / completed / outcome                                   |
| commerce.\*   | product.exposed / purchased / used / reaction / outcome                                            |
| finance.\*    | expense.recorded / claim.package / benefit.used                                                    |
| life.\*       | milestone / memory / annual_summary / archive_export                                               |
| system.\*     | consent.changed / audit.security / inference.created / notification.sent                           |

## B.1 Schema Versioning

- event_type采用稳定namespace；payload带schema_version。

- 新增可选字段保持向后兼容；破坏性变化创建新version并提供迁移/adapter。

- Event不可原地“改历史”；更正用correction/retraction/supersedes事件。

- AI推断不写回原始事实字段，单独Inference表/事件。

# 附录C：API与Agent Tool示例

POST /pets/{pet_id}/events  
Authorization: Bearer ...  
Idempotency-Key: ...  
{  
"type": "daily.meal",  
"occurred_at": "...",  
"payload": {"amount":60,"unit":"g"},  
"source_type": "owner_reported"  
}

| **Tool**                  | **权限**                    | **高风险?** | **输出**                          |
|---------------------------|-----------------------------|-------------|-----------------------------------|
| pet.search_timeline       | read pet events             | 否          | 带Event引用的结果。               |
| care.create_task          | write task                  | 低          | draft/created task。              |
| care.create_handoff       | grant scoped access         | 中          | 需Owner确认。                     |
| health.start_intake       | write health event          | 中          | 健康事件与问题列表。              |
| health.generate_vet_brief | read/write derived artifact | 中          | 可审计摘要。                      |
| service.prepare_booking   | read profile/create draft   | 中          | 候选与草稿。                      |
| payment.commit            | external financial action   | 高          | 默认不对Agent开放或强制二次确认。 |
| ownership.transfer        | identity transfer           | 极高        | 不允许自动执行。                  |

# 附录D：术语表

| **术语**           | **定义**                                                |
|--------------------|---------------------------------------------------------|
| Pet ID             | 平台内代表同一只宠物的稳定主键，不等于芯片号。          |
| Pet Timeline       | 按时间组织的生命事件视图。                              |
| LifeEvent          | 平台统一事实事件。                                      |
| Provenance         | 数据来源与形成过程。                                    |
| Outcome            | 事件/干预后产生的结果。                                 |
| Personal Baseline  | 这只宠物自己的历史正常范围/模式。                       |
| Care Network       | 共同照护该宠物的人和专业角色网络。                      |
| Pet Friend Graph   | 基于真实互动形成的宠物关系图。                          |
| Welfare            | 生活质量/福利状态，区别于疾病诊断。                     |
| Vet Brief          | 面向兽医的结构化就诊前摘要。                            |
| Care Card          | 面向临时照护者的最小必要照护信息。                      |
| Agent Orchestrator | 调用受限工具完成跨域任务的上层AI入口。                  |
| Red Flag Engine    | 独立于LLM的高风险确定性规则层。                         |
| Canonical Schema   | 平台内部稳定数据模型，外部格式通过Adapter映射。         |
| Digital Twin       | 长期研究目标，只有在足够纵向Outcome与验证基础上才成立。 |

# 附录E：Sources

以下来源继承自上一轮深度研究，用于支持市场、科研、医疗AI、设备、训练、社交、老龄、互操作等设计判断。产品/技术架构中的工程建议属于本母版设计判断，不应误解为这些来源的直接结论。

1\. Polapragada S. AI applications in veterinary digital health: a systematic survey. Frontiers in Veterinary Science, 2026. https://pubmed.ncbi.nlm.nih.gov/42597169/

2\. 央视网：《2026年中国宠物行业白皮书》正式发布：市场规模迈过3100亿大关，2026-01-05。 https://business.cctv.cn/2026/01/05/ARTIdmv2AWmVeRVodaZYLOvQ260105.shtml

3\. UNLEASHED by Purina: Class of 2026 / AI-driven pet health, preventive insurance and veterinary platforms. https://www.unleashedbypurina.com/press-releases/backs-six-global-start-ups

4\. FirstVet insurance partnerships and tele-veterinary service; Vetster for insurers. https://firstvet.com/de/versicherung

5\. VetRec + Veterinary Emergency Group AI documentation rollout, 2026-06-11. https://vetrec.io/blog/veg-vetrec-ai-powered-veterinary-documentation

6\. Digitail: AI-native veterinary PIMS and AI Patient Intake. https://digitail.com/

7\. 贝塔猫智能科技；骁宠SaaS。 https://www.betacat.co/

8\. ACVR/ECVDI position statement on artificial intelligence, JAVMA, 2025. https://pubmed.ncbi.nlm.nih.gov/40107235/

9\. Zoetis Vetscan OptiCell and VitalRADS acquisition announcement, 2026. https://www.zoetis.com/news-and-insights/featured-stories/vetscan-opticell-named-best-new-companion-animal-product

10\. PETKIT Kitbo AI Health Assistant, launched 2026-08-18. https://www.petkit.com/blogs/blog/kitbo-petkits-ai-powered-pet-health-assistant-for-smarter-pet-care

11\. Langenfeld-McCoy et al. Enhancing Detection of Feline CKD Through Smart Litter Box Monitoring. Animals, 2026. https://pubmed.ncbi.nlm.nih.gov/42121739/

12\. AI-COLLAR study: longitudinal heart and respiratory rate monitoring in 703 dogs, 2025. https://pubmed.ncbi.nlm.nih.gov/41030684/

13\. Kang et al. AI-Based Identification of Common Canine Skin Lesions. Veterinary Dermatology, 2026. https://pubmed.ncbi.nlm.nih.gov/42067986/

14\. Machine learning-assisted gait analysis for lameness detection in heterogeneous dog populations. The Veterinary Journal, 2026. https://www.sciencedirect.com/science/article/abs/pii/S1090023326001991

15\. Automated acute pain assessment in brachycephalic cats using Feline Grimace Scale, JAVMA, 2026. https://pubmed.ncbi.nlm.nih.gov/42486150/

16\. Agreement of Feline Grimace Scale scores between chatbots and an expert rater. Scientific Reports, 2025. https://pubmed.ncbi.nlm.nih.gov/41366265/

17\. Lassie preventive pet insurance: prevention budget, rewards, tracking and online vets. https://de.lassie.co/

18\. Trupanion: \$4B veterinary invoices / most common claims, 2026. https://vet.trupanion.com/articles/4-billion-in-paid-claims/

19\. 皇家宠物食品 × 贝塔猫：智能推荐+精准营养，2026。 https://www.royalcanin.com.cn/articles/2710

20\. PetPace senior dog monitoring and individual physiological baseline. https://petpace.com/use-cases/senior-dogs/

21\. PETcision Guard AI + liquid biopsy + NGS canine cancer screening, 2026. https://petcision.com/en/sushitecktokyo2026-en/

22\. 新华网：中国移动发布AI智能可视宠物项圈，2026-06-26。 https://app.xinhuanet.com/news/article.html?articleId=2026062626ebe37cc4e84f039cb6dea4404639b7

23\. 中央网信办、工信部、公安部：2026年个人信息保护系列专项行动。 https://gsca.miit.gov.cn/zwgk/wlgl/art/2026/art_9b21a3c6342640bf9dd7f7f2dc44f2fd.html

24\. Arshad et al. Artificial intelligence and companion animals: Perspectives on digital healthcare for dogs, cats, and pet ownership. Research in Veterinary Science, 2025. https://pubmed.ncbi.nlm.nih.gov/40561905/

25\. Review of applications of deep learning in veterinary diagnostics and animal health. Frontiers in Veterinary Science, 2025. https://pubmed.ncbi.nlm.nih.gov/40144529/

26\. Disease Prediction and Precision Veterinary Medicine: AI in Small Animal Practice, 2026. https://pubmed.ncbi.nlm.nih.gov/42276961/

27\. AAHA: Let Your Veterinarian Diagnose Your Dog, Not AI, 2025. https://www.aaha.org/resources/decoding-dog-symptoms-let-your-veterinarian-diagnose-your-dog-not-ai/

28\. AAHA: Benefits and considerations of AI scribing in veterinary care, 2025. https://www.aaha.org/resources/the-benefits-of-your-vet-using-ai-scribing/

29\. UNLEASHED/Purina: Petalife preventive AI health monitoring platform. https://www.unleashedbypurina.com/winners/petalife

30\. TTcare Vet / AI FOR PET veterinary clinical AI suite. https://ttcarevet.com/en

31\. PetDesk veterinary mobile app: 7M+ pet owners, 12,000+ practices. https://petdesk.com/products/veterinary-mobile-app

32\. Petleo veterinary platform: online intake, appointments, PIMS integration and owner app. https://vet.petleo.net/

33\. 中国畜牧业协会宠物产业分会：我国宠物诊疗发展现状与趋势展望，2025。 https://pet.caaa.cn/html/pet_hyzx/pet_hydt/2025/0320/205.html

34\. 人民网：我的宠物AI养，2026-06-24。 https://health.people.com.cn/n1/2026/0624/c14739-40746348.html

35\. Chewy: acquisition of Modern Animal and integrated pet healthcare ecosystem, 2026-04-08. https://investor.chewy.com/news-and-events/news/news-details/2026/Chewy-to-Acquire-Modern-Animal-Accelerating-Evolution-to-a-Fully-Integrated-Healthcare-Ecosystem/default.aspx

36\. U.S. National Institute on Aging: Dog Aging Project overview. https://www.nia.nih.gov/research/dab/dog-aging-project

37\. Harrison BR et al. Dogs and humans share biomarkers of mortality. J Gerontol A Biol Sci Med Sci, 2026. https://pubmed.ncbi.nlm.nih.gov/41429575/

38\. Blood biomarkers and breed genetics of aging in pet dogs. Dog Aging Project, 2026. https://pmc.ncbi.nlm.nih.gov/articles/PMC13042038/

39\. OLD DOG – Validating the dog as an animal model for human aging studies. Journal of Frailty & Aging, 2026. https://www.sciencedirect.com/science/article/pii/S2260134126000149

40\. Loyal: LOY-002 and canine longevity drug development / FDA CVM expanded conditional approval pathway, 2026. https://loyal.com/for-vets

41\. Embark for Veterinarians: genetic health screening and clinical guidance. https://embarkvet.com/vets/

42\. Basepaws Cat DNA Test: genetic and oral microbiome risk reports. https://basepaws.com/products/basepaws-cat-dna-test

43\. AnimalBiome Veterinary: gut metagenomic testing for cats and dogs. https://animalbiome.vet/products/gut-health-test-for-cats-dogs-single-test

44\. Bamberger T et al. Mapping the canine gut microbiome: insights from the Dog Aging Project. Nature Communications, 2026. https://www.nature.com/articles/s41467-026-73193-y

45\. Palez N et al. Canine gait analysis using inertial sensors and deep learning for orthopedic and neurological disorders. Scientific Reports, 2026. https://www.nature.com/articles/s41598-026-40717-x

46\. Machine learning-assisted gait analysis for lameness detection in heterogeneous dog populations. The Veterinary Journal, 2026. https://www.sciencedirect.com/science/article/pii/S1090023326001991

47\. Pahk JH et al. Deep learning-based markerless gait analysis model for dogs. American Journal of Veterinary Research, 2026. https://pubmed.ncbi.nlm.nih.gov/41490686/

48\. Sleep–wake disturbance in canine cognitive dysfunction: guardian-reported patterns and screening tool. The Veterinary Journal, 2026. https://www.sciencedirect.com/science/article/pii/S109002332600273X

49\. Advances in biomarker discovery for canine cognitive dysfunction. Veterinary Research Communications, 2026. https://link.springer.com/article/10.1007/s11259-026-11425-8

50\. Robertson J et al. Liquid biopsy technologies for canine cancer detection and management. JAVMA, 2026. https://pubmed.ncbi.nlm.nih.gov/42269671/

51\. The Expanding Role of Artificial Intelligence in Companion Animal Care: A Systematic Review. Animals, 2026. https://pubmed.ncbi.nlm.nih.gov/41976014/

52\. Discriminating owner versus unfamiliar handler during everyday human–dog interaction: a multimodal sensing feasibility study. Applied Animal Behaviour Science, 2026. https://www.sciencedirect.com/science/article/pii/S0168159126002182

53\. Veterinary Extension of SNOMED CT (VetSCT), March 2026 release. https://vtsl.vetmed.vt.edu/TerminologyMgt/browser/

54\. Veterinary Terminology Services: Small Animal Problems and Diagnoses Terms (SA-PDT), 2026. https://vtsltest.vetmed.vt.edu/sa/

55\. Fine-tuning foundational models to code diagnoses from veterinary health records; 246,473 visits / 7,739 SNOMED codes. 2026. https://pmc.ncbi.nlm.nih.gov/articles/PMC12923131/

56\. Vet Data Standards: emerging advocacy for FHIR-based veterinary record portability (industry initiative; not a formal global veterinary standard). https://www.vetdatastandards.com/

57\. Winter MD. Regulation of Artificial Intelligence in Veterinary Medicine. Vet Clinics of North America: Small Animal Practice, 2026. https://www.em-consulte.com/article/1825604/regulation-of-artificial-intelligence-in-veterinar

58\. Royal College of Veterinary Surgeons: 2026 guidance on AI use in veterinary practice. https://www.rcvs.org.uk/veterinary-professionals/conduct-and-guidance/resources-and-updates/standards-and-advice-update-spring-2026-guidance-on-the-use-artificial-intelligence-ai-in-practice-and-updates-to-chapter-13

59\. Veterinary AI Transparency Alliance: consultation on responsible AI framework, 2026. https://www.rcvs.org.uk/about-us/news-and-views/news/transparency-alliance-consults-the-veterinary-professions-on-responsible-ai-framework

60\. Vetology: public performance dashboard covering 89+ veterinary radiology classifiers and 11 metrics, 2026. https://vetology.net/vetologys-veterinary-ai-dashboard-now-tracks-11-public-metrics/

61\. Petnow / Petify: AI-powered dog nose-print and cat facial biometric identity, production and API information. https://www.petnow.io/en ; https://www.petnow.io/en/petify

62\. American Animal Hospital Association (AAHA): Universal Pet Microchip Lookup Tool and microchip FAQs, including ISO 11784/11785 and registry fragmentation. https://www.aaha.org/for-veterinary-professionals/microchip-registry-lookup-tool-aaha-find-your-pets-microchip-registry/

63\. 24Petwatch: ISO 11784/85 pet microchips and lost pet recovery services. https://www.24pet.com/products/microchips ; https://www.24pet.com/products/lostpet

64\. 24Pet PetPoint: cloud shelter software covering intake, medical care, microchip integration and adoption workflow. https://www.24pet.com/products/petpoint

65\. Dogo App: dog training platform, reported 4M+ pet parents / 5M dogs and family sharing of training/potty/health logs. https://shop.dogo.app/pages/about-us ; https://dogo.app/onboarding/pp/onboarding-3

66\. DogPack: pet social network with pet profiles and community features; App Store/official help pages, 2026. https://www.dogpackapp.com/help/web/social-web

67\. DogCircle: dog playdate/social app advertising matching by size, energy and personality, 2026 App Store listing. https://apps.apple.com/de/app/dogcircle/id6789357784

68\. Cherry D, Lazebnik T, Henry CJ, Florkiewicz BN. Harnessing AI-based computer vision to evaluate biological and behavioral variables in dog-dog play interactions. Journal of Veterinary Behavior, 2026. https://www.sciencedirect.com/science/article/pii/S1558787826000110

69\. Rover Group: current services and scale (18 countries, 12M+ pets cared for, 41M five-star stays). https://www.rover.com/about-us/ ; https://support.rover.com/hc/en-us/articles/205979666-What-services-are-offered-on-Rover

70\. Wag!: current caregiver services including walking, drop-ins, sitting/boarding, daycare and veterinary advice, 2026. https://support.wagwalking.com/en_us/what-kind-of-services-does-wag-facilitate-pcg-Byo2gw8N9

71\. Pett: shared household pet-care app for feeding, medications, roles and AI report summaries, 2026 App Store listing. https://apps.apple.com/de/app/pett-pet-care-reminders/id6773452497

72\. Furbo Nanny: multi-pet identification, AI alerts, multi-camera support and video history, 2026. https://furbo.com/eu-en/pages/furbo-nanny-updates ; https://furbo.com/eu-en/pages/furbo-nanny

73\. PETKIT: 2026 Kitbo / connected feeding, drinking, litter and behavior ecosystem; China app documentation. https://www.petkit.com/pages/petkit-health ; https://www.petkit.com/blogs/blog/2026-petkit-global-launch-see-the-small-things-early

74\. PETLIBRO: RFID personalized feeding, AI multi-pet camera recognition and Petlibro Care/AI assistant, 2026. https://petlibro.com/products/rfid-smart-feeder-scout-smart-camera ; https://petlibro.com/pages/feeder

75\. Tractive: activity, sleep, resting heart/respiratory rate, barking/scratching and personalized baselines; not a medical device. https://help.tractive.com/hc/en-us/articles/360011024119-What-health-features-does-Tractive-track

76\. Littlewood K et al. Updating the Five Provisions: Aligning Welfare-Focused Care with the Five Domains Model. Animals, 2026. https://pmc.ncbi.nlm.nih.gov/articles/PMC13295444/

77\. Exploring the quality of life in cats: How caretaker perceptions shape simple and systematic assessments. Applied Animal Behaviour Science, 2026. https://doi.org/10.1016/j.applanim.2026.106962

78\. Petfinder mission: searchable adoption database and directory of nearly 11,000 shelters/rescues in US, Canada and Mexico, updated 2026. https://www.petfinder.com/adopt-or-get-involved/about-petfinder/our-mission-0/petfinders-mission/

79\. Petfinder: 60-second Find a Pet quiz for family/home/lifestyle matching, 2026. https://www.petfinder.com/user/profile/create/

80\. ASPCA Meet Your Match: research-based dog/cat adoption matching program using animal assessment, adopter survey and counseling. https://www.aspcapro.org/resource/meet-your-match-pet-adoption-program

81\. Park K-H et al. A Needs Analysis for the Development of an AI-Based Personalized Pet Adoption Matching Service. Journal of Korea Academia-Industrial cooperation Society, 2026. https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART003309747

82\. 蜗牛小店：宠物门店SaaS，公开称覆盖300+城市、7万+门店，支持会员、宠物档案、寄养、医疗提醒和小程序。 https://www.snailpet.com/about/ ; https://www.snailpet.com/pricing/

83\. 宿宠家SaaS：宠物门店店务、寄养、会员、灵活用工、招聘与培训平台，2026。 https://www.suchongjia.com/

84\. Petco Perks/Vital Care membership: nutrition, grooming, veterinary exam and rewards integration. https://www.petco.com/c/vitalcare

85\. BARK / BarkBox: customized recurring toy/treat subscription by size, play/chew style and preferences. https://bark.co/ ; https://www.barkbox.com/faq/

86\. Ollie: personalized dog-food subscription, feeding plan and ongoing health check-ins. https://www.ollie.com/how-it-works/ ; https://www.ollie.com/

87\. Gedankraum Tiere: digital memorial pages for pets with biography, photo/video and QR memorial options, 2026. https://tiere.gedankraum.de/

88\. FureverShare: shared pet care, expense tracking/splitting and shared album, 2026 App Store listing. https://apps.apple.com/de/app/furevershare-shared-pet-care/id6757549494

89\. Petnow API documentation: registration, verification and identification workflows for pet biometrics. https://docs.petnow.io/petify/docs/server-api/identification

90\. Kotrschal K. Companion animals support human wellbeing and health: evolutionary, behavioral and physiological contexts. Frontiers in Psychology, 2026. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2026.1800617/full

91\. Petnow Server API / SDK documentation for pet biometric registration, verification and identification. https://docs.petnow.io/petify/docs/server-api/overview

92\. American Veterinary Society of Animal Behavior (AVSAB): position statements on humane dog training; current board statement reiterates reward-based training and rejects aversive methods. https://avsab.org/resources/position-statements/

# 附录F：Stage F远程证据与当前Blocker

| **项目**               | **状态**                                           |
|------------------------|----------------------------------------------------|
| Public Staging         | LIVE / Real Remote Verification                    |
| Remote Smoke           | 20/20 PASS                                         |
| Remote Auth            | 15/15 PASS                                         |
| Remote Medical Safety  | 9/9 PASS                                           |
| Remote Storage         | 9/9 PASS                                           |
| Remote Privacy         | ALL-PASS                                           |
| Remote Pilot           | ALL-PASS                                           |
| Backup Restore         | 10/10                                              |
| Remote Playwright      | 12/12 PASS                                         |
| Real AI                | 以 /ai/status 为准；real:false 时 EXTERNAL_BLOCKED |
| SMTP                   | 真实凭据决定 EMAIL_REAL                            |
| Independent Production | 域名/DNS/正式地址为硬 Gate                         |
| Git Remote             | 有真实 URL 才能标 Push PASS                        |

## F.1 真实状态标签规则

- BUILD_READY ≠ LIVE。

- CONFIG_READY ≠ DEPLOYED。

- PUBLIC_STAGING_LIVE ≠ 独立 PRODUCTION_LIVE。

- Provider Adapter Ready ≠ AI_REAL。

- Submission Pack Ready ≠ 小程序/App 已审核上线。

# 附录G：Pilot指标、访谈与周报模板

## G.1 Weekly Pilot Report 最小结构

11. Pilot Organizations / Owners / Professionals / Pets。

12. Activation Funnel 与主要 Drop-off。

13. D3 / D7 / D14 连续性。

14. Feature Usage Heatmap。

15. Care Collaboration / Health Closure / Vet Brief Usefulness。

16. Behavior / Training Follow-up。

17. AI Usage / Cost / Unsafe feedback。

18. P0/P1/P2/P3 Bugs 与 Support burden。

19. Companion / Device / Commercial Discovery。

20. Keep / Fix / Investigate / Defer / Remove Candidate。

21. 下周验证问题。

## G.2 访谈问题原则

- 问过去发生过什么，不问抽象愿望。

- 问现有替代方案和成本，不只问“愿不愿意付费”。

- Companion 重点问：上一次在外面想看宠物是什么时候、做了什么、用了什么设备、宠物如何可观察地回应。

- 专业端重点问工作流是否真的会使用 Vet Brief / Timeline / Outcome，而不是“产品好不好看”。

# 附录H：PLI Companion候选能力矩阵

| **能力**           | **Owner价值** | **Pet认知负担** | **主要风险**  | **进入条件**           |
|--------------------|---------------|-----------------|---------------|------------------------|
| Remote Observe     | 高            | 0               | 隐私/过度查看 | 设备+权限+真实需求     |
| Audio Presence     | 中高          | 极低            | 打扰/音量     | 可控音量+个体反馈      |
| Video Presence     | 中            | 低/不确定       | 无效/隐私     | 不依赖宠物理解屏幕     |
| Remote Treat       | 中高          | 低              | 过量/多人冲突 | Nutrition Guard        |
| Remote Toy         | 中            | 低              | 刺激/安全     | Welfare Guard+设备安全 |
| Pet Initiated      | 潜在高        | 条件学习        | 意图误读      | 训练可行性证据         |
| AI Suggested       | 潜在高        | 0               | 错误心理推断  | 可解释证据+关闭能力    |
| Family Companion   | 中            | 0               | 多人冲突      | session arbitration    |
| Care/Hospital View | 专业/情感高   | 0               | 机构隐私/政策 | 机构Grant/Policy       |

# 附录I：新增术语

| **术语**                  | **定义**                                                                       |
|---------------------------|--------------------------------------------------------------------------------|
| Public Staging            | 真实公网可访问、用于远程验证和受控 Pilot 的预生产环境，不等同独立 Production。 |
| PLI Companion             | 围绕远程观察、存在、环境丰富化和低负担互动的候选横向能力层。                   |
| Remote Presence           | 主人不在现场时，通过可控音视频或设备让宠物接收到熟悉存在刺激。                 |
| Interaction Session       | 一次有开始、有结束、有动作、有可观察响应和审计的远程互动。                     |
| Interaction Welfare Guard | 限制互动频率、时长、投喂和刺激，并在回避/风险时建议或强制停止的安全层。        |
| Pet Initiated Trigger     | 宠物通过按钮、触碰、停留等可观察动作触发系统事件；不等同“想主人”等心理意图。   |
| Interaction Opportunity   | 系统基于可解释事实给出的“当前是否适合互动”的候选建议。                         |
| Candidate Feature         | 尚未进入 canonical 228 Feature Inventory、需要真实证据后才能晋升的设计候选。   |
