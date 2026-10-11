// Keep the web runtime twin assets byte-identical to the canonical package assets.
// No network access: both source and destination are repository-local.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(webRoot, "../..");
const sourceDir = resolve(repoRoot, "packages/pet-3d/assets/twins");
const destDir = resolve(webRoot, "public/assets/twins");
mkdirSync(destDir, { recursive: true });

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

for (const identity of ["doudou", "mimi"]) {
  const source = resolve(sourceDir, `${identity}.glb`);
  const dest = resolve(destDir, `${identity}.glb`);
  copyFileSync(source, dest);
  const sourceHash = sha256(source);
  const destHash = sha256(dest);
  if (sourceHash !== destHash) {
    throw new Error(`Twin sync mismatch for ${identity}: ${sourceHash} != ${destHash}`);
  }
  console.log(`SYNC_TWIN ${identity} sha256=${sourceHash}`);
}
