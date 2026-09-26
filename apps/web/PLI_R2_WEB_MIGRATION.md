# PLI R.2 — Owner Web Experience Reconstruction (Migration Log)

Stage R.2 "Product Experience Reconstruction" — owner web portion (feat/pli-v0.2-product-experience-reconstruction).
Presentation-layer only: every existing data flow (server component/data fetching, api-client calls, login/session) is unchanged.

## Files changed (apps/web + shared packages/ui-tokens)

### New web-local foundation
- `apps/web/components/icons.tsx` — V4 vector stroke icon set (31 icons). Emoji is no longer used as a functional icon anywhere in the rebuilt pages or TopNav.
- `apps/web/components/pet-hero.tsx` — Pet-first hero: large graceful species visual + pet name (no letter-circle avatar as primary identity).
- `apps/web/lib/provenance-zh.ts` — provenance → user language (主人记录 / 设备记录 / 专业人员 / AI 整理 / 系统计算).

### Tokens
- `apps/web/app/globals.css` — V4 semantic token block added: `canvas`, `surface`, `surface-raised`, `surface-soft`, `text-primary/secondary/tertiary/inverse`, `brand-primary/brand-secondary/brand-soft`, `attention`, `warning`, `danger`, `success`, `info` (+ soft variants), `divider`, `scrim`, warm radial canvas, warm-dark stage. Plus open-section component classes (`.v4-sec`, `.v4-hero`, `.v4-art`, `.v4-calm`, `.v4-attn`, `.v4-metrics`, `.v4-action`, `.v4-chip`, `.v4-ls` life stream, `.v4-stage`, `.v4-tabs`, `.v4-domain`, …) that replace bordered-card density with spacing/divider hierarchy.

### Today — Living Canvas
- `apps/web/app/page.tsx` — Pet hero (photo/species visual + name "X 今天怎么样？") → 此刻 → One Attention/Calm → 快速记录 → 最近 (compact life stream) → 今天 (tasks) → AI 摘要 note. Desktop two-column.
- `apps/web/app/_components/today/NowCard.tsx` — open section metrics, no table-card.
- `apps/web/app/_components/today/AttentionCard.tsx` — one Attention or Calm state.
- `apps/web/app/_components/today/ActionCard.tsx` — vector-icon quick log, E2E "喂食" button contract kept.
- `apps/web/app/_components/today/RecentCard.tsx` — compact life stream preview with user-language provenance.
- `apps/web/app/_components/today/TasksCard.tsx` — vector icons, no emoji.
- Removed dead files: `apps/web/app/_components/today/ChangeCard.tsx`, `apps/web/app/_components/today/LifeViewCard.tsx`.

### Timeline — Life Stream
- `apps/web/app/timeline/page.tsx` — day-grouped Life Stream, desktop two-column with persistent pet context rail.
- `apps/web/app/_components/timeline/EventList.tsx` — Day Group + time spine; type icons; user-language payload summary; provenance chips; no raw `event_type` / `OWNER_REPORTED` / `source:` leakage.
- `apps/web/app/_components/timeline/FilterBar.tsx` — source buttons now user language; internal enum kept only for filtering.
- `apps/web/app/_components/timeline/DayBackCard.tsx` — open section, no raw 3D internals.

### Pet — Pet World
- `apps/web/app/pets/page.tsx` — pet list rows with species visual, no engineering copy ("PLI-001/002" removed).
- `apps/web/app/pets/[id]/page.tsx` — Pet hero (age · breed · sex) + Life Summary + Life View entry + meaning-first domain rows + consent/data, desktop two-column.

### Life View — Photo-first
- `apps/web/app/pets/[id]/life-view/page.tsx` — warm-dark immersive stage + 此刻 + 生命轨迹 + secondary 3D section.
- `.../life-view/_components/StateOverlayCard.tsx` — user-facing metric rows ("有来源的数据").
- `.../life-view/_components/ProviderStatusCard.tsx` — "3D 形象尚未创建", no `provider:`/`real` internals.
- `.../life-view/_components/ModelVersionsCard.tsx` — status in user language (已激活/待你确认/生成失败…), no raw enums.
- `.../life-view/_components/RealPhotoCard.tsx` — open section.

### Assistant
- `apps/web/app/agent/page.tsx` — pet-aware header ("X的助手"), vector-icon mode tabs, two-column with explanation rail.
- `apps/web/app/agent/_components/AskPanel.tsx` — spec §53 empty state; ai-off copy in user language. Answer structure 结论→依据→不确定性→下一步 untouched (`AnswerPanel.tsx` unchanged).
- `apps/web/app/agent/_components/ExplainPanel.tsx` — removed internal terms (NOT_AVAILABLE / provider / Red Flag Rule Engine) → user language, 4-section template preserved.
- `apps/web/app/agent/_components/{Brief,Find,Plan}Panel.tsx` — open sections.

### Nav
- `apps/web/components/TopNav.tsx` — vector icons for the 5 primary entries + More chevron (labels/select/退出 contracts unchanged).

## V4 tokens applied
canvas · surface · surface-raised · text-primary / text-secondary / text-tertiary / text-inverse · brand-primary · brand-secondary · brand-soft · attention · warning · danger · success · info — consumed as `--v4-*` custom properties in `apps/web/app/globals.css`; the ui-kit/ui-tokens existing token pipeline is untouched.

## Verification command outputs
(recorded below as run during this migration)

- `pnpm --filter @pli/web typecheck` → exit 0, no errors.
- `PLIT_LOCAL_BUILD=1 pnpm --filter @pli/web build` → exit 0, Next.js production build succeeded (standalone skipped for local Windows build, matching repo convention).
