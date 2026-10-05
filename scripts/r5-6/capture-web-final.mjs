// R5.6 final Web evidence capture wrapper.
// Runs the existing blind Web harness into a fresh final-evidence directory,
// verifies required owner surfaces and product Twin runtime truth, then records
// the exact Git HEAD used for capture. No vision model is used.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const pick = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const baseUrl = pick("--base-url", "http://localhost:3100");
const petId = pick("--pet-id", "");
const out = resolve(root, "artifacts/r5-6-final/web");

const git = (...gitArgs) => {
  const r = spawnSync("git", gitArgs, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${gitArgs.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r.stdout.trim();
};

rmSync(out, { recursive: true, force: true });

const capture = spawnSync(
  process.execPath,
  [
    resolve(root, "scripts/blind-ui/capture-web.mjs"),
    "--base-url",
    baseUrl,
    "--out",
    out,
    ...(petId ? ["--pet-id", petId] : []),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
);
if (capture.status !== 0) {
  throw new Error(`blind Web capture failed with exit code ${capture.status}`);
}

const required = [
  "today",
  "timeline",
  "pet",
  "lifeview",
  "twinreview",
  "health",
  "assistant",
  "me",
  "empty",
  "attention",
  "offline",
  "notfound",
  "permission",
];
for (const surface of required) {
  const shot = resolve(out, surface, "screenshot.png");
  const report = resolve(out, surface, "report.md");
  if (!existsSync(shot)) throw new Error(`required final Web screenshot missing: ${surface}`);
  if (!existsSync(report)) throw new Error(`required final Web report missing: ${surface}`);
  const reportText = readFileSync(report, "utf8");
  if (/\bERROR:/i.test(reportText)) throw new Error(`final Web capture reported an error: ${surface}`);
}

for (const surface of ["today", "pet", "lifeview", "twinreview"]) {
  const visualPath = resolve(out, surface, "visual.json");
  if (!existsSync(visualPath)) throw new Error(`required final Web visual manifest missing: ${surface}`);
  const visual = JSON.parse(readFileSync(visualPath, "utf8"));
  const manifest = visual.manifest;
  if (
    !manifest ||
    manifest.ready !== true ||
    manifest.manifestOrigin !== "RUNTIME" ||
    manifest.representation !== "high-fidelity-glb-twin" ||
    manifest.generic === true ||
    manifest.fallbackUsed === true
  ) {
    throw new Error(`non-product Twin runtime on final Web surface: ${surface}`);
  }
}

const provenance = {
  captured_at: new Date().toISOString(),
  source_head: git("rev-parse", "HEAD"),
  source_branch: git("branch", "--show-current"),
  base_url: baseUrl,
  primary_pet_id: petId || null,
  vision_model_used: false,
  required_surfaces: required,
  product_twin_surfaces: ["today", "pet", "lifeview", "twinreview"],
};
writeFileSync(resolve(out, "capture-manifest.json"), JSON.stringify(provenance, null, 2) + "\n", "utf8");

console.log("R5.6 final Web evidence captured ->", out);
