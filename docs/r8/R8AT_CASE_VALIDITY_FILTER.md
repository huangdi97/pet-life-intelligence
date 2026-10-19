# PLI R8AT · 历史档案按来源有效性筛选

2026-10-19。分支 `feat/r2p3d-r3-render-truth-ui-closure`；PR #2 保持 OPEN，不合并、不改 main。

## 起点缺口

R8AK 的历史列表只支持指标、时间窗与关键词；来源被撤回/修正后，主人无法只看
“仍然有效”或“已失效”的档案。此前显式记录为 `ACCEPTED_LIMITATION`，理由是读时派生
状态无法稳定 keyset。

## 已实现

### 1. 后端：SQL 有界 anti-join，keyset 不变

`GET /pets/{pid}/life-change-cases?validity=VALID|INVALID`

- `INVALID`：Case 的冻结来源中，存在被撤回（`retracted_at`）或被可见修正
  （`supersedes_event_id` 且 `recorded_at <= now()`）覆盖的事件；
- `VALID`：上述条件的否定；
- 与详情/来源投影使用**同一派生语义**，不引入第二套“有效”定义；
- JSONB 证据数组通过 `jsonb_array_elements_text` 有界展开，不改变
  `(created_at, id)` keyset 顺序；`count` 与分页共用同一过滤；
- 缺失事件 ID 仍由来源页单独报告，不在筛选里伪装成“已失效”。

### 2. 三端筛选

- Web 历史页新增“全部来源 / 来源有效 / 已失效”，与指标筛选组合；
- Android 历史页新增同一组筛选（`pli.r8.history.validity.*`）；
- Mini 档案页新增同一组筛选（`pli.r8.mini-history.validity.*`）；
- 切换筛选会重置分页并重新按 keyset 读取；客户端不本地推导有效性。

### 3. 真实 Android 取证

R8AO 撤回原始来源后，脚本继续：

1. 从 Case 详情点“全部档案”进入真实历史页；
2. 点“已失效”；
3. 必须看到该 Case 的真实列表行；
4. 与 API `validity=INVALID` 的 total/case_id 集合核对；
5. 输出 `case-validity-filter-truth.json` 与 `owner-history-invalid-filter.png`。

## 测试

- `tests/integration/test_r8at_case_validity_filter.py`（2 项）：
  - 撤回失效、修正失效、有效 Case、同宠混合、非法枚举 422；
  - **4 个失效 Case 分两页 keyset 读取**：total 恒为 4、无重复、两页并集等于全部，
    过滤视图不泄漏有效补集。
- `tests/blind_ui/test_r8at_validity_filter.py`（4 项）：派生 SQL 语义、三端传参、
  不声称恢复、真实 Android 门禁存在。
- 新增 `tests/e2e-browser/specs/r8-history-filter.spec.ts`：真实浏览器创建
  “已失效 + 有效”两个 Case，切换三档筛选，断言只显示对应行且“共 N 条档案”同步。
- 后端全量 **795 passed / 0 failed / 0 error**；Web / Android / Mini `tsc` PASS；
  Taro `build:weapp` PASS；本地 Playwright（补录/修正/筛选）**3 passed**。

## exact-HEAD 验证

| 项 | 值 |
|---|---|
| 实现提交 | `ce934fc580cdfe166b321059cc716c2ca48a1d4c` |
| 取证加固 | `dd96d00783fbbe77c28ca4a4b9031fa12cc61bec` |
| 测试加固 | `4b19f1f7ee634e57601785f5a4c4f5c987af9908`（多页 keyset + 浏览器筛选） |
| CI | run `39222183594` **success** |
| Android | run `39222183581` **success**（含真实筛选） |
| OpenAPI | run `39222183653` **success** |
| 本地后端 | **795 passed / 0 failed / 0 error** |
| 本地 Playwright | 补录/修正/筛选 **3 passed** |

真实 Android manifest：

```json
{
  "filter": "INVALID",
  "native_case_row_visible": true,
  "server_filter_total": 1,
  "server_filter_contains_case": true,
  "human_visual_acceptance": "PENDING"
}
```

截图：`owner-history-invalid-filter.png`（Android runtime evidence artifact）。

## 诚实边界

- 筛选只覆盖 **Case 主来源** 的有效性；后续观察来源失效仍由状态
  `FOLLOW_UP_EVIDENCE_INVALIDATED` 表达，二者不合并成一个布尔。
- 缺失来源（不可读取）显示在来源页，不归入“已失效”。
- `NO_VISION_MODEL_USED = TRUE`；`HUMAN_VISUAL_ACCEPTANCE = PENDING`。
