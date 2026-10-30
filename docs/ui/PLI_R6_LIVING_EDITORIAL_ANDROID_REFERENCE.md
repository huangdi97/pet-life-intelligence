# PLI R6 · Living Editorial Android Reference · 2026-10-12

**Status:** Design reference and initial Android implementation candidate, NOT owner visual acceptance. Canonical v3.4-R1 / 228 features / 16 domains are unchanged. `NO_VISION_MODEL_USED = TRUE`; `HUMAN_VISUAL_ACCEPTANCE = PENDING`; `REAL_DEVICE_HUMAN_REVIEW = PENDING`.

## The product, not a dashboard

**Pet → Now → What happened → Change → Attention → Action → Memory.** A real individual's face, original photo and lived moments are primary content. Do not use a low-poly dog, lighting tricks, manifest `HIGH_FIDELITY` wording, or giant empty colored fields to suggest individual 3D identity. Unknown does not mean normal, recorded does not mean inferred, and demo does not mean owner-reported.

### Current failure to cure

The Android screenshot from run 38150451442 showed a 440dp high Today stage with a blank central pet area despite a ready 3D runtime manifest. That is a **screenshot-level observed failure**, not proof that the app never renders 3D (Twin Review does). Correctness requires both a manifested 3D state **and** an actual visible pet. First-paint fallback cannot reuse the previous pet's media.

### Competitor patterns (research, no cloning)

- Furbo Nanny Daily Diary: real video highlights make the day into a story; camera ownership must not be required by PLI. https://help.furbo.com/hc/en-us/articles/24145150000665-What-is-Nanny-Report
- Fi Health Tab (March 2026): multi-pet identity selection above activity, rest, diet, medical documents; PLI must support manual facts without device hardware. https://support.tryfi.com/hc/en-us/articles/40989427920659-Health-Tab
- PawStory: photos, milestones and owner memories supply meaningful timeline imagery, rather than generated events. https://play.google.com/store/apps/details?id=com.pawstory.pawstory
- Day One / Finch: editorial reading and subject presence, **not** replacement of real pet facts by cartoon avatars or game mechanics.

## Four Android reference screens

### 1. 今天 · a lived moment, not four KPIs

Owner sees compact pet selection, then a full-width **truthful visual surface**: original uploaded pet photo first, owner-confirmed individual 3D optionally, example-labeled demo art only in demo mode. Small name in the upper left; animal remains unobscured. 吃/喝/活动/睡眠 are a single low ribbon with factual values (— for unknown); any health attention is separately evidence-scoped. Under media: last real event type/freshness, change vs own supported baseline, action 快速记录, then a preview of the timeline. No guessed "happy/healthy/sleeping right now". 5-tab nav fixed and visible.

R6 initial landing removes the oversized count headline from the picture, reduces Today canvas 440→368 dp and keeps a photo/illustration fallback while the actual Android WebView is booting or first-paint is settling. The fallback is keyed by Pet ID + twin version + current surface; that is important for multi-pet data isolation. It is **not** proof that the first-frame defect is fully fixed until same-HEAD screenshots pass.

### 2. 时间线 · a personal photographic life stream

Identity/date first; media-rich *recorded* moments prioritized when original photos/video exist; text-first when no media exists. Each event shows time, owner/equipment/source truth and evidence trail; day separators feel like a private family album. Search and filters are secondary, diary/milestone creation progressive, not first-screen forms. The "on this day" feature must never synthesize memories; historical dates link to a historical Life View, not today's 3D model pretending to be the past.

### 3. 宠物 · the long-term space of this life

Individual pet portrait, true name/age/breed if known, recent life summary and personal baseline. Life / Health / Behavior / Training / Welfare / Social are deep editorial destinations with a short truthful latest-context caption, not six equally sized feature tiles. Profile, caregivers, avatar, and twin management are progressive sections. Photos, async state and records must switch atomically by active Pet ID. Do not show pet A's photo/state while loading pet B.

### 4. 生命视图 · presence through time

A real source portrait or approved twin is the focal point. Have an honest control to select real photo vs approved 3D; a demo GLB never inherits the owner's identity. Warm spatial lighting, grounded subject, no blue holographic outlines, no floating black viewer box. Controls for Now and the current view remain reachable before the tall canvas, while advanced timeline, trends and source/version info can live below. Front/side/back review is a separate inspection studio: three distinct rendered views, owner can choose 很像 / 基本像 / 不像, and 不像 never activates.

## State matrix / truthful empty surfaces

| Pet state | Hero | Explicit promise |
|---|---|---|
| Real photo, no owner-confirmed 3D | Original photo, pet-scoped | 真实照片 |
| Real photo + owner-confirmed individual 3D | Original photo default, 3D optional | 个体形象 · 已确认 |
| Demo template only | Clearly marked 示例图 / 示例 3D | 不是你的宠物扫描 |
| No source media | Truthful neutral glyph, add-photo pathway | 还没有形象 |
| WebView boot / compositor gap | Last **same-pet** known photo or neutral illustration | 正在显示，不能整块空白 |
| No health facts | 尚未记录/未知 | 不等于健康正常 |
| Offline | Stale same-pet evidence with freshness, retry | 不能伪装实时 |

## Visual system / layout authority

Style: **Warm Editorial + Living Space**, not AI SaaS, clinical dashboard or gaming HUD. Candidate surface palette: warm white `#F7F5F0`, oat `#E9E0D2`, sage `#78917B`, dark ink `#34312D`, light terracotta `#C58F6A`. These are visual references, **not** authorization to silently change semantic health colors or baseline files. Typographic hierarchy: one dominant animal or photo, one heading, one latest-record line, one primary action. Avoid card density and empty hero fields. Test 360/393/430dp widths and 1.0/1.3 font scales.

## Gate: engineering is not visual approval

1. Reverify the NEW remote branch HEAD, PR #2 open, CI, Android APK, Web Playwright, blind visual contract and live evidence artifacts; do not quote an old SHA as a current pass.
2. Real Android cold launch: capture first frame, post-load frame, back-navigation and re-entry. A manifest-ready but empty hero is **FAIL/PENDING**, not automatically visual PASS.
3. Verify source-photo priority and clearly labeled fallback at screenshot level; cannot substitute a generated or stylized generic GLB for an individual.
4. Cross-pet primary→secondary→primary **and** persist secondary across restart then select primary; no stale media, events, 3D manifest or health facts.
5. Three view selections must change real camera yaw and produce three distinct rendered images; not_like must never activate.
6. Keep all five first-level tabs, no clipping, back stack to parent, reachability for facts and quick record, accessible touch targets.
7. Visual regression baseline remains unchanged. Screenshot candidates can be compared by the human owner; never use automatic visual models. **HUMAN_VISUAL_ACCEPTANCE = PENDING** until explicitly approved.
8. External resources: real individual 3D asset, physical-device review, and native WeChat DevTools remain separate evidence gates.

This document specifies the complete four-page direction; the current commit is only the **first Android code landing**. Do not call all four screens visually complete until further full runtime redesign and owner approval occur.
