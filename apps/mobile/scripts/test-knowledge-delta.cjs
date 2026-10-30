"use strict";
/**
 * R8CB executable contract: Knowledge Delta is read-only, owner-safe and
 * journal-derived. Runs the REAL presentation module (not a copied helper) and
 * statically proves the Life View block exposes no action.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const modulePath = path.resolve(__dirname, "../src/components/life/knowledgeDelta.ts");
const source = fs.readFileSync(modulePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const shim = { exports: {} };
new Function("module", "exports", compiled)(shim, shim.exports);
const {
  knowledgeDeltaVisible, knowledgeDeltaLines, knowledgeDeltaSummary,
  knowledgeDeltaNote, knowledgeDeltaDay, KNOWLEDGE_DELTA_HEADLINE,
  KNOWLEDGE_DELTA_FALLBACK_NOTE, KNOWLEDGE_DELTA_EMPTY_REASON, KNOWLEDGE_DELTA_REASONS,
} = shim.exports;

const HEALTH_WORDS = ["恢复", "恶化", "已经正常", "风险升高", "健康评分", "诊断", "病情"];

// --- visibility is gated on a real journal difference -------------------------
assert.equal(knowledgeDeltaVisible(null), false);
assert.equal(knowledgeDeltaVisible(undefined), false);
assert.equal(knowledgeDeltaVisible({ changed: false, items: [] }), false);
assert.equal(knowledgeDeltaVisible({ changed: true, items: [] }), false);
assert.equal(knowledgeDeltaVisible({ changed: true, items: [{ kind: "LATE_RECORDED_EVENT" }] }), true);

// --- every kind maps to non-diagnostic, owner-readable copy -------------------
for (const [kind, reason] of Object.entries(KNOWLEDGE_DELTA_REASONS)) {
  assert.equal(typeof reason, "string");
  assert.ok(reason.length > 0, `empty reason for ${kind}`);
  for (const word of HEALTH_WORDS) {
    assert.ok(!reason.includes(word), `${kind} leaks health wording: ${word}`);
  }
}
assert.equal(KNOWLEDGE_DELTA_HEADLINE, "为什么现在看到的不一样");
for (const word of HEALTH_WORDS) {
  assert.ok(!KNOWLEDGE_DELTA_FALLBACK_NOTE.includes(word));
  assert.ok(!KNOWLEDGE_DELTA_EMPTY_REASON.includes(word));
}

// --- day parsing never shifts a calendar day through a timezone --------------
assert.equal(knowledgeDeltaDay("2026-10-18T23:30:00+08:00"), "10月18日");
assert.equal(knowledgeDeltaDay("2026-10-18T01:00:00Z"), "10月18日");
assert.equal(knowledgeDeltaDay("not-a-date"), "");
assert.equal(knowledgeDeltaDay(null), "");

// --- lines are deterministic and read the journal change, not a summary ------
const delta = {
  changed: true,
  event_delta_count: 2,
  owner_workflow_delta_count: 1,
  truth_note: "这些变化只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。",
  items: [
    { kind: "LATE_RECORDED_EVENT", changed_at: "2026-10-18T09:00:00+08:00" },
    { kind: "SOURCE_RETRACTED_LATER", changed_at: "2026-10-20T09:00:00+08:00" },
    { kind: "REVIEW_ADDED_LATER", changed_at: "2026-10-21T09:00:00+08:00", case_id: "case-1" },
  ],
};
assert.deepEqual(knowledgeDeltaLines(delta), [
  "10月18日 这条记录是在当天之后补录的",
  "10月20日 后来这条来源被主人撤回",
  "10月21日 主人后来追加了一次核对",
]);
assert.equal(knowledgeDeltaSummary(delta), "2 条记录变化 · 1 条主人核对变化");
assert.equal(knowledgeDeltaNote(delta), delta.truth_note);

// --- unknown kinds degrade to neutral copy instead of echoing the server -----
const unknown = knowledgeDeltaLines({
  changed: true,
  items: [{ kind: "SOMETHING_NEW", reason: "宠物已经恢复" }],
});
assert.deepEqual(unknown, [KNOWLEDGE_DELTA_EMPTY_REASON]);
assert.ok(!unknown.join(" ").includes("恢复"));

// --- no delta means no section and no invented zero-state -------------------
assert.deepEqual(knowledgeDeltaLines({ changed: false, items: [] }), []);
assert.equal(knowledgeDeltaSummary(null), "");
assert.equal(knowledgeDeltaNote({ changed: true, items: [] }), KNOWLEDGE_DELTA_FALLBACK_NOTE);

// --- Life View block is read-only -------------------------------------------
const screen = fs.readFileSync(
  path.resolve(__dirname, "../src/screens/LifeViewScreen.tsx"), "utf8",
);
assert.ok(screen.includes("pli.lifeview.replay.knowledge-delta"));
assert.ok(screen.includes("knowledge_delta"));
const start = screen.indexOf("pli.lifeview.replay.knowledge-delta");
const block = screen.slice(start, screen.indexOf(") : null}", start) + 9);
for (const forbidden of [
  "onPress", "Pressable", "TouchableOpacity", "navigation.navigate",
  "api.post", "api.patch", "QuickLog", "onLongPress",
]) {
  assert.ok(!block.includes(forbidden), `knowledge delta block must stay read-only: ${forbidden}`);
}
assert.ok(block.includes("后来发生了什么"));
assert.ok(block.includes("KNOWLEDGE_DELTA_HEADLINE"));

console.log("PASS: R8CB knowledge delta contract (read-only, owner-safe, no health claim)");
