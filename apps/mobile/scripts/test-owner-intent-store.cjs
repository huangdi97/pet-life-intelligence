"use strict";
/** R8Q: executable adversarial async-SecureStore concurrency contract.
 * No emulator, network, VLM, or production credentials.
 * Loads the EXACT TypeScript source via the installed TypeScript compiler.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

async function run() {
  const data = new Map();
  let pauseNextRead = null;
  const secure = {
    async getItemAsync(key) {
      const snapshot = data.has(key) ? data.get(key) : null;
      if (pauseNextRead) {
        const pause = pauseNextRead;
        pauseNextRead = null;
        pause.started();
        await pause.release;
      }
      return snapshot;
    },
    async setItemAsync(key, value) { data.set(key, value); },
    async deleteItemAsync(key) { data.delete(key); },
  };
  const code = fs.readFileSync(
    path.resolve(__dirname, "../src/storage/pendingOwnerReview.ts"), "utf8"
  );
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, {
    exports,
    require(name) {
      if (name !== "expo-secure-store") throw new Error("Unexpected import: " + name);
      return secure;
    },
    console,
  }, { filename: "pendingOwnerReview.transpiled.cjs" });

  const key = "pet-A";
  const first = {
    petId: key, caseId: "case-1", sourceIdsKey: "event-A|event-B",
    decision: "FOLLOW_UP_LATER",
    payload: {
      decision: "FOLLOW_UP_LATER",
      expected_latest_review_id: null,
      idempotency_key: "r8-first-original",
    },
  };
  await exports.saveOwnerIntent(first);

  // Create a controlled race: a READ has begun, but getItemAsync has not
  // completed. A later CAS-clear must wait for this read to finish. Under the
  // old "await queue; await read()" implementation the CAS ran concurrently.
  let signalRead;
  const readStarted = new Promise(resolve => { signalRead = resolve; });
  let signalRelease;
  const releaseRead = new Promise(resolve => { signalRelease = resolve; });
  pauseNextRead = { started: signalRead, release: releaseRead };
  const pendingRead = exports.restoreOwnerIntent(key, first.caseId, first.sourceIdsKey);
  await readStarted;
  let clearFinished = false;
  const pendingClear = exports.clearOwnerIntentIfUnchanged(first).then(result => {
    clearFinished = true;
    return result;
  });
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(clearFinished, false, "CAS deletion overtook in-flight SecureStore read");
  signalRelease();
  const observed = await pendingRead;
  assert.equal(observed.caseId, first.caseId);
  assert.equal(await pendingClear, true);
  assert.equal(
    await exports.restoreOwnerIntent(key, first.caseId, first.sourceIdsKey),
    null,
    "acknowledged exact intent must be cleared"
  );

  // A different decision can never overwrite an unresolved one with the
  // same frozen evidence. Exact same retry is allowed without duplication.
  await exports.saveOwnerIntent(first);
  await exports.saveOwnerIntent(first);
  const conflicting = {
    ...first, decision: "NOT_RELEVANT",
    payload: { ...first.payload, decision: "NOT_RELEVANT", idempotency_key: "r8-conflict" },
  };
  await assert.rejects(exports.saveOwnerIntent(conflicting), /R8_UNCONFIRMED_INTENT_CONFLICT/);
  assert.equal((await exports.listOwnerIntentsForPet(key)).length, 1);

  // Separate pets remain separate under concurrency; no CAS for pet A can
  // delete an instruction belonging to pet B or a changed idempotency token.
  const another = {
    ...first, petId: "pet-B", caseId: "case-B", sourceIdsKey: "other-source",
    payload: { ...first.payload, idempotency_key: "r8-second-original" },
  };
  await exports.saveOwnerIntent(another);
  assert.equal((await exports.listOwnerIntentsForPet("pet-B")).length, 1);
  assert.equal(await exports.clearOwnerIntentIfUnchanged({
    ...first, payload: { ...first.payload, idempotency_key: "r8-not-the-same" },
  }), false);
  assert.equal((await exports.listOwnerIntentsForPet(key)).length, 1);
  assert.equal((await exports.listOwnerIntentsForPet("pet-B")).length, 1);
  await exports.clearAllOwnerIntents();
  assert.equal((await exports.listOwnerIntentsForPet(key)).length, 0);
  assert.equal((await exports.listOwnerIntentsForPet("pet-B")).length, 0);
  // Fail closed on ambiguous or privacy-unsafe SecureStore records. Reads
  // must reject without deleting or modifying the raw pending owner choices.
  const storeKey = "pli_r8_unconfirmed_owner_review_v1";
  for (const corrupted of [
    [first, { ...first, decision: "NOT_RELEVANT",
      payload: { ...first.payload, decision: "NOT_RELEVANT" } }],
    [first, { ...first, note: "must not persist private owner note" }],
    Array.from({ length: 5 }, (_, i) => ({
      ...first, caseId: "case-" + i, sourceIdsKey: "source-" + i,
    })),
  ]) {
    const raw = JSON.stringify(corrupted);
    data.set(storeKey, raw);
    await assert.rejects(
      exports.listOwnerIntentsForPet(key), /R8_SECURE_INTENT_CORRUPTED/,
      "ambiguous/capacity/secret-bearing storage must not be trusted"
    );
    assert.equal(data.get(storeKey), raw, "validation must not erase an unresolved owner intent");
  }
  data.delete(storeKey);
  await exports.saveOwnerIntent(first);
  assert.equal((await exports.listOwnerIntentsForPet(key)).length, 1,
    "valid records still recover after a corrupt snapshot is explicitly resolved");
  await exports.clearAllOwnerIntents();
  console.log("R8Q/R8U PASS: linearized get/CAS, exact retry, ambiguity rejection, multi-pet isolation");
}
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
