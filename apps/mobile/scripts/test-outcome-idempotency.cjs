"use strict";
/** Execute the production R8BX Outcome idempotency-key builder.
 *
 * The API caps idempotency_key at 96 chars. This test protects the real mobile
 * transport from regressing to raw UUID concatenation that the hosted Android
 * runtime correctly rejects with HTTP 422.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(
  path.resolve(__dirname, "../src/components/life/outcomeIdempotency.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const shim = { exports: {} };
new Function("module", "exports", compiled)(shim, shim.exports);
const { buildOutcomeIdempotencyKey } = shim.exports;

const observation = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const reviewHead = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const prior = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

for (const assessment of [
  "CONTINUE_OBSERVING",
  "NO_LONGER_CONCERNED",
  "NEEDS_FURTHER_FOLLOW_UP",
]) {
  const first = buildOutcomeIdempotencyKey(
    observation, reviewHead, assessment, prior,
  );
  const second = buildOutcomeIdempotencyKey(
    observation, reviewHead, assessment, prior,
  );
  assert.equal(first, second, "same logical write must keep a stable retry key");
  assert.ok(first.length <= 96, `key exceeded API cap: ${first.length}`);
}

const initial = buildOutcomeIdempotencyKey(
  observation, reviewHead, "CONTINUE_OBSERVING", null,
);
assert.ok(initial.length <= 96);

assert.notEqual(
  buildOutcomeIdempotencyKey(observation, reviewHead, "CONTINUE_OBSERVING", prior),
  buildOutcomeIdempotencyKey(observation, reviewHead, "NO_LONGER_CONCERNED", prior),
);
assert.notEqual(
  buildOutcomeIdempotencyKey(observation, reviewHead, "CONTINUE_OBSERVING", prior),
  buildOutcomeIdempotencyKey(
    "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    reviewHead,
    "CONTINUE_OBSERVING",
    prior,
  ),
);
assert.notEqual(
  buildOutcomeIdempotencyKey(observation, reviewHead, "CONTINUE_OBSERVING", prior),
  buildOutcomeIdempotencyKey(
    observation,
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    "CONTINUE_OBSERVING",
    prior,
  ),
);
assert.notEqual(
  buildOutcomeIdempotencyKey(observation, reviewHead, "CONTINUE_OBSERVING", prior),
  buildOutcomeIdempotencyKey(
    observation,
    reviewHead,
    "CONTINUE_OBSERVING",
    "ffffffff-ffff-4fff-8fff-ffffffffffff",
  ),
);

console.log("R8BX bounded Outcome idempotency key contract: PASS");
