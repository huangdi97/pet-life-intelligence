"use strict";
/** R8R: execute the REAL QuickLog save() TS source against delayed API IO.
 * Mocked API/React setters, no device, network, private token or vision model.
 * This supplements, never replaces, real Android A→B fault injection.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const screen = fs.readFileSync(path.resolve(__dirname, "../src/screens/QuickLogScreen.tsx"), "utf8");
const start = screen.indexOf("  async function save() {");
const end = screen.indexOf("\n  const selectedType:", start);
assert.ok(start >= 0 && end > start, "QuickLog save() source section is missing");
const source = [
  "function build(ctx: any) {",
  "  const { current, selected, saving, activeSaveScope, livePetScope, LOG_TYPES,",
  "    setSaving, setError, setSuccess, setSelected, resetInputs, api, mediaFiles,",
  "    clampMinutes, amount, unit, kind, minutes, weight, diaryText,",
  "    linkedCase, linkedPetId, linkedMetric, humanizeError } = ctx;",
  screen.slice(start, end),
  "  return save;",
  "}",
  "exports.build = build;",
].join("\n");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
vm.runInNewContext(transpiled, { exports: exported, console }, {
  filename: "quicklog-save-source.cjs",
});

function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

function createHarness({ mediaFiles = [], caseResponse, reviewAck, uploadGate, eventGate } = {}) {
  const currentPetScope = { petId: "pet-A", generation: 1 };
  const calls = [];
  const statuses = { successes: [], errors: [], saving: [] };
  const ctx = {
    current: { id: "pet-A", name: "A" },
    selected: "walk",
    saving: false, // a second tap may happen before React commits state
    livePetScope: { current: currentPetScope },
    activeSaveScope: { current: null },
    LOG_TYPES: [{ key: "walk", event_type: "daily.walk", zh: "散步" }],
    amount: "", unit: "", kind: null, minutes: "12", weight: "", diaryText: "",
    mediaFiles, linkedCase: "case-A", linkedPetId: "pet-A",
    linkedMetric: "walk_minutes_per_day",
    clampMinutes: value => Number(value),
    setSaving: x => statuses.saving.push(x),
    setSuccess: x => statuses.successes.push(x),
    setError: x => statuses.errors.push(x),
    setSelected() {}, resetInputs() {},
    humanizeError: error => error?.message ?? String(error),
    api: {
      async upload(url, file) {
        calls.push({ kind: "upload", url, file });
        if (uploadGate) await uploadGate.promise;
        return { artifact_id: "artifact-A" };
      },
      async post(url, body) {
        calls.push({ kind: "post", url, body });
        if (url.endsWith("/events")) {
          if (eventGate) await eventGate.promise;
          return { event_id: "event-A" };
        }
        return reviewAck ?? {
          review_id: "review-A",
          pet_id: "pet-A", case_id: "case-A",
          decision: "RECORD_OBSERVATION",
        };
      },
      async get(url) {
        calls.push({ kind: "get", url });
        return caseResponse ?? { pet_id: "pet-A", case_id: "case-A", source_valid: true, reviews: [] };
      },
    },
  };
  return {
    ctx, calls, statuses, save: exported.build(ctx),
    switchToB() { ctx.livePetScope.current = { petId: "pet-B", generation: 2 }; },
  };
}

async function run() {
  // A double tap plus a held photo upload cannot create two events.
  const uploadGate = deferred();
  const a = createHarness({
    mediaFiles: [{ uri: "file://pet-A.jpg", name: "pet-A.jpg", type: "image/jpeg" }],
    uploadGate,
  });
  const original = a.save();
  await Promise.resolve();
  const rapidDoubleTap = a.save();
  await rapidDoubleTap;
  assert.equal(a.calls.filter(x => x.kind === "upload").length, 1);
  a.switchToB();
  uploadGate.release();
  await original;
  assert.equal(a.calls.filter(x => x.kind === "post").length, 0,
    "Pet A's completed upload cannot publish an event under newly selected pet B");
  assert.deepEqual(a.statuses.successes, []);
  // save() always clears the previous error at tap time; after switching
  // pets, no NEW error about pet A may be shown on pet B.
  assert.equal(a.statuses.errors.filter(Boolean).length, 0);
  assert.equal(a.ctx.activeSaveScope.current, null);

  // If event POST already reached the server for A, never issue an old Case
  // Review or render A's success on pet B after the HTTP reply arrives.
  const eventGate = deferred();
  const b = createHarness({ eventGate });
  const pendingEvent = b.save();
  assert.equal(b.calls.filter(x => x.url.endsWith("/events")).length, 1);
  b.switchToB();
  eventGate.release();
  await pendingEvent;
  assert.equal(b.calls.filter(x => x.kind === "get").length, 0);
  assert.equal(b.calls.filter(x => x.url.endsWith("/reviews")).length, 0);
  assert.deepEqual(b.statuses.successes, []);

  // On an unchanged pet, the exact saved event gets one idempotent Review,
  // but only an ack with matching pet+Case+decision can claim association.
  const c = createHarness();
  await c.save();
  const review = c.calls.find(x => x.url.endsWith("/reviews"));
  assert.ok(review, "Owner-triggered follow-up Review was not sent");
  assert.equal(review.body.decision, "RECORD_OBSERVATION");
  assert.equal(review.body.related_event_ids[0], "event-A");
  assert.equal(review.body.idempotency_key, "r8-observation-event-A");
  assert.equal(review.url, "/pets/pet-A/life-change-cases/case-A/reviews");
  assert.match(c.statuses.successes[0], /已关联到主人核对/);

  const d = createHarness({
    reviewAck: { review_id: "review-X", pet_id: "pet-B",
                 case_id: "case-A", decision: "RECORD_OBSERVATION" },
  });
  await d.save();
  assert.match(d.statuses.successes[0], /已记录散步/);
  assert.match(d.statuses.successes[0], /核对关联未完成/);
  assert.doesNotMatch(d.statuses.successes[0], /已关联到主人核对/);

  const e = createHarness({
    caseResponse: { pet_id: "pet-B", case_id: "case-A", source_valid: true, reviews: [] },
  });
  await e.save();
  assert.equal(e.calls.filter(x => x.url.endsWith("/reviews")).length, 0);
  assert.match(e.statuses.successes[0], /尚未关联核对/);

  console.log("R8R PASS: double tap, delayed upload/event, pet switch, exact idempotent review, scoped ack");
}
run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
