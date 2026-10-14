"use strict";
/* R8Z: executable delayed-I/O probes of ACTUAL LifeChangeReviewPanel.review().
 * The compiled handler is extracted from production TSX, not reimplemented.
 * This is deterministic Node testing, NOT physical-device acceptance.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const screen = fs.readFileSync(path.resolve(__dirname, "../src/components/life/LifeChangeReviewPanel.tsx"), "utf8");
const start = screen.indexOf("  const review = async (decision: Decision) => {");
const end = screen.indexOf("  const inspectEvidence = async", start);
const helperStart = screen.indexOf("function caseMatchesFrozenSources(");
const helperEnd = screen.indexOf("export function LifeChangeReviewPanel(", helperStart);
assert.ok(start >= 0 && end > start && helperStart >= 0 && helperEnd > helperStart,
  "Cannot locate the actual production owner review handler / source validator");
const source = [
  "function build(ctx: any) {",
  "const {record, loading, restoring, pendingReview, petId, change, sourceIdsKey,",
  " requestGeneration, activeChangeScope, activeOwnerScope, setLoading, setMessage,",
  " setRecord, api, saveOwnerIntent, clearOwnerIntentIfUnchanged, humanizeError, ApiError,",
  " activeReviewAction, ownerReviewScope} = ctx;",
  screen.slice(helperStart, helperEnd),
  screen.slice(start, end),
  "return {review}; } exports.build=build;",
].join("\n");
const output = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const compiled = {};
vm.runInNewContext(output, {exports: compiled, Error, console});

function delay() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return {promise, resolve};
}
function setup({pending = false, invalidBefore = false, changedBefore = false,
                invalidAfter = false, changedAfter = false,
                lostAck = false, saveFails = false,
                preflightGate, postGate, newerOnClear = false} = {}) {
  const immutable = {decision: "FOLLOW_UP_LATER", expected_latest_review_id: null,
    idempotency_key: "r8-FOLLOW_UP_LATER-initial"};
  const original = {petId:"pet-A", caseId:"case-A", sourceIdsKey:"e1|e2",
    decision:"FOLLOW_UP_LATER", payload:immutable};
  const saved = pending ? [original] : [];
  const log = [], notices = [];
  const ctx = {
    petId: "pet-A", record: {pet_id:"pet-A",case_id:"case-A",metric:"walk_minutes_per_day"},
    change: {metric:"walk_minutes_per_day"}, sourceIdsKey:"e1|e2",
    pendingReview: {current: pending ? {caseId:"case-A",decision:"FOLLOW_UP_LATER",payload:immutable} : null},
    requestGeneration: {current:6},
    activeChangeScope: {current:{petId:"pet-A",metric:"walk_minutes_per_day",sourceIdsKey:"e1|e2"}},
    activeOwnerScope: {current:{petId:"pet-A",caseId:"case-A"}},
    loading:false, restoring:false,
    ownerReviewScope:"pet-A:case-A:e1|e2",
    activeReviewAction:{current:null},
    setLoading(x){ log.push(["LOADING",x]); },
    setMessage(x){notices.push(x);},
    setRecord(x){log.push(["SET_RECORD",x.case_id]);},
    humanizeError(e){return e.message || String(e);},
    ApiError: class ApiError extends Error {},
    async saveOwnerIntent(x) {
      log.push(["SAVE",x.payload.idempotency_key]);
      if(saveFails) throw new Error("SecureStore capacity exceeded");
      saved.push(x);
    },
    async clearOwnerIntentIfUnchanged(x) {
      log.push(["CAS",x.payload.idempotency_key]);
      if(newerOnClear) saved.push({...x,decision:"NOT_RELEVANT",
        payload:{...x.payload,idempotency_key:"newer-choice"}});
      const pos = saved.findIndex(v =>
        v.petId === x.petId && v.caseId === x.caseId &&
        v.decision === x.decision &&
        v.sourceIdsKey === x.sourceIdsKey &&
        v.payload.idempotency_key === x.payload.idempotency_key);
      if(pos<0) return false;
      saved.splice(pos,1);return true;
    },
  };
  let reads=0, shouldFailAck=lostAck;
  ctx.api = {
    async get() {
      const index=++reads;log.push(["GET",index]);
      if(index===1 && preflightGate) await preflightGate.promise;
      const isAfter=index>1;
      return {
        pet_id:"pet-A",case_id:"case-A",source_valid:!(isAfter?invalidAfter:invalidBefore),
        evidence_event_ids:(isAfter?changedAfter:changedBefore)?["e3"]:["e2","e1"],
        reviews:[{review_id:"review-A",decision:"FOLLOW_UP_LATER"}],
      };
    },
    async post(url,payload) {
      log.push(["POST",payload.idempotency_key]);
      if(postGate) await postGate.promise;
      if(shouldFailAck) throw new Error("acknowledgement lost");
      return {review_id:"review-A",pet_id:"pet-A",case_id:"case-A",decision:"FOLLOW_UP_LATER"};
    },
  };
  return {ctx,saved,notices,log,...compiled.build(ctx),
    switchPet(){ctx.activeChangeScope.current.petId="pet-B";ctx.activeOwnerScope.current.petId="pet-B";ctx.requestGeneration.current++;},
    restoreAck(){shouldFailAck=false;},
  };
}
const count = (h,kind) => h.log.filter(x=>x[0]===kind).length;
async function tests() {
  {
    const h=setup();await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"POST"),1);assert.equal(count(h,"CAS"),1);
    assert.equal(h.saved.length,0);assert.ok(h.notices.some(x=>x?.includes("已记录")));
  }
  {
    const gate=delay(),h=setup({preflightGate:gate});
    const first=h.review("FOLLOW_UP_LATER");
    const second=h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"GET"),1,"rapid double tap must issue only one GET");
    gate.resolve();await Promise.all([first,second]);
    assert.equal(count(h,"POST"),1,
      "rapid double tap must not issue a duplicate owner Review POST");
    assert.equal(count(h,"CAS"),1);
    assert.equal(h.ctx.activeReviewAction.current,null);
  }
  {
    const h=setup({invalidBefore:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"SAVE"),0);assert.equal(count(h,"POST"),0,
      "invalid source before first POST must stop");
    assert.equal(count(h,"CAS"),0);
  }
  {
    const h=setup({changedBefore:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"SAVE"),0);assert.equal(count(h,"POST"),0);
  }
  {
    const h=setup({invalidAfter:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"SAVE"),1);assert.equal(count(h,"POST"),1);
    assert.equal(count(h,"CAS"),0,
      "source invalidated after POST must retain encrypted intent");
    assert.equal(h.saved.length,1);assert.equal(h.ctx.pendingReview.current.decision,"FOLLOW_UP_LATER");
  }
  {
    const h=setup({changedAfter:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"CAS"),0);assert.equal(h.saved.length,1);
  }
  {
    const h=setup({pending:true,invalidBefore:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"GET"),1);assert.equal(count(h,"POST"),0,
      "unconfirmed retry must revalidate source before POST");
    assert.equal(count(h,"CAS"),0);assert.equal(h.saved.length,1);
  }
  {
    const h=setup({pending:true,changedBefore:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"POST"),0,
      "changed source fingerprint on retry must never POST");
    assert.equal(h.saved.length,1);
  }
  {
    const h=setup({pending:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"GET"),2);assert.equal(count(h,"SAVE"),0);
    assert.deepEqual(h.log.filter(x=>x[0]==="POST").map(x=>x[1]),["r8-FOLLOW_UP_LATER-initial"]);
    assert.equal(count(h,"CAS"),1);assert.equal(h.saved.length,0);
  }
  {
    const h=setup({saveFails:true});await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"POST"),0);assert.equal(count(h,"CAS"),0);
  }
  {
    const h=setup({lostAck:true});
    await h.review("FOLLOW_UP_LATER");
    assert.equal(count(h,"POST"),1);assert.equal(h.saved.length,1);
    h.restoreAck();
    await h.review("FOLLOW_UP_LATER");
    assert.deepEqual(h.log.filter(x=>x[0]==="POST").map(x=>x[1]),
      ["r8-FOLLOW_UP_LATER-initial","r8-FOLLOW_UP_LATER-initial"],
      "lost ack retry must retain identical idempotency key");
    assert.equal(h.saved.length,0);
  }
  {
    const gate=delay(),h=setup({preflightGate:gate});const first=h.review("FOLLOW_UP_LATER");
    h.switchPet();gate.resolve();await first;
    assert.equal(count(h,"POST"),0,
      "owner switching pet during source GET cannot POST");
    assert.equal(count(h,"SAVE"),0);
  }
  {
    const gate=delay(),h=setup({postGate:gate});const first=h.review("FOLLOW_UP_LATER");
    for(let i=0;i<12 && count(h,"POST")===0;i++)await Promise.resolve();
    assert.equal(count(h,"POST"),1);
    h.switchPet();gate.resolve();await first;
    assert.equal(count(h,"CAS"),0);assert.equal(h.saved.length,1);
  }
  console.log("R8Z: 13 executable original owner-review source/ack/pet-scope gates PASS");
}
tests().catch(e=>{console.error(e);process.exitCode=1;});
