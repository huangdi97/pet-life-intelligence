# PLI R8I — crash-safe owner Review intent (Android first)

**Status:** Android source candidate on PR #2. Server remains authoritative and no owner action is scheduled/automated.

## Reproduced risk
R8H keeps an optimistic token and idempotency key only in a `useRef`. If a POST reaches the server but the app crashes before the response or before the follow-up GET proves its immutable Review ID, the in-memory intent is lost. Restarting and tapping the same decision can construct a new request from a changed predecessor, potentially duplicating an owner instruction.

## R8I contract
- Before POST, store only `petId`, `caseId`, **immutable source-event set signature**, decision and original Review optimistic token/idempotency key in `expo-secure-store`; no clinical note, access token or raw life-event payload. Max four unresolved intents to bound size, never silently discard old unknown outcomes.
- Restore only after the same pet, identical source events, values and case have been discovered through an authorized API GET; never restore across a different pet/case/source set.
- **Do not auto-POST on app restart.** Show a Chinese instruction to re-tap the original owner decision and use the original key/token on the next explicit click.
- A successful POST alone does not clear the intent. Require the server's exact Review ID to be visible in the subsequent Case GET. Only then remove the secure pending record.
- On definitive 4xx rejection the intent may be discarded; timeouts/5xx and stale GET retain it. Credential or dev-user changes clear all saved intents, preventing transfer across accounts.
- Fail closed if secure storage cannot save the intent before POST. Bounded single-key serialized writes guard against two panels overwriting each other.
- Existing R8 server idempotency and append-only Review history remain unchanged.

## Gates
- Current HEAD mobile typecheck, blind source gates, CI/Playwright, same-head Android emulator R8 review recording; **separate physical fault injection**: kill/restart after POST commits but before reply, recover and explicitly tap again, assert exactly one Review ID.
- Follow-up: guard against a pending Case that is no longer eligible for the Today notable card; owner-managed recovery directory and a real account-switch on device are not yet completed by this patch.
- `NO_VISION_MODEL_USED=TRUE`; `HUMAN_VISUAL_ACCEPTANCE=PENDING`; never merge PR #2, alter accepted screenshots, tag or publish Release.
