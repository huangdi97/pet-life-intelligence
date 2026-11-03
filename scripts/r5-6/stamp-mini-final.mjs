// Stamp manually/tool-captured Mini Program screenshots with source provenance.
// This does not create or judge screenshots. It only verifies that the six
// required runtime images exist and records the exact source HEAD.
// Usage: node scripts/r5-6/stamp-mini-final.mjs --devtools-version "<actual version>"
import { existsSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..", "..");
const out = resolve(root, "artifacts/r5-6-final/mini");
const required = ["today", "timeline", "pet", "health", "assistant", "me"];

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1].trim() : "";
};
const devtoolsVersion = valueOf("--devtools-version") || (process.env.PLI_WECHAT_DEVTOOLS_VERSION || "").trim();
if (!devtoolsVersion) {
  throw new Error(
    "WeChat DevTools version is required. Pass --devtools-version or set PLI_WECHAT_DEVTOOLS_VERSION.",
  );
}

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
      checkout_head: git("rev-parse", "HEAD"),
      source_branch: git("branch", "--show-current"),
      platform: "weapp",
      capture_method: "WECHAT_DEVTOOLS_AUTOMATOR",
      native_runtime: true,
      devtools_version: devtoolsVersion,
      vision_model_used: false,
      human_visual_acceptance: "PENDING",
      capture_kind: "real-mini-runtime-screenshots",
      required_surfaces: required,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log("R5.6 Mini evidence stamped ->", out);
