# PLI R.2 — Mini (Taro) Owner Sync Log

Stage R.2 "Product Experience Reconstruction" — apps/mini portion on
`feat/pli-v0.2-product-experience-reconstruction`. Presentation-layer only;
all data flows (network/api, session, Taro navigation) unchanged.

## Files changed

### Tokens / global
- `src/styles/tokens.scss` — V4 semantic tokens (warm canvas, surface-*,
  text-*, brand-*, attention/warning/danger/success/info, divider, scrim) +
  open-section/life-stream/attention classes replacing bordered-card density.
- `src/app.scss`, `src/app.config.ts` — V4 warm canvas + demo notes.

### Today (index) — Living Canvas
- `src/pages/index/index.tsx` — pet hero → 此刻 (LifeSignal) → One
  Attention/Calm → 快速记录 → 最近 life-stream preview → 陪伴入口.
- `src/pages/index/_components/index.ts` — new composition (PetHero,
  LifeSignal, AttentionPanel, LifeStream, EmptyState/InlineError).
- Removed card-first components: `current_state.tsx`, `attention_card.tsx`,
  `tasks_card.tsx`, `recent_events.tsx`, `today_header.tsx` (superseded).
- `_lib.ts`, `_components/quicklog_sheet.tsx`, `companion_entry.tsx`,
  `monitor_card.tsx` — restyled to V4.

### Pet + Life View
- `src/pages/pets/index.tsx` — Pet World (species visual hero, domain
  meaning rows).
- `src/pages/pets/life-view/index.tsx` — photo-first Life View with honest
  "尚未创建 / 等待连接真实服务" 3D state (no fake 3D, poster/fallback per §72).
- `src/pages/timeline/index.tsx` — day-grouped Life Stream, no per-event
  cards.

### Assistant (agent)
- `src/pages/agent/index.tsx` — pet context ("豆豆的助手"), Ask primary mode,
  answer contract 结论→依据→不确定性→下一步 kept.
- `_components/ask_panel.tsx`, `brief_panel.tsx`, `find_panel.tsx`,
  `plan_panel.tsx`, `explain_panel.tsx`, `index.ts` — V4 language/visuals;
  removed equal-weight `tabs.tsx`.
- `src/utils/usePets.ts` — pet context helper.

## Verification
- `npx tsc --noEmit` (apps/mini): 0 errors.
- `npx taro build --type weapp`: Compiled successfully.

## Notes
- Mini keeps "轻/快/低资源": no heavy media, 3D degrades to poster/fallback.
- Demo/synthetic data stays out of real Pilot metrics (unchanged backend
  contracts; client presentation only).
