# PLI R8C · Android owner-led first review interaction

This increment wires the R8A source-backed Case API into existing Today and QuickLog; **no sixth tab**.

- Today only offers a small owner-review section when the existing R7 `abnormal-day-hint` has `notable=true`, `current_recorded=true` and >=3 comparable recorded days. No prompt when there are missing records, a baseline failure, or no source.
- Opening a Case requires the owner's physical tap on `核对这次记录变化`; neither startup effects nor AI narration can write an owner review. Existing valid cases can be reopened via a source-scoped GET.
- The panel shows original event IDs, sample days, recorded current vs baseline values, non-diagnostic uncertainty. `查看原始记录来源` fetches the actual `GET /events/{id}` under existing permission, not a generated or invented explanation.
- Three explicit small decisions `稍后关注/来源不准确/暂不关注` append actual owner Review rows. No task, no health assessment, no claim of recovery.
- `补充真实观察` opens existing QuickLog, prefills the matching metric, and only **after successful actual LifeEvent save** attempts `RECORD_OBSERVATION` using the returned event ID and current latest-review token. Failure to link leaves the real record intact and shows a truthful partial-success message.
- Switching pets prevents cross-pet review linking: the QuickLog route includes both the original case ID and pet ID, and the backend validates scope independently. Old HTTP responses must not display the other pet's history.
- Source-level blind assertions are included, but **native human visual approval and an actual R8 tap/capture path remain PENDING** until separately run. Existing R7 screenshot gate must remain intact.
- `NO_VISION_MODEL_USED = TRUE`, `HUMAN_VISUAL_ACCEPTANCE = PENDING`. Do not promote screenshot baselines, merge PR #2, tag or release.
