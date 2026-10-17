# R8C native owner interaction evidence gate

The existing hosted Android R5.6 screenshot sweep is extended **after R7** with
an independent real R8 follow-up scenario, using the same no-vision-model path.

1. Seed five historical days with two separately recorded 45-minute walks per day and today's recorded 20-minute walk (11 planted event IDs) via real API; recompute the recorded baseline. Require a truly `notable`, `current_recorded`, >=3-day R7 explanation, not a fixed response stub.
2. Navigate the real Android Today page; scroll as needed to the R8 owner review CTA. Screenshot the untouched invitation.
3. Tap **核对这次记录变化**. Verify Case persisted via API, that its source-event IDs include all eleven real fixture events, and capture the actual Android Case.
4. Tap **查看原始记录来源** then tap the native **继续查看余下来源** button and require EVERY planted full event ID to be visible in the accumulated Android accessibility trees. A backend list or static helper test cannot substitute.
5. Tap **稍后关注**, require a real Review append and capture its acknowledgement.
6. Tap **补充真实观察**, open real QuickLog, tap **保存**, require a real newly created matching walking LifeEvent linked via `RECORD_OBSERVATION`. Fetch the source LifeEvent and verify the pet, event type and non-overlap with original Case evidence.
7. Save UIAutomation XML trees for each real pagination action, real PNGs and `api-truth.json` with captured IDs. Fail the gate if any control is missing or any backend fact check fails.

This test is for the **demo fixture only**; no evidence is fabricated and no simulated image is used to approve visual style. The two demo pets remain selected normally after this scenario. `HUMAN_VISUAL_ACCEPTANCE = PENDING` and `NO_VISION_MODEL_USED = TRUE` remain unchanged. No baseline promotions, PR merge, tags or Release.
