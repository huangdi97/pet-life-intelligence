"use strict";
/* Run the REAL ownerEvidence.ts paging/identity helpers with TypeScript's
 * own transpiler. No fake owner identity or visual-model-based acceptance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(path.resolve(__dirname, "../src/components/life/ownerEvidence.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const moduleShim = {exports:{}};
new Function("module", "exports", compiled)(moduleShim, moduleShim.exports);
const {nextOwnerEvidenceIds, verifyOwnerEvidenceBatch, OWNER_EVIDENCE_BATCH_SIZE,
  ownerEvidenceValue, ownerEvidenceLocalTime} = moduleShim.exports;
assert.equal(OWNER_EVIDENCE_BATCH_SIZE, 8);
const ids = Array.from({length: 23}, (_, i) => "real-event-id-" + i);
let loaded = [];
for (let cycle = 0; cycle < 3; cycle++) {
  const page = nextOwnerEvidenceIds(ids, loaded);
  assert.equal(page.length, cycle === 2 ? 7 : 8);
  const rows = page.map(id => ({event_id:id,pet_id:"pet-A"}));
  verifyOwnerEvidenceBatch(rows, page, "pet-A");
  loaded = loaded.concat(page);
}
assert.deepEqual(loaded, ids);
assert.deepEqual(nextOwnerEvidenceIds(ids, loaded), []);
assert.deepEqual(nextOwnerEvidenceIds(["a","a","b","c"], []), ["a","b","c"]);
assert.throws(() => verifyOwnerEvidenceBatch(
  [{event_id:"event-A",pet_id:"pet-B"}],["event-A"],"pet-A",
), /原始记录身份/);
assert.throws(() => verifyOwnerEvidenceBatch(
  [{event_id:"event-B",pet_id:"pet-A"}],["event-A"],"pet-A",
), /原始记录身份/);
assert.throws(() => verifyOwnerEvidenceBatch([],["event-A"],"pet-A"), /原始记录身份/);
const ui = fs.readFileSync(path.resolve(__dirname, "../src/components/life/LifeChangeReviewPanel.tsx"), "utf8");
assert.ok(ui.includes('testID="pli.r8.owner-review.sources.more"'));
assert.ok(ui.includes("onPress={() => void loadMoreEvidence()}"));
assert.ok(ui.includes("verifyOwnerEvidenceBatch(rows, ids, requestedPetId)"));
assert.ok(ui.includes('testID={`pli.r8.owner-review.event.${e.event_id}`}' ));
assert.ok(!ui.includes("record.evidence_event_ids.slice(0, 8)"));

const example = {
  event_type:"daily.walk", payload:{duration_minutes:17},
  occurred_at:"2026-10-11T09:00:00+08:00", recorded_at:"2026-10-14T10:00:00+08:00",
};
assert.match(ownerEvidenceValue(example), /17 分钟/);
assert.match(ownerEvidenceValue({...example,payload:{duration_minutes:0}}), /不能按零分钟/);
assert.match(ownerEvidenceValue({...example,payload:{duration_minutes:"oops"}}), /时长未记录/);
assert.match(ownerEvidenceValue({...example,payload:{duration_minutes:"25"}}), /25 分钟/);
assert.match(ownerEvidenceValue({...example,payload:{duration_minutes:90000}}), /时长未记录/);
assert.match(ownerEvidenceValue({...example,retracted_at:"2026-10-14T11:00:00Z"}), /已撤回/);
assert.match(ownerEvidenceValue({...example,event_type:"daily.meal",payload:{private:"SECRET"}}), /1 条进食记录/);
assert.ok(!ownerEvidenceValue({...example,payload:{private:"SECRET"}}).includes("SECRET"));
assert.notEqual(ownerEvidenceLocalTime(example.occurred_at), ownerEvidenceLocalTime(example.recorded_at));
assert.equal(ownerEvidenceLocalTime("bad-date"), "时间未确认");
assert.ok(ui.includes("ownerEvidenceValue(e)"));
assert.ok(ui.includes("ownerEvidenceLocalTime(e.occurred_at)"));
assert.ok(ui.includes("ownerEvidenceLocalTime(e.recorded_at)"));
assert.ok(ui.includes("完整事件标识 ${e.event_id}"));
console.log("R8 owner evidence pagination, exact identity, actual values and two-time reading: PASS");
