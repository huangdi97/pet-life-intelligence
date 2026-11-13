# PLI R8O · Async owner Case / Review write scope integrity

## Latest source truth

Repository `huangdi97/pet-life-intelligence`, PR #2, parent `d454b979ec7868e8b110f374cea78d93c15eddda`. At this parent, CI/Android/OpenAPI workflows are SUCCESS. Existing R8N code guards **source evidence GET** results, but other owner workflows can still commit a previous pet/Case's async completion to the newly rendered panel.

## Reproduced source risk (not a claim of a device race reproduction)

- `create()` awaited Case POST and then unconditionally `setRecord(saved)`. Captured `petId` matched its own POST response, but **not** the currently mounted pet after a fast pet switch; the old Case could appear in the next pet's Today.
- `review()` awaited detail GET, intent storage, POST, verification GET, and CAS deletion with no live pet+Case+source guard at each async boundary. A late callback could show an old owner's Review acknowledgement in the new pet's panel, clear the new panel's pending reference, or erase a locally updated reminder after a context change.
- Stored, potentially server-accepted human decisions **must not** be discarded when a panel is no longer current. The original intent is preserved for explicit recovery. No automatic POST on restart or pet switch.

## R8O implementation

- A render-updated `activeChangeScope` tracks exact pet/metric/frozen source IDs, supplementing the existing render-updated `activeOwnerScope` pet+Case identity and effect-driven request generation.
- `create()` checks live scope before accepting Case output; additionally matches returned pet, metric and the **exact frozen evidence event set** rather than a metric/value coincidence.
- `review()` checks scope after detail GET, after SecureStore persistence, before POST, after POST, after confirmation GET, before/after CAS clear, and before state, error or loading updates. Old POSTs already sent can still commit remotely; their originally scoped unresolved SecureStore intent is retained for owner-controlled recovery.
- On navigation scope switch, stale completion cannot display the previous animal's data, or clear the newly mounted panel's in-memory human choice. New scope's loading state is reset by the changing-context effect.
- Existing idempotency, predecessor token, source-invalidity rules, permissions and human-review acknowledgement checks remain authoritative.

## Mandatory verification

Current-HEAD Blind Visual Contract, TypeScript typecheck, Backend/Frontend, Playwright, Android APK and runtime evidence; separate fault-injected on-device pet A→B switch with delayed Case GET, delayed Case POST, delayed owner Review POST and delayed SecureStore CAS completion. Server Review cardinality and durable pending-intent recovery must be measured; source text tests alone do not prove the device race is closed.

Do **not** merge PR #2, publish Release, update a visual baseline or mark `HUMAN_VISUAL_ACCEPTANCE = ACCEPTED`. `NO_VISION_MODEL_USED = TRUE`.
