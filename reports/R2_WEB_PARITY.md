# R2_WEB_PARITY — Web 对齐与验证报告

> 阶段：Stage R.2 · 日期：2026-09-26 · 依据 GOAL §70-§71（Web 迁移原则）+ §84（Phase 9）；迁移日志：apps/web/PLI_R2_WEB_MIGRATION.md

## 1. 迁移范围（§84：Today/Timeline/Pet/LifeView/Assistant 优先）

| 页面 | 实现 | 说明 |
|---|---|---|
| Today（Living Canvas） | apps/web/app/page.tsx + _components/today/* | Pet hero → 此刻 → One Attention/Calm → 快速记录 → 最近 life stream → 今天任务 → AI 摘要；桌面双栏 |
| Timeline（Life Stream） | apps/web/app/timeline/page.tsx + _components/timeline/EventList.tsx | Day Group + time spine；来源 chips 用户语言；无 raw event_type/source 泄漏 |
| Pet（Pet World） | apps/web/app/pets/page.tsx + pets/[id]/page.tsx | 物种视觉 hero + Life Summary + Life View 入口 + 意义先行域行 + 同意/数据；移除 PLI-001/002 工程文案 |
| Life View（Photo-first） | apps/web/app/pets/[id]/life-view/page.tsx | 暖深色沉浸舞台 + 此刻 + 生命轨迹 + 3D 诚实态（「3D 形象尚未创建」，无 provider/model raw） |
| Assistant | apps/web/app/agent/page.tsx + _components/agent/* | 「X的助手」pet-aware 头 + vector-icon mode tabs + 双栏解释 rail；Answer 四段结构保留 |

## 2. 桌面特性（§71：非手机 UI 拉宽）

- 桌面双栏组合（persistent context rail）；larger pet canvas；更丰富的 timeline media。
- V4 token：`apps/web/app/globals.css` 增加 --v4-* semantic tokens + v4 组件类（.v4-sec/.v4-hero/.v4-ls/.v4-stage/.v4-attn…），替换 bordered-card density；ui-kit/ui-tokens 管道不动。
- 图标：`apps/web/components/icons.tsx` 31 个 V4 stroke icons；TopNav 5 主入口 + More；emoji 不再作为功能图标。

## 3. Owner Copy Zero Gate（§62 / §98）

- provenance-zh.ts：OWNER_REPORTED→主人记录 / DEVICE→设备记录 / PROFESSIONAL→专业人员 / AI_STRUCTURED→AI 整理 / 系统计算。
- AskPanel ai-off copy 用户语言；ExplainPanel 移除 NOT_AVAILABLE/provider/Red Flag Rule Engine 等 internal terms（4 段模板保留）。
- FilterBar 来源按钮用户语言（internal enum 仅过滤用）。
- Companion graceful empty（web）。

## 4. 验证（2026-09-26 实跑记录）

```text
web typecheck（pnpm --filter @pli/web typecheck）  → exit 0
next build（PLIT_LOCAL_BUILD=1）                   → exit 0（生产构建通过；standalone 跳过为本地约定）
vitest（web）                                      → 22/22 passed
Playwright（web E2E）                              → 修复中（见 R2_FINAL_REPORT Playwright 段，安全/权限断言保留）
```

## 5. Checklist

| 检查 | 结果 |
|---|---|
| Today/Timeline/Pet/LifeView/Assistant 迁移完成（§84） | PASS |
| 桌面双栏 / 非拉宽 | PASS |
| 信息架构与 mobile 一致（Pet-first 语义） | PASS |
| web/mobile 视觉语言一致（§106 P1 项） | PASS（同一 V4 token 语义） |
| Owner internal terms = 0 | PASS（copy zero gate 提交 1b44856） |
| 数据流不变（server component / api-client / session） | PASS（presentation-only） |

## 6. Remaining Issues

- P2/ACCEPTED_DEFER：部分 web responsive polish（§107 类目）；768/1440 宽视觉回归待 VR V3 基线冻结（见 R2_VISUAL_REGRESSION_V3.md）。

## 7. 结论

WEB_OWNER_EXPERIENCE_PASS：**PASS**。
