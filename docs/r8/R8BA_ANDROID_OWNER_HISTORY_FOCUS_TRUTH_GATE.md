# PLI R8BA · Android owner Case history refocus freshness

## Verified gap (R8AZ HEAD `fc67e702f464062021a19e4968da5919b447c1e9`)

The history list had two correctness protections: immediate synchronous pet/filter/search masking and epoch-based stale-request invalidation. However, its fetch lived in a React mount/dependency effect only. A common workflow is **history → Case detail → owner retracts or supersedes a source → back to history**. The history screen remains mounted, pet and filters may not change, and its old Case status can appear indefinitely as valid even though the API now derives INVALIDATED.

## Implemented

- React Navigation **6.x `useFocusEffect`**, wrapped in memoized `useCallback`, refetches the real server-authoritative page whenever the history screen becomes focused again, not only when filters change.
- The existing `generation` and pagination in-flight guard invalidate requests when focus is lost, unmounted, or scope changes. A background response cannot append an old Case after returning.
- `useIsFocused` synchronously hides cached rows/total/error while history is out of focus.
- A native navigation **blur listener** clears the result owner key. On returning to history, before the async request resolves, the first render cannot show a cached pre-retraction Case: it displays the honest loading state until the current scope is fetched.
- Still respects API per-pet authorization, `HISTORY_PET_MISMATCH` and no offline synthetic data. No new medical inference or modification to the product IA, 3D or visual baseline.

## Evidence gates and limitations

1. Exact HEAD CI: Android TypeScript, existing R8AZ source guards, new R8BA refocus source guard, full API/Playwright.
2. Exact HEAD Android hosted run: all prior full end-to-end R8AZ Case filter, source retraction, twin and A→B→A gates must remain green.
3. **Dedicated actual-native refocus-with-in-flight delayed response** remains NOT_YET_OBSERVED until an emulator test explicitly pauses an API page between blur and return. Source guard + regular runtime traversal is not a claim of measured first composited frame nor controlled-latency race proof.
4. Human visual acceptance remains PENDING. No visual-model acceptance, no merge, release, tag or screenshot-baseline promotion.

Official behavior reference: https://reactnavigation.org/docs/6.x/use-focus-effect/ — focus effect cleanup runs on blur/unmount; async results must be ignored when stale.
