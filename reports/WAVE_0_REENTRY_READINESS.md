# WAVE_0_REENTRY_READINESS — Wave 0 再入就绪复核

> 日期：2026-09-20 · 阶段：H.1 + H.2 之后（GOAL PHASE S 前置）

## 1. 数据治理复核（未回归）

- is_demo/is_internal/pilot_org + synthetic-domain 过滤保持（Stage G-W0 机制未触碰）。
- H.1/H.2 新增表（pet_visual_*）不参与 /pilot/status 指标（未加入计数查询）。
- REAL PARTICIPANTS = 0 / REAL PETS = 0 / ACTIVATED OWNERS = 0（保持真实）。

## 2. 入口闸门

- PILOT_MODE 保持 OFF（演练后恢复）；邀请制门控代码未改。
- PRE-WAVE0 BACKUP 脚本仍可用（未改备份链路）。

## 3. 结论

**WAVE_0_REENTRY_READY** —— 正式真人进入前流程保持：PILOT_MODE=true → invite-only 复核 → PRE-WAVE0 BACKUP → 1–2 Owner / 1–3 Pet → 24–72h 观测。不自行招募真人。
