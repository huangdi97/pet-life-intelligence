// Stamp manually/tool-captured Mini Program screenshots with source provenance.
// This does not create or judge screenshots. It only verifies that the six
// required runtime images exist and records the exact source HEAD.
// Usage: node scripts/r5-6/stamp-mini-final.mjs
import { existsSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..", "..");
const out = resolve(root, "artifacts/r5-6-final/mini");
const required = ["today", "timeline", "pet", "health", "assistant", "me"];

const git = (...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
};

for (const surface of required) {
  const path = resolve(out, `${surface}.png`);
  if (!existsSync(path) || statSync(path).size < 1024) {
    throw new Error(`required Mini runtime screenshot missing/invalid: ${surface}.png`);
  }
}

writeFileSync(
  resolve(out, "capture-manifest.json"),
  JSON.stringify(
    {
      captured_at: new Date().toISOString(),
      source_head: git("rev-parse", "HEAD"),
      source_branch: git("branch", "--show-current"),
      vision_model_used: false,
      capture_kind: "real-mini-runtime-screenshots",
      required_surfaces: required,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log("R5.6 Mini evidence stamped ->", out);
