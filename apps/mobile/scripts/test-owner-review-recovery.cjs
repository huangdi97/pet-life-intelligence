"use strict";
/* R8T: executable fault injection of ACTUAL production recovery handlers.
 * Deterministic Node/TypeScript simulation; not a native device acceptance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const screen = fs.readFileSync(path.resolve(__dirname, "../src/components/life/PendingOwnerReviewRecovery.tsx"), "utf8");
const start = screen.indexOf("  const recover = async (intent: SavedOwnerIntent) => {");
const end = screen.indexOf("  // Hide prior-pet rows", start);
assert.ok(start >= 0 && end > start, "Missing actual owner recovery production handlers");
const source = [
  "function build(ctx: any) {",
  "const {petId, loadingCaseId, discardCandidate, activeOwnerAction, recoveryGeneration, activeRecoveryPet,",
  " api, restoreOwnerIntent, clearOwnerIntentIfUnchanged, listOwnerIntentsForPet,",
  " setLoadingCaseId, setDiscardCandidate, setWarning, setWarningPetId, setIntents, humanizeError} = ctx;",
  "const stillOnPet = (pet: string, generation: number) =>",
  " activeRecoveryPet.current === pet && recoveryGeneration.current === generation;",
  "const reloadForPet = async (pet: string, generation: number) => {",
  " const rows = await listOwnerIntentsForPet(pet);",
  " if (stillOnPet(pet, generation)) setIntents(rows); };",
  "const warn = (msg: string | null) => {setWarningPetId(petId);setWarning(msg);};",
  screen.slice(start, end),
  "return {recover, discardLocalReminder}; } exports.build = build;",
].join("\n");
// Execute the ACTUAL render-time generation guard too: otherwise A→B→A
// can restore the old pet name while leaving an old generation uninvalidated.
const guardStart = screen.indexOf("  if (activeRecoveryPet.current !== petId) {");
const guardEnd = screen.indexOf("  const stillOnPet", guardStart);
assert.ok(guardStart >= 0 && guardEnd > guardStart, "Missing real render-generation guard");
const guard = {};
vm.runInNewContext(
  "exports.renderPet = function(petId, activeRecoveryPet, recoveryGeneration) {"
    + screen.slice(guardStart, guardEnd) + "};",
  { exports: guard },
);
const compiled = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: compiled, Error, console });

function delay() {
  let resolve; const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
function setup({ getGate, postGate, clearGate, lostAck = false, wrongPet = false,
                 sourceInvalid = false, invalidateAfterPost = false,
                 changeEvidenceAfterPost = false,
                 confirmDiscard = false, newerOnClear = false } = {}) {
  const intent = {
    petId: "pet-A", caseId: "case-A", sourceIdsKey: "e1|e2",
    decision: "FOLLOW_UP_LATER",
    payload: { decision: "FOLLOW_UP_LATER", idempotency_key: "immutable-intent-A",
               expected_latest_review_id: null },
  };
  const saved = [intent], calls = [], notices = [], state = { current: null };
  const pet = { current: "pet-A" }, generation = { current: 8 };
  let getNumber = 0, failPost = lostAck;
  const ctx = {
    petId: "pet-A", loadingCaseId: null,
    discardCandidate: confirmDiscard ? "case-A:e1|e2" : null,
    activeOwnerAction: state, recoveryGeneration: generation, activeRecoveryPet: pet,
    setLoadingCaseId() {}, setDiscardCandidate(x) { notices.push(["candidate", x]); },
    setWarning(x) { notices.push(["warning", x]); },
    setWarningPetId() {}, setIntents() {},
    humanizeError(e) { return e?.message || String(e); },
    async listOwnerIntentsForPet(id) {
      calls.push("LIST");
      return saved.filter(x => x.petId === id);
    },
    async restoreOwnerIntent(id, caseId, key) {
      calls.push("RESTORE");
      return saved.find(x => x.petId === id && x.caseId === caseId && x.sourceIdsKey === key) || null;
    },
    async clearOwnerIntentIfUnchanged(old) {
      calls.push("CAS");
      if (newerOnClear) saved[0] = { ...old, decision: "NOT_RELEVANT",
        payload: { ...old.payload, idempotency_key: "later-choice" } };
      if (clearGate) await clearGate.promise;
      const idx = saved.findIndex(x =>
        x.petId === old.petId && x.caseId === old.caseId &&
        x.sourceIdsKey === old.sourceIdsKey && x.decision === old.decision &&
        x.payload.idempotency_key === old.payload.idempotency_key &&
        x.payload.expected_latest_review_id === old.payload.expected_latest_review_id);
      if (idx === -1) return false;
      saved.splice(idx, 1); return true;
    },
    api: {
      async get() {
        calls.push("GET");
        if (++getNumber === 1 && getGate) await getGate.promise;
        return { pet_id: wrongPet ? "pet-B" : "pet-A", case_id: "case-A",
          evidence_event_ids: changeEvidenceAfterPost && getNumber > 1 ? ["e3"] : ["e2", "e1"],
          source_valid: !(sourceInvalid || (invalidateAfterPost && getNumber > 1)),
          reviews: [{ review_id: "rA", decision: "FOLLOW_UP_LATER" }] };
      },
      async post(url, payload) {
        calls.push(["POST", payload.idempotency_key]);
        if (postGate) await postGate.promise;
        if (failPost) throw new Error("acknowledgement lost");
        return { review_id: "rA", pet_id: "pet-A", case_id: "case-A",
          decision: "FOLLOW_UP_LATER" };
      },
    },
  };
  return { intent, saved, calls, notices, state, ctx, ...compiled.build(ctx),
    changePet() { guard.renderPet("pet-B", pet, generation); },
    changeBackToA() { guard.renderPet("pet-A", pet, generation); },
    samePetRender() { guard.renderPet("pet-A", pet, generation); },
    restoreNetwork() { failPost = false; } };
}
const count = (h, op) => h.calls.filter(x => Array.isArray(x) ? x[0] === op : x === op).length;
async function test() {
  {
    const gate = delay(), h = setup({getGate:gate});
    const original = h.recover(h.intent);
    await h.recover(h.intent);
    assert.equal(count(h,"GET"),1,"rapid double tap must not issue second GET");
    gate.resolve(); await original;
    assert.equal(count(h,"POST"),1);
    assert.equal(count(h,"CAS"),1);
    assert.equal(h.saved.length,0);
    assert.equal(h.state.current,null);
  }
  {
    const gate = delay(), h = setup({getGate:gate});
    const original = h.recover(h.intent);
    h.changePet(); gate.resolve(); await original;
    assert.equal(count(h,"POST"),0,"A→B during GET cannot POST old intent");
    assert.equal(count(h,"CAS"),0);
    assert.equal(h.saved.length,1);
  }
  {
    const gate = delay(), h = setup({getGate:gate});
    const initialGeneration = h.ctx.recoveryGeneration.current;
    const first = h.recover(h.intent);
    h.changePet();
    h.changeBackToA();
    assert.equal(h.ctx.activeRecoveryPet.current, "pet-A");
    assert.equal(h.ctx.recoveryGeneration.current, initialGeneration + 2,
      "A→B→A must invalidate the original A generation synchronously");
    h.samePetRender();
    assert.equal(h.ctx.recoveryGeneration.current, initialGeneration + 2,
      "Re-rendering same pet must not invalidate a legitimate in-flight operation");
    gate.resolve(); await first;
    assert.equal(count(h,"POST"),0,
      "Old A response cannot resume after A→B→A before effect cleanup");
    assert.equal(h.saved.length,1);
  }
  {
    const gate = delay(), h = setup({postGate:gate});
    const original = h.recover(h.intent);
    for (let i=0;i<8 && count(h,"POST")===0;i++) await Promise.resolve();
    assert.equal(count(h,"POST"),1);
    h.changePet(); gate.resolve(); await original;
    assert.equal(count(h,"GET"),1,"A→B during POST cannot confirm stale pet");
    assert.equal(count(h,"CAS"),0);
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup({lostAck:true});
    await h.recover(h.intent);
    assert.equal(h.saved.length,1,"lost acknowledgement must preserve durable owner intent");
    assert.equal(count(h,"POST"),1);
    h.restoreNetwork();
    await h.recover(h.intent); // only on a NEW explicit owner action
    assert.equal(count(h,"POST"),2);
    assert.deepEqual(h.calls.filter(Array.isArray).map(x=>x[1]),["immutable-intent-A","immutable-intent-A"]);
    assert.equal(h.saved.length,0);
  }
  {
    const h=setup({wrongPet:true});
    await h.recover(h.intent);
    assert.equal(count(h,"POST"),0,"wrong-pet Case must not trigger Review");
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup({sourceInvalid:true});
    await h.recover(h.intent);
    assert.equal(count(h,"POST"),0,
      "invalidated original evidence must never trigger a new owner Review");
    assert.equal(count(h,"CAS"),0);
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup({invalidateAfterPost:true});
    await h.recover(h.intent);
    assert.equal(count(h,"POST"),1);
    assert.equal(count(h,"CAS"),0,
      "source invalidated after POST cannot delete ambiguous original owner intent");
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup({changeEvidenceAfterPost:true});
    await h.recover(h.intent);
    assert.equal(count(h,"POST"),1);
    assert.equal(count(h,"CAS"),0,
      "changed evidence fingerprint after POST cannot be treated as original confirmed Case");
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup();
    await h.discardLocalReminder(h.intent);
    assert.equal(count(h,"CAS"),0,"discard first tap must only warn");
    assert.equal(h.saved.length,1);
  }
  {
    const gate=delay(), h=setup({clearGate:gate,confirmDiscard:true});
    const discard=h.discardLocalReminder(h.intent);
    await h.discardLocalReminder(h.intent);
    await h.recover(h.intent);
    assert.equal(count(h,"CAS"),1);
    assert.equal(count(h,"POST"),0,"two-step opt-out must never create server Review");
    gate.resolve(); await discard;
    assert.equal(h.saved.length,0);
  }
  {
    const h=setup({newerOnClear:true});
    await h.recover(h.intent);
    assert.equal(count(h,"CAS"),1);
    assert.equal(h.saved.length,1,"newer owner instruction must survive CAS");
    assert.equal(h.saved[0].decision,"NOT_RELEVANT");
    assert.ok(h.notices.some(x=>x[0]==="warning" && x[1]?.includes("新决定未被清除")));
  }
  console.log("R8T/R8X: 12 executable production owner recovery safety gates PASS");
}
test().catch(e=>{console.error(e);process.exitCode=1;});
