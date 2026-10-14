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
const {nextOwnerEvidenceIds, verifyOwnerEvidenceBatch, OWNER_EVIDENCE_BATCH_SIZE} = moduleShim.exports;
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
assert.ok(ui.includes('testID="pli.r8.owner-review.event.${e.event_id}"'.replace('\\','')));
assert.ok(!ui.includes("record.evidence_event_ids.slice(0, 8)"));
console.log("R8 owner evidence pagination and pet/id binding: PASS");
