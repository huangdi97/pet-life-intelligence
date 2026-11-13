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

function sourceIdentity() {
  if (process.env.PLI_SOURCE_HEAD) {
    return {
      head: process.env.PLI_SOURCE_HEAD,
      branch: process.env.PLI_SOURCE_BRANCH || "",
    };
  }
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && existsSync(eventPath)) {
    try {
      const event = JSON.parse(readFileSync(eventPath, "utf8"));
      const head = event?.pull_request?.head?.sha;
      const branch = event?.pull_request?.head?.ref;
      if (head) return { head: String(head), branch: String(branch || "") };
    } catch {}
  }
  return { head: git("rev-parse", "HEAD"), branch: git("branch", "--show-current") };
}

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
  "companion",
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

const ownerErrorFree = new Set(["today", "timeline", "pet", "lifeview", "health", "me"]);
for (const surface of ownerErrorFree) {
  const layoutPath = resolve(out, surface, "layout.json");
  if (!existsSync(layoutPath)) throw new Error(`required owner layout evidence missing: ${surface}`);
  const layout = JSON.parse(readFileSync(layoutPath, "utf8"));
  const ownerText = Array.isArray(layout?.elements)
    ? layout.elements.map((node) => String(node?.text ?? "")).join("\n")
    : "";
  // Dedicated not-found/offline/permission captures live on their own surfaces.
  // A primary owner page must never silently pass evidence while embedding one.
  for (const forbidden of ["出错了：页面不存在", "出错了：未找到", "页面不存在\n重试"]) {
    if (ownerText.includes(forbidden)) {
      throw new Error(`broken owner state leaked into final Web surface: ${surface}; ${forbidden}`);
    }
  }
}

const expectedTwinStageRole = {
  today: "today",
  pet: "pet",
  lifeview: "life",
  twinreview: "review",
  companion: "companion",
};
for (const surface of ["today", "pet", "lifeview", "twinreview", "companion"]) {
  const visualPath = resolve(out, surface, "visual.json");
  if (!existsSync(visualPath)) throw new Error(`required final Web visual manifest missing: ${surface}`);
  const visual = JSON.parse(readFileSync(visualPath, "utf8"));
  const manifest = visual.manifest;
  const sourceMediaCount = Number(manifest?.sourceMediaCount ?? 0);
  const identityEvidence = manifest?.individualIdentityEvidence === true;
  const fidelityConsistent =
    (manifest?.visualFidelityTier === "STYLIZED_REFERENCE" &&
      sourceMediaCount === 0 &&
      !identityEvidence) ||
    (manifest?.visualFidelityTier === "OWNER_MEDIA_REFERENCED" &&
      sourceMediaCount > 0 &&
      identityEvidence);
  if (
    !manifest ||
    manifest.ready !== true ||
    manifest.manifestOrigin !== "RUNTIME" ||
    manifest.representation !== "rigged-glb-twin" ||
    manifest.technicalRepresentationQuality !== "RIGGED_PBR_SKINNED" ||
    manifest.productCandidate !== true ||
    !fidelityConsistent ||
    manifest.generic === true ||
    manifest.fallbackUsed === true
  ) {
    throw new Error(
      `non-product Twin runtime on final Web surface: ${surface}; representation=${manifest?.representation}; technical=${manifest?.technicalRepresentationQuality}; fidelity=${manifest?.visualFidelityTier}; sourceMediaCount=${sourceMediaCount}`,
    );
  }
  if (manifest.petId !== petId) {
    throw new Error(
      `Twin runtime pet mismatch on final Web surface: ${surface}; expected=${petId} actual=${manifest.petId}`,
    );
  }
  if (manifest.stageRole !== expectedTwinStageRole[surface]) {
    throw new Error(
      `Twin runtime stage mismatch on final Web surface: ${surface}; expected=${expectedTwinStageRole[surface]} actual=${manifest.stageRole}`,
    );
  }
  if (surface === "twinreview") {
    const yaw = Number(manifest.camera?.yaw);
    const error = Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw)));
    if (!Number.isFinite(yaw) || error > 0.08) {
      throw new Error(
        `Twin Review selected front but runtime camera is not front: yaw=${manifest.camera?.yaw}`,
      );
    }
  }
}

const source = sourceIdentity();
const provenance = {
  captured_at: new Date().toISOString(),
  source_head: source.head,
  source_branch: source.branch,
  checkout_head: git("rev-parse", "HEAD"),
  base_url: baseUrl,
  primary_pet_id: petId || null,
  vision_model_used: false,
  required_surfaces: required,
  product_twin_surfaces: ["today", "pet", "lifeview", "twinreview", "companion"],
};
writeFileSync(resolve(out, "capture-manifest.json"), JSON.stringify(provenance, null, 2) + "\n", "utf8");

console.log("R5.6 final Web evidence captured ->", out);
