# PLI R8BB · Mini Case history page-stack refocus truth

## Verified source-level gap

The Mini history page had valid per-pet/per-filter generation guards, but its only `load(null,false)` call ran in a normal React `useEffect`. Taro Mini `navigateTo` preserves the previous page in its page stack. When a user opens a Case detail, retracts/corrects a source, and navigates back, no React dependency necessarily changes. Old Case validity can remain visible despite a newly invalidated server Case.

Official Taro 3.x lifecycle contract: https://docs.taro.zone/docs/3.x/react-page — `useDidShow` runs on page show, `useDidHide` on page hide, independent of React mount/unmount.

## Implemented

- On first show, let the existing React mount effect fetch once.
- On hide, invalidate in-flight first page and pagination generations, stop concurrent pagination, synchronously hide the old result owner key, mark the page invisible.
- On every later show, advance `returnEpoch` and restore visibility. The *render-time* scope key includes that epoch, so an older page cannot flash on the first return render; the existing `useEffect` refetches real API data with unchanged pet/metric/validity.
- Preserve per-pet server-response filtering, source validity meanings, bounded pagination, no offline synthetic rows and the same UI.
- No new medical judgement, AI, 3D assets, visual-model acceptance, Release, tag or merge.

## Gate

Latest HEAD CI must include Mini typecheck + weapp build and the new blind-source lifecycle tests. This is **source/build validation only**. Real WeChat DevTools / Android or iOS Mini runtime, and deliberately delayed network-response race on the genuine Mini renderer remain **NOT_YET_OBSERVED**. `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`.
