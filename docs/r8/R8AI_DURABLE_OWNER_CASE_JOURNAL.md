# PLI R8AI · Durable owner Case journal on Today

## Confirmed disappearing-memory defect

An existing R8 Case and its append-only owner Reviews remain in PostgreSQL after the new day's observed totals normalize, but the primary Today screen renders `LifeChangeReviewPanel` only while the *current* `abnormal-day-hint` is notable. The owner then loses an in-app entry to earlier reviewed changes just when following up has altered today's data. The encrypted pending-intent recovery feature is for unresolved POSTs; it is not a historical Case journal.

## Implemented first owner-facing persistence slice

- Today fetches `/life-change-cases` independently of the current heuristic in its existing pet-scoped `Promise.allSettled`; a pet switch masks stale rows immediately and clears the previous pet's state.
- A warm, compact `最近的生活观察回顾` appears only when real persisted Cases exist. Default latest two, explicit expand for remaining cases returned by the existing bounded API. No new top-level tab; all other current five tabs remain unchanged.
- Facts remain original `current_value`, `baseline_value`, `sample_days` and source count, all from the frozen Case. The status is the backend's effective source validity and follow-up validity, **not** a medical diagnosis or claim that the pet recovered.
- Owner/family detail privacy is not expanded here: no private free-text Review notes, task IDs or clinical events are surfaced in this journal. The action goes to the existing factual Timeline, not an invented Case detail route.
- Status semantics are pure and executable under a Node probe: the following are distinct: `PROPOSED`, human decision `FOLLOW_UP`, genuine followup source valid, withdrawn/corrected source invalid, and `CLOSED`. An empty or failed Cases query must never synthesize history.

## Verifications and limits

- New blind-source contract checks durable Case GET independently of `notableChange`, UI visibility of real Case ID and per-pet isolation.
- Node regression executes the production status helper, including sourced followup invalidation.
- Hosted Android UIAutomator must still prove the historical case remains visible after adding a truly recorded activity that returns the current same-clock hint to non-notable. The exact-HEAD hosted Android evidence now seeds a real additional walk until the same-clock current hint is non-notable, then must navigate to real Android Today and find the original immutable Case ID and valid follow-up in the native accessibility tree and screenshot. The test remains **PENDING until that new HEAD's Android workflow succeeds**.
- API list currently caps at latest 50 Cases; this is a first-fold recent-history entry, not exhaustive search or cross-client parity. A dedicated History reader with event detail and reviews is further work.
- No visual model was used. `HUMAN_VISUAL_ACCEPTANCE = PENDING`, real individual 3D remains separately gated. No main merge/tag/Release/visual-baseline changes.
