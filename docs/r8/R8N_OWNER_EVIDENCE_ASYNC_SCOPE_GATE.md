# PLI R8N — Owner evidence async scope gate

R8M added durable CAS-protected owner Review intents, but `LifeChangeReviewPanel.inspectEvidence` previously started multiple raw-event GETs and wrote their completion straight into React state. Switching pet or Case while one of those requests was in flight could allow the previous animal's sources or failure copy to update the currently mounted panel after the clearing effect ran.

This candidate introduces a generation-scoped pet ID + Case ID guard. The live scope is refreshed in render (not just in an after-render effect), so response checks cannot be bypassed by a rapid pet switch before cleanup. The generation is incremented at each change effect. Only the exact same mounted scope can accept source rows, error text or the loading-complete update. Original event IDs, permissions and back-end provenance rules are unchanged.

It does **not** assert that every asynchronous Review POST race is solved. R8M's unresolved/ambiguous POST confirmation and device-restart fault injection remain separate gates. The next exact-HEAD CI/mobile typecheck, Android screenshot/evidence and real multi-pet navigation test are mandatory before claiming this change is validated. `NO_VISION_MODEL_USED = TRUE` and `HUMAN_VISUAL_ACCEPTANCE = PENDING`. No merge, tag, Release or baseline promotion.
